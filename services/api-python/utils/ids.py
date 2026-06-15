"""Utilitários para IDs usados em rotas e headers."""

from uuid import UUID

from fastapi import HTTPException, status


def converter_uuid(valor: str | None, nome_campo: str) -> UUID | None:
    """Converte UUIDs de entrada com erro claro para clientes da API."""
    if valor is None or valor == "":
        return None

    try:
        return UUID(valor)
    except ValueError as erro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{nome_campo} deve ser um UUID válido.",
        ) from erro
