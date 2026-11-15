
import json
import time
from datetime import datetime, timezone

ASSET_ID = 240
CANDLES = []
current_candle = None

def record_price(price, timestamp=None):
    global current_candle

    price = float(price)
    timestamp = timestamp or time.time()
    minute = int(timestamp // 60) * 60

    if current_candle is None or current_candle["time"] != minute:
        if current_candle:
            CANDLES.append(current_candle)

        current_candle = {
            "time": minute,
            "open": price,
            "high": price,
            "low": price,
            "close": price
        }
    else:
        current_candle["high"] = max(current_candle["high"], price)
        current_candle["low"] = min(current_candle["low"], price)
        current_candle["close"] = price

    return current_candle

def get_candles():
    result = CANDLES[-100:].copy()
    if current_candle:
        result.append(current_candle.copy())
    return result

def main():
    print("Masaad Smarty candle recorder")
    print("Asset ID:", ASSET_ID)
    print("Waiting for a verified price source...")

if __name__ == "__main__":
    main()
