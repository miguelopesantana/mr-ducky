from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class StrictModel(BaseModel):
    """Base model that rejects unknown fields, accepts snake_case or camelCase."""

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        alias_generator=to_camel,
    )


class ORMModel(BaseModel):
    """Base model for response payloads built from ORM rows. Outputs camelCase."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )
