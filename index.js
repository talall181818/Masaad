
const { Bot } = require("grammy");
const { registerCommands } = require("./commands");

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN غير موجود");
}

const bot = new Bot(token);

registerCommands(bot);

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: (info) => {
    console.log(`Masaad يعمل الآن: @${info.username}`);
  }
});

