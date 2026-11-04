
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.TWELVEDATA_API_KEY;

if (!TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");

const bot = new TelegramBot(TOKEN, { polling: true });

const SYMBOLS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF"];

function ema(values, period) {
  const k = 2 / (period + 1);
  let result = values[values.length - 1];

  for (let i = values.length - 2; i >= 0; i--) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

async function analyze(symbol) {
  try {
    if (!API_KEY) return "مفتاح البيانات غير موجود";

    const response = await axios.get(
      "https://api.twelvedata.com/time_series",
      {
        params: {
          symbol,
          interval: "1min",
          outputsize: 50,
          apikey: API_KEY
        },
        timeout: 15000
      }
    );

    if (!response.data.values) return "⏳ انتظار";

    const candles = response.data.values;
    const closes = candles.map(c => Number(c.close));

    if (closes.length < 25) return "⏳ بيانات غير كافية";

    const fast = ema(closes.slice(0, 9), 9);
    const slow = ema(closes.slice(0, 21), 21);

    const difference = Math.abs(fast - slow);
    const recentMove = Math.abs(closes[0] - closes[8]);

    if (recentMove === 0 || difference / closes[0] < 0.0001) {
      return "⏳ انتظار - احتمال تذبذب";
    }

    if (fast > slow && closes[0] > fast &&
        closes[0] > closes[3]) {
      return "🟢 شراء UP";
    }

    if (fast < slow && closes[0] < fast &&
        closes[0] < closes[3]) {
      return "🔴 بيع DOWN";
    }

    return "⏳ انتظار - الاتجاه غير واضح";

  } catch (error) {
    return "⚠️ تعذر جلب البيانات";
  }
}

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id,
    "أهلاً بك في Masaad 🤖\n\n" +
    "بوت تحليل الأسواق على فريم الدقيقة.\n" +
    "اكتب /signals لتحليل الأسواق.");
});

bot.onText(/\/signals/, async msg => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, "📊 جاري تحليل الأسواق...");

  let result = "🤖 Masaad - تحليل الدقيقة\n\n";

  for (const symbol of SYMBOLS) {
    const signal = await analyze(symbol);
    result += `📊 ${symbol}\n${signal}\n\n`;
  }

  result += "⚠️ إشارات تحليلية وليست مضمونة.";
  await bot.sendMessage(chatId, result);
});

bot.onText(/\/ping/, msg => {
  bot.sendMessage(msg.chat.id, "Masaad يعمل ✅");
});
bot.onText(/\/help/, msg => {
  bot.sendMessage(msg.chat.id,
    "🤖 Masaad - المساعدة\n\n" +
    "/start - تشغيل البوت\n" +
    "/signals - إشارات جميع الأسواق\n" +
    "/ping - اختبار البوت\n" +
    "/help - المساعدة"
  );
});
console.log("Masaad started successfully");
