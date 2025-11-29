// bot.js
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";

const token = process.env.TG_BOT_TOKEN;
const WEBAPP_URL = "https://bazaar-tawny-mu.vercel.app";

if (!token) {
  console.error("TG_BOT_TOKEN is not set");
  process.exit(1);
}

let bot;

if (global.telegramBot) {
  bot = global.telegramBot;
} else {
  bot = new TelegramBot(token, { polling: true });
  global.telegramBot = bot;
}

const translations = {
  ru: {
    welcome: "Вас приветствует Bazaar UA!\nЗдесь вы можете купить, продать или отдать бесплатно любой товар.",
    publish: "📤 Опубликовать объявление",
    catalog: "📦 Посмотреть каталог",
  },
  ua: {
    welcome: "Вас вітає Bazaar UA!\nТут ви можете купити, продати або віддати безкоштовно будь-який товар.",
    publish: "📤 Опублікувати оголошення",
    catalog: "📦 Переглянути каталог",
  },
  en: {
    welcome: "Welcome to Bazaar UA!\nHere you can buy, sell, or give away any item for free.",
    publish: "📤 Post an ad",
    catalog: "📦 Browse catalog",
  },
};

bot.onText(/\/start/, (msg) => {
  const chatid = msg.chat.id;
  const langCode = (msg.from?.language_code || "en").toLowerCase();
  
  let lang = "en";
  if (langCode.startsWith("ru") || langCode === "be" || langCode === "kz") {
    lang = "ru";
  } else if (langCode.startsWith("uk") || langCode.startsWith("ua")) {
    lang = "ua";
  }

  const t = translations[lang];

  bot.sendMessage(chatid, t.welcome, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: t.publish,
            web_app: { url: WEBAPP_URL + "/new" },
          },
        ],
        [
          {
            text: t.catalog,
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

/**
 * Send a notification message to a user via Telegram
 * @param {string} tgUserId - Telegram user ID (chat_id)
 * @param {string} message - Message text to send
 * @param {object} options - Optional Telegram message options
 * @returns {Promise} - Promise that resolves when message is sent
 */
export async function sendNotification(tgUserId, message, options = {}) {
  try {
    await bot.sendMessage(tgUserId, message, {
      parse_mode: "HTML",
      ...options,
    });
    console.log(`Notification sent to ${tgUserId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send notification to ${tgUserId}:`, error);
    return { success: false, error: error.message };
  }
}

export { bot };
