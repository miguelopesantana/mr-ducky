from pydantic import Field

from app.schemas._base import StrictModel


class LoginRequest(StrictModel):
    pin: str = Field(min_length=4, max_length=32)


class LoginResponse(StrictModel):
    token: str
    user: "UserMe"


class UserMe(StrictModel):
    name: str
    currency: str


LoginResponse.model_rebuild()
