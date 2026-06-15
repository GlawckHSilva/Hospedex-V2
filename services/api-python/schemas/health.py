"""Schemas do healthcheck da API."""

from pydantic import BaseModel


class RespostaHealth(BaseModel):
    """Resposta simples para monitoramento da API e do banco."""

    status: str
    banco: str
    redis: str
