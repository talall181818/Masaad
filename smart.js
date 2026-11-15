const SMART_ASSET_ID = 240;

const smartHistory = [];

function addSmartPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("السعر غير صحيح");
  }

  const now = Date.now();
  const minute = Math.floor(now / 60000) * 60000;

  let candle = smartHistory[smartHistory.length - 1];

  if (!candle || candle.time !== minute) {
    candle = {
      time: minute,
      open: value,
      high: value,
      low: value,
      close: value
    };

    smartHistory.push(candle);
  } else {
    candle.high = Math.max(candle.high, value);
    candle.low = Math.min(candle.low, value);
    candle.close = value;
  }

  if (smartHistory.length > 300) {
    smartHistory.shift();
  }

  return candle;
}

function ema(values, period) {
  if (values.length < period) return null;

  const k = 2 / (period + 1);
  let result = values.slice(0, period)
    .reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }

  return result;
}

function analyzeSmart() {
  if (smartHistory.length < 22) {
    return {
      asset: "Smarty",
      assetId: SMART_ASSET_ID,
      decision: "انتظار",
      reason: "نحتاج 22 قراءة سعرية على الأقل",
      readings: smartHistory.length
    };
  }

  const prices = smartHistory.map(c => c.close);
  const fast = ema(prices, 9);
  const slow = ema(prices, 21);

  const direction = fast > slow ? "صاعد" :
    fast < slow ? "هابط" : "متذبذب";

  let decision = "انتظار";

  if (fast > slow && prices.at(-1) > prices.at(-2)) {
    decision = "شراء UP";
  } else if (fast < slow && prices.at(-1) < prices.at(-2)) {
    decision = "بيع DOWN";
  }

  return {
    asset: "Smarty",
    assetId: SMART_ASSET_ID,
    timeframe: "1m",
    direction,
    decision,
    duration: "30 ثانية",
    price: prices.at(-1),
    readings: smartHistory.length,
    note: "تحليل أولي يحتاج تأكيد اتجاه 5m"
  };
}

module.exports = {
  addSmartPrice,
  analyzeSmart,
  SMART_ASSET_ID
};
