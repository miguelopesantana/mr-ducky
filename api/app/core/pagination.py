import base64
from datetime import date

from app.core.errors import validation


def encode_cursor(occurred_at: date, txn_id: int) -> str:
    raw = f"{occurred_at.isoformat()}|{txn_id}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[date, int]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        date_part, id_part = raw.split("|", 1)
        return date.fromisoformat(date_part), int(id_part)
    except (ValueError, UnicodeDecodeError, base64.binascii.Error) as e:
        raise validation("Invalid cursor", {"cursor": str(e)})
