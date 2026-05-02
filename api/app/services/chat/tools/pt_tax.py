"""lookup_pt_tax_rule tool: returns sections of the Portuguese IRS knowledge base."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register

_KB_PATH = Path(__file__).resolve().parents[1] / "knowledge" / "pt_tax_2026.md"

_TOPIC_PREFIXES: dict[str, tuple[str, ...]] = {
    "deductions": ("## 1. ",),
    "irs_jovem": ("## 2. ",),
    "helpers": ("## 3. ",),
    "easy_wins": ("## 4. ", "## 6. "),
    "oe2026": ("## 5. ",),
}


@lru_cache(maxsize=1)
def _sections() -> dict[str, str]:
    text = _KB_PATH.read_text(encoding="utf-8")
    chunks: dict[str, str] = {"all": text}
    parts = text.split("\n## ")
    by_heading: dict[str, str] = {}
    for part in parts[1:]:
        section = "## " + part
        first_line = section.split("\n", 1)[0]
        by_heading[first_line] = section.rstrip()
    for topic, prefixes in _TOPIC_PREFIXES.items():
        matched = [
            section
            for line, section in by_heading.items()
            if any(line.startswith(p) for p in prefixes)
        ]
        chunks[topic] = "\n\n".join(matched)
    return chunks


_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "required": ["topic"],
    "properties": {
        "topic": {
            "type": "string",
            "enum": ["deductions", "irs_jovem", "helpers", "easy_wins", "oe2026", "all"],
            "description": (
                "Which slice of the PT IRS knowledge base to retrieve. "
                "`deductions` = health/education/housing/PPR/IVA caps and articles; "
                "`irs_jovem` = youth exemption schedule and eligibility; "
                "`helpers` = Porta 65, Apoio à Renda, IMT Jovem, meal allowance card vs cash, student status; "
                "`easy_wins` = ranked top-10 practical actions; "
                "`oe2026` = changes in the 2026 budget; "
                "`all` = entire document (~6k tokens, use sparingly)."
            ),
        }
    },
}


def _handler(_db: Session, args: dict[str, Any], _ctx: ChatContext) -> ToolResult:
    topic = args["topic"]
    content = _sections().get(topic, "")
    if not content:
        return ToolResult.fail(f"unknown topic: {topic}")
    return ToolResult.ok({"topic": topic, "content": content})


register(
    ToolSpec(
        name="lookup_pt_tax_rule",
        description=(
            "Look up Portuguese personal income tax (IRS) rules, deductions, and "
            "government programmes from a 2025/2026 knowledge base. Call this BEFORE "
            "answering any question about Portuguese taxes, IRS deductions, IRS Jovem, "
            "Porta 65, PPR, meal allowance, mortgage interest, or rent deductions — "
            "never invent caps or percentages. Pick the most relevant topic; you may "
            "call it multiple times if the question spans topics."
        ),
        parameters=_PARAMETERS,
        handler=_handler,
    )
)
