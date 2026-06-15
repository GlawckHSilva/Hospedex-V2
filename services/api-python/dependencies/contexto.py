"""
Dependências de contexto autenticado.

O contexto do usuário concentra tenant, usuário, papel, permissões e feature flags.
Endpoints futuros devem depender desta camada para garantir isolamento multi-tenant
e evitar decisões de autorização espalhadas pelo código.
"""

from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from db.conexao import obter_fabrica_sessao
from models.contexto import ContextoUsuario
from services.autenticacao import ErroAutenticacao, decodificar_token_supabase
from services.contexto_usuario import (
    AcessoTenantNegado,
    PerfilUsuarioNaoEncontrado,
    aplicar_contexto_autenticacao_banco,
    carregar_contexto_usuario,
)
from utils.ids import converter_uuid

esquema_bearer = HTTPBearer(auto_error=False)


async def obter_payload_token(
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)],
) -> dict[str, Any]:
    """Valida o bearer token antes de qualquer consulta com dados protegidos."""
    if credenciais is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token bearer não informado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return decodificar_token_supabase(credenciais.credentials)
    except ErroAutenticacao as erro:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(erro),
            headers={"WWW-Authenticate": "Bearer"},
        ) from erro


async def obter_contexto_usuario(
    payload_token: Annotated[dict[str, Any], Depends(obter_payload_token)],
    tenant_id_header: Annotated[str | None, Header(alias="X-Hospedex-Tenant-Id")] = None,
) -> ContextoUsuario:
    """Carrega o contexto completo do usuário autenticado para endpoints futuros."""
    tenant_id_solicitado = converter_uuid(tenant_id_header, "X-Hospedex-Tenant-Id")
    user_id = converter_uuid(str(payload_token["sub"]), "sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não contém usuário.",
        )

    fabrica = obter_fabrica_sessao()

    async with fabrica() as sessao:
        await aplicar_contexto_autenticacao_banco(sessao, payload_token)
        try:
            return await carregar_contexto_usuario(
                sessao=sessao,
                user_id=user_id,
                tenant_id_solicitado=tenant_id_solicitado,
            )
        except (AcessoTenantNegado, PerfilUsuarioNaoEncontrado) as erro:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(erro),
            ) from erro


async def obter_sessao_autenticada(
    payload_token: Annotated[dict[str, Any], Depends(obter_payload_token)],
) -> AsyncGenerator[AsyncSession]:
    """Entrega sessão com claims Supabase aplicados para respeitar RLS no banco."""
    fabrica = obter_fabrica_sessao()
    async with fabrica() as sessao:
        await aplicar_contexto_autenticacao_banco(sessao, payload_token)
        yield sessao


async def exigir_contexto_tenant(
    contexto: Annotated[ContextoUsuario, Depends(obter_contexto_usuario)],
) -> ContextoUsuario:
    """Bloqueia rotas que precisam operar dentro de um tenant específico."""
    if contexto.tenant_id is None or contexto.role == "convidado":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contexto de tenant obrigatório.",
        )
    return contexto


async def exigir_super_admin(
    contexto: Annotated[ContextoUsuario, Depends(obter_contexto_usuario)],
) -> ContextoUsuario:
    """Reserva rotas globais para administradores da plataforma."""
    if contexto.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso exclusivo para super administrador.",
        )
    return contexto


def exigir_permissao(permissao: str) -> Callable[..., Awaitable[ContextoUsuario]]:
    """Cria uma dependência de permissão reutilizável por endpoint."""

    async def dependencia(
        contexto: Annotated[ContextoUsuario, Depends(exigir_contexto_tenant)],
    ) -> ContextoUsuario:
        # Proprietários e super admins passam por padrão porque representam o topo da hierarquia.
        if not contexto.possui_permissao(permissao):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente para executar esta ação.",
            )
        return contexto

    return dependencia
