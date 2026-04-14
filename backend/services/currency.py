# Exchange rates from MYR to target currency (approximate, updated 2026-04-13)
# Base currency: MYR. Value = how many units of target currency per 1 MYR.
EXCHANGE_RATES = {
    "myr": 1.0,
    "usd": 0.21,
    "sgd": 0.29,
    "eur": 0.20,
    "gbp": 0.17,
    "aud": 0.33,
    "jpy": 32.5,
    "idr": 3400.0,
    "thb": 7.5,
    "php": 12.0,
}

CURRENCY_SYMBOLS = {
    "myr": "RM",
    "usd": "$",
    "sgd": "S$",
    "eur": "\u20ac",
    "gbp": "\u00a3",
    "aud": "A$",
    "jpy": "\u00a5",
    "idr": "Rp",
    "thb": "\u0e3f",
    "php": "\u20b1",
}

# Currencies where the smallest unit has no decimal places
ZERO_DECIMAL_CURRENCIES = {"jpy"}

SUPPORTED_CURRENCIES = set(EXCHANGE_RATES.keys())


def convert_myr_cents_to_currency(myr_cents: int, currency: str) -> int:
    """Convert MYR cents to the target currency's smallest unit (cents/units)."""
    currency = currency.lower()
    rate = EXCHANGE_RATES.get(currency, EXCHANGE_RATES["usd"])
    myr_amount = myr_cents / 100
    if currency in ZERO_DECIMAL_CURRENCIES:
        return round(myr_amount * rate)
    return round(myr_amount * rate * 100)


def format_currency(amount_smallest_unit: int, currency: str) -> str:
    """Format an amount in smallest unit for display."""
    currency = currency.lower()
    symbol = CURRENCY_SYMBOLS.get(currency, "$")
    if currency in ZERO_DECIMAL_CURRENCIES:
        return f"{symbol} {amount_smallest_unit}"
    return f"{symbol} {amount_smallest_unit / 100:.2f}"
