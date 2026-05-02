from typing import Any

from fastapi.routing import APIRoute


class CamelRoute(APIRoute):
    """APIRoute that serializes responses using field aliases (camelCase)."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        kwargs.setdefault("response_model_by_alias", True)
        super().__init__(*args, **kwargs)
