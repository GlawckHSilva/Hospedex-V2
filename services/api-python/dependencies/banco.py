"""Dependências de banco para rotas públicas e autenticadas."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from db.conexao import abrir_sessao_banco


async def obter_sessao_banco() -> AsyncGenerator[AsyncSession]:
    """Permite injetar uma sessão simples em endpoints sem usuário autenticado."""
    async for sessao in abrir_sessao_banco():
        yield sessao
