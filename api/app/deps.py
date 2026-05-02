from functools import lru_cache

from app.db.base import get_db
from app.services.chat.llm import LLMClient
from app.services.chat.openai_client import OpenAIClient
from app.settings import settings


@lru_cache(maxsize=1)
def _llm_singleton() -> LLMClient:
    if settings.chat_provider == "openai":
        return OpenAIClient(api_key=settings.openai_api_key, model=settings.chat_model)
    raise NotImplementedError(
        f"chat_provider={settings.chat_provider!r} is not implemented yet"
    )


def get_llm_client() -> LLMClient:
    return _llm_singleton()


__all__ = ["get_db", "get_llm_client"]
