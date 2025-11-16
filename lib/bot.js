// bot.js
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";

const token = process.env.TG_BOT_TOKEN;
const WEBAPP_URL = "https://bazaar-tawny-mu.vercel.app";

if (!token) {
  console.error("TG_BOT_TOKEN is not set");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatid = msg.chat.id;

  const text =
    "Вас приветствует Bazaar UA!\n" +
    "Здесь вы можете купить, продать или отдать бесплатно любой товар.";

  bot.sendMessage(chatid, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📤 Опубликовать объявление",
            web_app: { url: WEBAPP_URL + "/new" },
          },
        ],
        [
          {
            text: "📦 Посмотреть каталог",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});
