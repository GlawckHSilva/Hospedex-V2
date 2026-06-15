"""
Validação de tokens emitidos pelo Supabase Auth.

O token identifica o usuário, mas permissões e feature flags são sempre buscadas
no PostgreSQL. Isso evita confiar em metadados editáveis do usuário e preserva o
isolamento multi-tenant definido pelas migrations da V2.
"""

from typing import Any

import jwt
from jwt import InvalidTokenError

from core.config import Configuracoes, obter_configuracoes


class ErroAutenticacao(Exception):
    """Erro controlado para falhas de autenticação."""


def decodificar_token_supabase(
    token: str,
    configuracoes: Configuracoes | None = None,
) -> dict[str, Any]:
    """Decodifica JWT HS256 usando o segredo configurado no Supabase."""
    config = configuracoes or obter_configuracoes()
    segredo = config.supabase_jwt_secret_valor
    if not segredo:
        raise ErroAutenticacao("Segredo JWT do Supabase não configurado.")

    opcoes_decode: dict[str, Any] = {
        "algorithms": ["HS256"],
        "audience": config.supabase_jwt_audience,
    }
    if config.supabase_jwt_issuer:
        opcoes_decode["issuer"] = config.supabase_jwt_issuer

    try:
        payload = jwt.decode(token, segredo, **opcoes_decode)
    except InvalidTokenError as erro:
        raise ErroAutenticacao("Token de autenticação inválido.") from erro

    if not payload.get("sub"):
        raise ErroAutenticacao("Token de autenticação não contém usuário.")

    return payload
