const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
require('dotenv').config({ path: '.env.local' });

// Using Public Telegram Desktop keys (same as in parser)
const API_ID = 2040;
const API_HASH = "b18441a1ff607e10a989891a5462e627";

(async () => {
  console.log("🚀 Starting Telegram Login...");
  
  const stringSession = new StringSession(""); // Start with empty session
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Enter your phone number (e.g. +380...): "),
    password: async () => await input.text("Enter your 2FA password (if enabled): "),
    phoneCode: async () => await input.text("Enter the code you received: "),
    onError: (err) => console.log(err),
  });

  console.log("\n✅ Login Successful!");
  console.log("\n👇 COPY THIS LINE AND ADD IT TO YOUR .env.local FILE:\n");
  console.log(`TG_SESSION="${client.session.save()}"`);
  console.log("\n👆 ---------------------------------------------------\n");

  await client.disconnect();
  process.exit(0);
})();
