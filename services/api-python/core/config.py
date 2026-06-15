"""
Configuração segura da API Python.

Este módulo centraliza variáveis de ambiente sensíveis e evita espalhar acesso direto
ao `.env` pelo código. Segredos como URL do banco e JWT do Supabase ficam em
`SecretStr` para reduzir risco de vazamento em logs e erros.

A configuração de Redis já existe para a próxima etapa, mas a API não abre conexão
com Redis agora porque esta entrega deve validar apenas PostgreSQL/Supabase.
"""

from functools import lru_cache
from typing import Any, Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    """Representa a configuração operacional da API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    nome_api: str = Field(default="Hospedex API", validation_alias="HOSPEDEX_API_NAME")
    versao_api: str = Field(default="0.1.0", validation_alias="HOSPEDEX_API_VERSION")
    ambiente: str = Field(default="local", validation_alias="HOSPEDEX_API_ENV")
    docs_url: str | None = Field(default="/docs", validation_alias="HOSPEDEX_DOCS_URL")
    cors_origens: list[str] = Field(
        default_factory=list,
        validation_alias="HOSPEDEX_CORS_ORIGINS",
    )

    database_url: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("HOSPEDEX_DATABASE_URL", "DATABASE_URL"),
    )
    database_ssl: Literal["auto", "require", "disable"] = Field(
        default="auto",
        validation_alias="HOSPEDEX_DATABASE_SSL",
    )
    database_set_role: bool = Field(
        default=True,
        validation_alias="HOSPEDEX_DATABASE_SET_ROLE",
    )

    supabase_jwt_secret: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("HOSPEDEX_SUPABASE_JWT_SECRET", "SUPABASE_JWT_SECRET"),
    )
    supabase_jwt_audience: str = Field(
        default="authenticated",
        validation_alias="HOSPEDEX_SUPABASE_JWT_AUDIENCE",
    )
    supabase_jwt_issuer: str | None = Field(
        default=None,
        validation_alias="HOSPEDEX_SUPABASE_JWT_ISSUER",
    )

    redis_url: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("HOSPEDEX_REDIS_URL", "REDIS_URL"),
    )

    @field_validator("cors_origens", mode="before")
    @classmethod
    def normalizar_cors(cls, valor: Any) -> list[str] | Any:
        """Permite configurar CORS como lista ou string separada por vírgula."""
        if isinstance(valor, str):
            return [origem.strip() for origem in valor.split(",") if origem.strip()]
        return valor

    @property
    def database_url_valor(self) -> str | None:
        """Entrega a URL real apenas para a camada de banco."""
        return self.database_url.get_secret_value() if self.database_url else None

    @property
    def supabase_jwt_secret_valor(self) -> str | None:
        """Entrega o segredo JWT apenas para a validação de autenticação."""
        return self.supabase_jwt_secret.get_secret_value() if self.supabase_jwt_secret else None

    @property
    def redis_configurado(self) -> bool:
        """Sinaliza preparo para Redis sem inicializar cliente nesta etapa."""
        return self.redis_url is not None


@lru_cache
def obter_configuracoes() -> Configuracoes:
    """Cacheia variáveis de ambiente para manter a API previsível por processo."""
    return Configuracoes()
