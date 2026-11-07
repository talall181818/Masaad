const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.TWELVEDATA_API_KEY;

if (!TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const bot = new TelegramBot(TOKEN, { polling: true });

const SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CHF"
];

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
    if (!API_KEY) {
      return "⚠️ مفتاح البيانات غير موجود";
    }

    const response = await axios.get(
      "https://api.twelvedata.com/time_series",
      {
        params: {
          symbol: symbol,
          interval: "1min",
          outputsize: 50,
          apikey: API_KEY
        },
        timeout: 15000
      }
    );

    if (
      !response.data ||
      !Array.isArray(response.data.values) ||
      response.data.values.length < 25
    ) {
      return "⏳ بيانات غير كافية";
    }

    const candles = response.data.values;
    const closes = candles.map(c => Number(c.close));

    if (closes.some(v => !Number.isFinite(v))) {
      return "⚠️ بيانات غير صالحة";
    }

    const fast = ema(closes.slice(0, 9), 9);
    const slow = ema(closes.slice(0, 21), 21);

    if (
      Math.abs(fast - slow) / closes[0] < 0.0001
    ) {
      return "⏳ انتظار - احتمال تذبذب";
    }

    if (
      fast > slow &&
      closes[0] > fast &&
      closes[0] > closes[3]
    ) {
      return "🟢 ميل شراء UP";
    }

    if (
      fast < slow &&
      closes[0] < fast &&
      closes[0] < closes[3]
    ) {
      return "🔴 ميل بيع DOWN";
    }

    return "⏳ انتظار - الاتجاه غير واضح";

  } catch (error) {
    return "⚠️ تعذر جلب البيانات";
  }
}

// تشغيل البوت
bot.onText(/^\/start(?:@\w+)?$/i, msg => {
  bot.sendMessage(
    msg.chat.id,
    "أهلًا بك في Masaad 🤖\n\nاكتب /help للمساعدة"
  );
});

// المساعدة
bot.onText(/^\/help(?:@\w+)?$/i, msg => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 Masaad\n\n" +
    "/start - تشغيل البوت\n" +
    "/signals - إشارات العملات\n" +
    "/ping - اختبار البوت\n" +
    "/help - المساعدة\n\n" +
    "Smart وFootball غير متاحين للتحليل المباشر حاليًا."
  );
});

// اختبار البوت
bot.onText(/^\/ping(?:@\w+)?$/i, msg => {
  bot.sendMessage(msg.chat.id, "Masaad يعمل ✅");
});

// تحليل الأسواق
bot.onText(/^\/signals(?:@\w+)?$/i, async msg => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "📊 جاري تحليل الأسواق..."
  );

  let result = "🤖 Masaad - تحليل الدقيقة\n\n";

  for (const symbol of SYMBOLS) {
    const signal = await analyze(symbol);
    result += "📊 " + symbol + "\n";
    result += signal + "\n\n";
  }

  result += "⚠️ التحليل ليس توصية مضمونة.";

  await bot.sendMessage(chatId, result);
});

bot.on("polling_error", error => {
  console.error("Telegram error:", error.message);
});

console.log("Masaad bot is running.");
