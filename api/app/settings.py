from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://mrducky:mrducky@localhost:5432/mrducky"
    jwt_secret: str = "dev-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 30
    anthropic_api_key: str = ""
    gocardless_secret_id: str = ""
    gocardless_secret_key: str = ""
    admin_pin_hash: str = ""
    owner_name: str = "You"
    currency: str = "EUR"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
