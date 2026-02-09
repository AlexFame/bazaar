require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); 

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const input = require('input');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const mime = require('mime-types');

// --- CONFIG ---
// --- CONFIG ---
// TEMPORARY: Using Public Telegram Desktop keys because user keys are rejected
const API_ID = 2040; 
const API_HASH = "b18441a1ff607e10a989891a5462e627";
const SESSION_STRING = process.env.TG_SESSION || ''; 
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const PARSER_USER_ID = process.env.PARSER_USER_ID; 

console.log("DEBUG: Using Public Telegram Desktop API Keys (ID: " + API_ID + ")");
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE missing.");
  process.exit(1);
}

// --- SUPABASE INIT ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- STATE MANAGEMENT ---
const STATE_FILE = path.join(__dirname, 'parser_state.json');
const CHANNELS_FILE = path.join(__dirname, 'channels.json');

function loadState() {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE));
    return {};
}
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadChannels() {
    if (fs.existsSync(CHANNELS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(CHANNELS_FILE));
        } catch (e) {
            console.error("Error reading channels.json:", e);
            return [];
        }
    }
    return [];
}

// --- HEURISTICS ---
const PRICE_REGEX = /(\d+[\s,.]?\d*)\s*(\$|€|USD|EUR|UAH|грн)/i;
const PHONE_REGEX = /(\+?380\d{9}|0\d{9})/; 
const USERNAME_REGEX = /@([a-zA-Z0-9_]{5,32})/;

function parsePost(text, sender) {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return null;

    let title = lines[0];
    if (title.length > 50) title = title.substring(0, 50) + "...";

    let price = 0;
    let currency = 'UAH';
    
    const priceMatch = text.match(PRICE_REGEX);
    if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, '.').replace(/\s/g, ''));
        if (priceMatch[2].toLowerCase().includes('$') || priceMatch[2].toLowerCase().includes('usd')) currency = 'USD';
        else if (priceMatch[2].toLowerCase().includes('€') || priceMatch[2].toLowerCase().includes('eur')) currency = 'EUR';
    }

    let contacts = "";
    if (sender) {
        if (sender.username) {
            contacts += `Telegram: @${sender.username} (https://t.me/${sender.username})\n`;
        } else if (sender.firstName || sender.lastName) {
             const name = [sender.firstName, sender.lastName].filter(Boolean).join(' ');
             contacts += `Автор: ${name}\n`;
        }
    }
    const phoneMatch = text.match(PHONE_REGEX);
    if (phoneMatch) contacts += `Тел: ${phoneMatch[0]}\n`;
    const usernameMatch = text.match(USERNAME_REGEX);
    if (usernameMatch && (!sender || sender.username !== usernameMatch[1])) {
        contacts += `Telegram: @${usernameMatch[1]}\n`;
    }

    return {
        title,
        description: text,
        price,
        currency,
        contacts: contacts.trim()
    };
}

async function processChannel(client, state, target) {
    const { username, topic_id, limit = 10 } = target;
    const stateKey = username + (topic_id ? `_${topic_id}` : '');
    const lastId = state[stateKey] || 0;

    console.log(`\n📥 Parsing ${username} (Topic: ${topic_id || 'ALL'}, Last: ${lastId})...`);

    try {
        const messages = await client.getMessages(username, { limit });
        let newLastId = lastId;

        for (const message of messages) {
            // Topic Filter
            if (topic_id) {
                 let msgTopicId = null;
                 if (message.replyTo) {
                    msgTopicId = message.replyTo.replyToTopId || message.replyTo.replyToMsgId;
                 }
                 if (msgTopicId !== topic_id && message.id !== topic_id) {
                     continue; 
                 }
            }
            
            if (message.id <= lastId) continue;
            if (!message.message) continue;

            console.log(`Processing Msg #${message.id}...`);

            let sender = null;
            try {
                if (message.sender) sender = message.sender;
                else sender = await message.getSender();
            } catch (e) { }

            const parsed = parsePost(message.message, sender);
            
            if (!parsed) {
                console.log("  -> Skipped (empty/unparseable)");
                continue;
            }

            let imagePaths = [];
            if (message.media) {
                try {
                console.log("  -> Downloading media...");
                const buffer = await client.downloadMedia(message, { workers: 1 });
                if (buffer) {
                    const ext = "jpg"; 
                    const filename = `parsed/${Date.now()}_${message.id}.${ext}`;
                    const { data, error } = await supabase.storage.from('listing-images').upload(filename, buffer, { contentType: 'image/jpeg' });
                    if (!error) imagePaths.push({ path: data.path, position: 0 });
                }
                } catch(e) { console.error("  -> Media error:", e); }
            }

            if (PARSER_USER_ID) {
                const payload = {
                    title: parsed.title,
                    description: parsed.description,
                    price: parsed.price,
                    // currency: parsed.currency, // Disabled: No column in DB
                    category_key: 'other',
                    type: 'sell',
                    status: 'draft',
                    location: 'Telegram Import', // Changed from location_text
                    contacts: parsed.contacts,
                    allow_chat: false, // Disable internal chat for parsed items
                    created_by: PARSER_USER_ID, 
                    created_at: new Date(message.date * 1000).toISOString(),
                    main_image_path: imagePaths.length > 0 ? imagePaths[0].path : null
                };

                const { data: inserted, error } = await supabase.from('listings').insert(payload).select().single();
                
                if (error) {
                    console.error("  -> DB Error:", error.message);
                } else {
                    console.log(`  -> ✅ Saved: ${inserted.title}`);
                    if (imagePaths.length > 0) {
                        const imgRows = imagePaths.map(img => ({ listing_id: inserted.id, file_path: img.path, position: img.position }));
                        await supabase.from('listing_images').insert(imgRows);
                    }
                }
            } else {
                console.log("  -> Dry Run (No PARSER_USER_ID)");
            }
            
            if (message.id > newLastId) newLastId = message.id;
        }

        state[stateKey] = newLastId;
        saveState(state);

    } catch (e) {
        console.error(`Error processing ${username}:`, e.message);
    }
}

// --- MAIN ---
(async () => {
  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, { connectionRetries: 5 });

  console.log("🔄 Connecting...");
  await client.start({
    phoneNumber: async () => await input.text("Phone number: "),
    password: async () => await input.text("Password: "),
    phoneCode: async () => await input.text("Code: "),
    onError: (err) => console.log(err),
  });
  
  console.log("✅ Connected.");
  if (client.session.save() !== SESSION_STRING) {
      console.log("⚠️  Update .env with this session string:");
      console.log(client.session.save());
  }

  // Determine targets
  let targets = [];
  const cliUsername = process.argv[2];
  
  if (cliUsername) {
      // CLI mod overrides config
      targets.push({
          username: cliUsername,
          limit: parseInt(process.argv[3]) || 10,
          topic_id: process.argv[4] ? parseInt(process.argv[4]) : null
      });
  } else {
      // Load from file
      const fileChannels = loadChannels();
      if (fileChannels.length > 0) {
          targets = fileChannels;
          console.log(`Loaded ${targets.length} channels from channels.json`);
      } else {
          console.log("Usage: node scripts/telegram-parser.js @channel [limit] [topic_id]");
          console.log("OR create scripts/channels.json with list of targets.");
          process.exit(0);
      }
  }
  
  const state = loadState();

  for (const target of targets) {
      await processChannel(client, state, target);
  }
  
  console.log("\nDone all.");
  process.exit(0);
})();
