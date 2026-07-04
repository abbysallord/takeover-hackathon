from datetime import datetime


def format_currency(val: float, currency_symbol: str = "$") -> str:
    """Formats a float value as a currency string."""
    return f"{currency_symbol}{val:,.2f}"


def format_iso_timestamp(dt: datetime) -> str:
    """Converts a python datetime to a standardized ISO-8601 UTC timestamp."""
    return dt.isoformat() + "Z"
