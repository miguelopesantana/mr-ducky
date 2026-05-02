from __future__ import annotations

import json
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


TRANSCRIPTS_DIR = Path(
    os.getenv("TRANSCRIPTS_DIR", str(Path(__file__).resolve().parents[1] / "transcripts"))
)


class TranscriptStore:
    """In-memory append-only transcript log per session, persisted to disk."""

    def __init__(self) -> None:
        self._entries: dict[str, list[dict]] = defaultdict(list)
        TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

    def append(self, session_id: str, *, role: str, text: str) -> None:
        self._entries[session_id].append(
            {"role": role, "text": text, "ts": time.time()}
        )

    def get(self, session_id: str) -> list[dict]:
        return list(self._entries.get(session_id, []))

    def save_to_disk(self, session_id: str, *, outcome: str | None = None) -> dict:
        """Write {session_id}.json and {session_id}.txt under TRANSCRIPTS_DIR.

        Returns {"json": str, "txt": str} with the absolute paths written.
        Safe to call multiple times — overwrites the same files.
        """
        entries = self.get(session_id)
        TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
        ts_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        stem = f"{ts_label}_{session_id}"
        json_path = TRANSCRIPTS_DIR / f"{stem}.json"
        txt_path = TRANSCRIPTS_DIR / f"{stem}.txt"

        json_path.write_text(
            json.dumps(
                {
                    "session_id": session_id,
                    "outcome": outcome,
                    "saved_at": datetime.now(timezone.utc).isoformat(),
                    "entries": entries,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        lines = []
        for e in entries:
            t = datetime.fromtimestamp(e["ts"], timezone.utc).strftime("%H:%M:%S")
            lines.append(f"[{t}] {e['role']}: {e['text']}")
        txt_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

        return {"json": str(json_path), "txt": str(txt_path)}
