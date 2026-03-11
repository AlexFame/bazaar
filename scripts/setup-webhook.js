const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TG_BOT_TOKEN;
const WEBAPP_URL = "https://bazaar-tawny-mu.vercel.app";

if (!token) {
  console.error("TG_BOT_TOKEN is not set in .env");
  process.exit(1);
}

const bot = new TelegramBot(token);

// The URL where your Next.js app is hosted (e.g. Vercel)
// Make sure this is HTTPS
const webhookUrl = `${WEBAPP_URL}/api/bot/webhook`;

bot.setWebHook(webhookUrl)
  .then(() => {
    console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
  })
  .catch((error) => {
    console.error("❌ Failed to set webhook:", error);
  });
