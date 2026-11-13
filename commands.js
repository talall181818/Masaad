
const smartPrices = new Map();

function calculateEMA(values, period) {
  const k = 2 / (period + 1);
  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }

  return result;
}

function calculateRSI(values, period = 14) {
  if (values.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return gains === 0 ? 50 : 100;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function analyzeSmart(history) {
  if (history.length < 22) {
    return `⏳ تم تسجيل ${history.length} من 22 قراءة.
أرسل أسعار Smart متتالية حتى يكتمل التحليل.`;
  }

  const price = history[history.length - 1];
  const ema9 = calculateEMA(history, 9);
  const ema21 = calculateEMA(history, 21);
  const rsi = calculateRSI(history);

  let signal = "⏳ انتظار";
  let duration = "لا توجد مدة مقترحة";

  if (ema9 > ema21 && rsi >= 50 && rsi <= 70) {
    signal = "🟢 شراء UP";
    duration = "30 ثانية";
  } else if (ema9 < ema21 && rsi >= 30 && rsi <= 50) {
    signal = "🔴 بيع DOWN";
    duration = "30 ثانية";
  }

  return (
    "📊 تحليل Smart - Masaad\n\n" +
    `السعر: ${price.toFixed(4)}\n` +
    `EMA 9: ${ema9.toFixed(4)}\n` +
    `EMA 21: ${ema21.toFixed(4)}\n` +
    `RSI: ${rsi.toFixed(2)}\n\n` +
    `الإشارة: ${signal}\n` +
    `المدة المقترحة: ${duration}\n\n` +
    "⚠️ تحليل تقريبي وليس ضماناً للربح."
  );
}

async function getEURUSDAnalysis() {
  const apiKey = process.env.TWELVEDATA_API_KEY;

  if (!apiKey) {
    return "⚠️ مفتاح Twelve Data غير موجود في إعدادات الاستضافة.";
  }

  const url =
    "https://api.twelvedata.com/time_series" +
    "?symbol=EUR/USD&interval=1min&outputsize=50&apikey=" +
    encodeURIComponent(apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.values || data.values.length < 22) {
    console.error("Twelve Data response:", data);
    return "⚠️ تعذر جلب بيانات اليورو دولار. تحقق من مفتاح API وحد الاستخدام.";
  }

  const prices = data.values
    .map(item => Number(item.close))
    .reverse();

  if (prices.some(price => !Number.isFinite(price))) {
    return "⚠️ بيانات السعر المستلمة غير صالحة.";
  }

  const price = prices[prices.length - 1];
  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  const rsi = calculateRSI(prices);

  let signal = "⏳ انتظار";
  let duration = "لا توجد مدة مقترحة";

  if (ema9 > ema21 && rsi >= 50 && rsi <= 70) {
    signal = "🟢 شراء UP";
    duration = "دقيقة واحدة";
  } else if (ema9 < ema21 && rsi >= 30 && rsi <= 50) {
    signal = "🔴 بيع DOWN";
    duration = "دقيقة واحدة";
  }

  return (
    "📊 تحليل اليورو دولار - Masaad\n\n" +
    "⏱ فريم دقيقة واحدة\n\n" +
    `السعر: ${price.toFixed(5)}\n` +
    `EMA 9: ${ema9.toFixed(5)}\n` +
    `EMA 21: ${ema21.toFixed(5)}\n` +
    `RSI: ${rsi.toFixed(2)}\n\n` +
    `الإشارة: ${signal}\n` +
    `المدة المقترحة: ${duration}\n\n` +
    "⚠️ تحليل تقريبي وليس ضماناً للربح."
  );
}

function registerCommands(bot) {
  bot.command("start", async ctx => {
    await ctx.reply(
      "أهلاً بك في Masaad 🤖\n\n" +
      "📊 تحليل Smart و EUR/USD\n\n" +
      "/smart - إدخال سعر Smart\n" +
      "/eurusd - تحليل اليورو دولار\n" +
      "/ping - اختبار البوت\n" +
      "/help - المساعدة"
    );
  });

  bot.command("help", async ctx => {
    await ctx.reply(
      "📋 أوامر Masaad\n\n" +
      "/smart - تحليل Smart يدويًا\n" +
      "/eurusd - تحليل اليورو دولار\n" +
      "/ping - اختبار البوت\n" +
      "/help - المساعدة"
    );
  });

  bot.command("ping", async ctx => {
    await ctx.reply("✅ Masaad يعمل والبوت يستقبل الأوامر.");
  });

  bot.command("smart", async ctx => {
    smartPrices.set(ctx.from.id, []);

    await ctx.reply(
      "📊 تحليل Smart\n\n" +
      "أرسل سعر Smart الحالي بالأرقام.\n" +
      "مثال: 263.7400\n\n" +
      "أرسل قراءة جديدة كلما تغير السعر.\n" +
      "سأحتاج 22 قراءة قبل عرض التحليل."
    );
  });

  bot.command("eurusd", async ctx => {
    await ctx.reply("⏳ جارٍ تحليل اليورو دولار...");

    try {
      await ctx.reply(await getEURUSDAnalysis());
    } catch (error) {
      console.error("EURUSD error:", error);
      await ctx.reply("⚠️ حدث خطأ أثناء جلب تحليل اليورو دولار.");
    }
  });

  bot.on("message:text", async ctx => {
    const userId = ctx.from.id;
    const input = ctx.message.text.trim();

    if (!smartPrices.has(userId)) return;
    if (!/^\d+(\.\d+)?$/.test(input)) return;

    const price = Number(input);

    if (!Number.isFinite(price) || price <= 0) {
      await ctx.reply("أرسل سعرًا صحيحًا.");
      return;
    }

    const history = smartPrices.get(userId);
    history.push(price);

    if (history.length > 100) history.shift();

    await ctx.reply(analyzeSmart(history));
  });
}

module.exports = { registerCommands };

