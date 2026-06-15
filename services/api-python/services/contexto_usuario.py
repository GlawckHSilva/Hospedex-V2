"""
Serviço responsável por carregar o contexto do usuário autenticado.

Este módulo centraliza:
- tenant atual;
- usuário autenticado;
- role do usuário;
- permissões;
- feature flags disponíveis.

Utilizado por toda a API para garantir isolamento multi-tenant e impedir que
endpoints futuros tomem decisões de autorização de forma dispersa.
"""

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import obter_configuracoes
from models.contexto import ContextoUsuario, PapelUsuario


class PerfilUsuarioNaoEncontrado(Exception):
    """Indica token válido sem perfil correspondente no schema público."""


class AcessoTenantNegado(Exception):
    """Indica tentativa de acessar tenant sem vínculo ativo."""


async def aplicar_contexto_autenticacao_banco(
    sessao: AsyncSession,
    payload_token: dict[str, Any],
) -> None:
    """Replica claims validados no banco para que `auth.uid()` e RLS funcionem."""
    user_id = str(payload_token["sub"])
    claims = {**payload_token, "role": "authenticated"}
    config = obter_configuracoes()

    if config.database_set_role:
        # O papel authenticated ativa as mesmas policies RLS usadas pelo Supabase.
        await sessao.execute(text("set local role authenticated"))

    await sessao.execute(
        text("select set_config('request.jwt.claims', :claims, true)"),
        {"claims": json.dumps(claims, separators=(",", ":"))},
    )
    await sessao.execute(
        text("select set_config('request.jwt.claim.sub', :user_id, true)"),
        {"user_id": user_id},
    )
    await sessao.execute(text("select set_config('request.jwt.claim.role', 'authenticated', true)"))


async def carregar_contexto_usuario(
    sessao: AsyncSession,
    user_id: UUID,
    tenant_id_solicitado: UUID | None = None,
) -> ContextoUsuario:
    """Monta o contexto a partir das tabelas oficiais da V2."""
    perfil = await buscar_perfil(sessao, user_id)
    if perfil is None:
        raise PerfilUsuarioNaoEncontrado("Perfil do usuário não encontrado.")

    if perfil["platform_role"] == "super_admin":
        if tenant_id_solicitado and not await tenant_existe(sessao, tenant_id_solicitado):
            raise AcessoTenantNegado("Tenant informado não existe ou está inativo.")
        return ContextoUsuario(
            user_id=user_id,
            tenant_id=tenant_id_solicitado,
            role="super_admin",
            permissions=("*",),
            feature_flags=await carregar_feature_flags(sessao, tenant_id_solicitado),
        )

    vinculo = await buscar_vinculo_ativo(sessao, user_id, tenant_id_solicitado)
    if vinculo is not None:
        papel: PapelUsuario = "proprietario" if vinculo["member_role"] == "owner" else "equipe"
        role_id = vinculo["role_id"]
        permissoes = await carregar_permissoes(sessao, UUID(role_id)) if role_id else ()
        if papel == "proprietario":
            permissoes = tuple(sorted({"tenant.owner", *permissoes}))

        tenant_id = UUID(vinculo["tenant_id"])
        return ContextoUsuario(
            user_id=user_id,
            tenant_id=tenant_id,
            role=papel,
            permissions=permissoes,
            feature_flags=await carregar_feature_flags(sessao, tenant_id),
        )

    tenant_proprio_id = await buscar_tenant_proprio(sessao, user_id, tenant_id_solicitado)
    if tenant_proprio_id is not None:
        return ContextoUsuario(
            user_id=user_id,
            tenant_id=tenant_proprio_id,
            role="proprietario",
            permissions=("tenant.owner",),
            feature_flags=await carregar_feature_flags(sessao, tenant_proprio_id),
        )

    if tenant_id_solicitado is not None:
        # Não revelamos se o tenant existe; a resposta deve ser igual para evitar enumeração.
        raise AcessoTenantNegado("Usuário não possui acesso ao tenant informado.")

    return ContextoUsuario(user_id=user_id, role="convidado")


async def buscar_perfil(sessao: AsyncSession, user_id: UUID) -> dict[str, Any] | None:
    """Busca o perfil público vinculado ao usuário autenticado."""
    resultado = await sessao.execute(
        text(
            """
            select id::text as id, platform_role
            from public.profiles
            where id = :user_id and deleted_at is null
            """
        ),
        {"user_id": str(user_id)},
    )
    linha = resultado.mappings().one_or_none()
    return dict(linha) if linha else None


async def tenant_existe(sessao: AsyncSession, tenant_id: UUID) -> bool:
    """Confirma existência do tenant para operações globais de super admin."""
    resultado = await sessao.execute(
        text(
            """
            select exists (
              select 1 from public.tenants
              where id = :tenant_id and deleted_at is null
            )
            """
        ),
        {"tenant_id": str(tenant_id)},
    )
    return bool(resultado.scalar_one())


async def buscar_vinculo_ativo(
    sessao: AsyncSession,
    user_id: UUID,
    tenant_id_solicitado: UUID | None,
) -> dict[str, Any] | None:
    """Seleciona vínculo ativo; header de tenant permite alternar clientes no futuro."""
    resultado = await sessao.execute(
        text(
            """
            select tm.tenant_id::text as tenant_id,
                   tm.role_id::text as role_id,
                   tm.member_role
            from public.tenant_members tm
            join public.tenants t on t.id = tm.tenant_id
            where tm.user_id = :user_id
              and tm.status = 'active'
              and t.deleted_at is null
              and (
                :tenant_id_solicitado is null
                or tm.tenant_id = cast(:tenant_id_solicitado as uuid)
              )
            order by tm.created_at asc
            limit 1
            """
        ),
        {
            "user_id": str(user_id),
            "tenant_id_solicitado": str(tenant_id_solicitado) if tenant_id_solicitado else None,
        },
    )
    linha = resultado.mappings().one_or_none()
    return dict(linha) if linha else None


async def buscar_tenant_proprio(
    sessao: AsyncSession,
    user_id: UUID,
    tenant_id_solicitado: UUID | None,
) -> UUID | None:
    """Cobre proprietários que ainda não têm registro em `tenant_members`."""
    resultado = await sessao.execute(
        text(
            """
            select id::text as tenant_id
            from public.tenants
            where owner_id = :user_id
              and deleted_at is null
              and (
                :tenant_id_solicitado is null
                or id = cast(:tenant_id_solicitado as uuid)
              )
            order by created_at asc
            limit 1
            """
        ),
        {
            "user_id": str(user_id),
            "tenant_id_solicitado": str(tenant_id_solicitado) if tenant_id_solicitado else None,
        },
    )
    tenant_id = resultado.scalar_one_or_none()
    return UUID(str(tenant_id)) if tenant_id else None


async def carregar_permissoes(sessao: AsyncSession, role_id: UUID) -> tuple[str, ...]:
    """Carrega permissões pelo papel do membro dentro do tenant."""
    resultado = await sessao.execute(
        text(
            """
            select p.code
            from public.role_permissions rp
            join public.permissions p on p.id = rp.permission_id
            where rp.role_id = :role_id
            order by p.code asc
            """
        ),
        {"role_id": str(role_id)},
    )
    return tuple(str(linha["code"]) for linha in resultado.mappings())


async def carregar_feature_flags(
    sessao: AsyncSession,
    tenant_id: UUID | None,
) -> dict[str, bool]:
    """Combina defaults globais com overrides do tenant quando houver tenant atual."""
    if tenant_id is None:
        return {}

    resultado = await sessao.execute(
        text(
            """
            select ff.key,
                   coalesce(tf.enabled, ff.default_enabled) as habilitada
            from public.feature_flags ff
            left join public.tenant_features tf
              on tf.feature_flag_id = ff.id
             and tf.tenant_id = :tenant_id
            order by ff.key asc
            """
        ),
        {"tenant_id": str(tenant_id)},
    )
    return {str(linha["key"]): bool(linha["habilitada"]) for linha in resultado.mappings()}
