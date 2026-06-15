"""
Conexão assíncrona com PostgreSQL/Supabase.

Esta camada isola detalhes de SQLAlchemy/asyncpg para que endpoints futuros usem
dependências simples. O healthcheck valida também a tabela `public.tenants`, pois
ela é a base do isolamento multi-tenant definido nas migrations da V2.
"""

import ssl
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import Configuracoes, obter_configuracoes

_motor_banco: AsyncEngine | None = None
_fabrica_sessao: async_sessionmaker[AsyncSession] | None = None


def converter_url_asyncpg(database_url: str) -> str:
    """Converte URLs PostgreSQL comuns para o driver assíncrono usado pela API."""
    url = make_url(database_url)
    driver = (
        "postgresql+asyncpg"
        if url.drivername in {"postgres", "postgresql"}
        else url.drivername
    )
    return url.set(drivername=driver).difference_update_query(["sslmode"]).render_as_string(
        hide_password=False,
    )


def deve_usar_ssl(database_url: str, modo_ssl: str) -> bool:
    """Supabase cloud exige TLS; banco local mantém conexão simples por padrão."""
    modo = modo_ssl.lower()
    if modo == "require":
        return True
    if modo == "disable":
        return False

    url = make_url(database_url)
    if url.query.get("sslmode") == "require":
        return True
    if url.query.get("sslmode") == "disable":
        return False

    host = (url.host or "").lower()
    return host not in {"", "localhost", "127.0.0.1", "::1"}


def obter_motor_banco(configuracoes: Configuracoes | None = None) -> AsyncEngine:
    """Cria um pool único por processo para evitar conexões excessivas no Supabase."""
    global _motor_banco

    config = configuracoes or obter_configuracoes()
    database_url = config.database_url_valor
    if not database_url:
        raise RuntimeError("URL do banco de dados não configurada.")

    if _motor_banco is None:
        argumentos_conexao: dict[str, object] = {}
        if deve_usar_ssl(database_url, config.database_ssl):
            argumentos_conexao["ssl"] = ssl.create_default_context()

        _motor_banco = create_async_engine(
            converter_url_asyncpg(database_url),
            connect_args=argumentos_conexao,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )

    return _motor_banco


def obter_fabrica_sessao(
    configuracoes: Configuracoes | None = None,
) -> async_sessionmaker[AsyncSession]:
    """Centraliza a criação de sessões para dependências autenticadas e públicas."""
    global _fabrica_sessao

    if _fabrica_sessao is None:
        _fabrica_sessao = async_sessionmaker(
            bind=obter_motor_banco(configuracoes),
            expire_on_commit=False,
        )

    return _fabrica_sessao


async def abrir_sessao_banco() -> AsyncGenerator[AsyncSession]:
    """Entrega uma sessão sem contexto de usuário, adequada para rotas públicas."""
    fabrica = obter_fabrica_sessao()
    async with fabrica() as sessao:
        yield sessao


async def verificar_conexao_banco() -> None:
    """Valida conectividade e presença do schema multi-tenant inicial."""
    async with obter_motor_banco().connect() as conexao:
        resultado = await conexao.execute(
            text("select to_regclass('public.tenants') is not null as schema_ok"),
        )
        if not resultado.scalar_one():
            raise RuntimeError("Schema multi-tenant da V2 não encontrado no banco.")


async def fechar_motor_banco() -> None:
    """Fecha o pool ao encerrar reloads ou deploys."""
    global _motor_banco, _fabrica_sessao

    if _motor_banco is not None:
        await _motor_banco.dispose()
        _motor_banco = None
        _fabrica_sessao = None
