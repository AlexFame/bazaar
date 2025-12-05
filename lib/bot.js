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

// Handle pre-checkout queries (required for Telegram Stars)
bot.on("pre_checkout_query", async (query) => {
  try {
    // Always approve pre-checkout queries
    await bot.answerPreCheckoutQuery(query.id, true);
    console.log("Pre-checkout query approved:", query.id);
  } catch (error) {
    console.error("Error answering pre-checkout query:", error);
    await bot.answerPreCheckoutQuery(query.id, false, {
      error_message: "Ошибка обработки платежа",
    });
  }
});

// Handle successful payments
bot.on("successful_payment", async (msg) => {
  try {
    const payment = msg.successful_payment;
    console.log("Successful payment received:", payment);

    // Forward to webhook API for processing
    await fetch(`${WEBAPP_URL}/api/payments/telegram-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
  } catch (error) {
    console.error("Error processing successful payment:", error);
  }
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

/**
 * Ban a user from the bot
 * @param {string} tgUserId - Telegram user ID to ban
 * @param {string} reason - Reason for ban
 * @returns {Promise} - Promise that resolves when user is banned
 */
export async function banUser(tgUserId, reason = 'Spam or abuse') {
  try {
    // Send notification about ban
    await bot.sendMessage(tgUserId, 
      `⛔️ Your account has been banned.\nReason: ${reason}\n\nIf you believe this is a mistake, please contact support.`
    );
    
    console.log(`User ${tgUserId} banned. Reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to ban user ${tgUserId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Unban a user
 * @param {string} tgUserId - Telegram user ID to unban
 * @returns {Promise} - Promise that resolves when user is unbanned
 */
export async function unbanUser(tgUserId) {
  try {
    await bot.sendMessage(tgUserId, 
      `✅ Your account has been unbanned. You can now use the service again.`
    );
    
    console.log(`User ${tgUserId} unbanned`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to unban user ${tgUserId}:`, error);
    return { success: false, error: error.message };
  }
}

export { bot };
