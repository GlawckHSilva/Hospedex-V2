"""Healthcheck real da API, validando a conexão e o schema base da V2."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from core.config import Configuracoes, obter_configuracoes
from db.conexao import verificar_conexao_banco
from schemas.health import RespostaHealth

logger = logging.getLogger(__name__)
roteador = APIRouter(prefix="/health", tags=["health"])


@roteador.get("", response_model=RespostaHealth)
async def healthcheck(
    configuracoes: Annotated[Configuracoes, Depends(obter_configuracoes)],
) -> RespostaHealth:
    """Confirma que a API alcança o PostgreSQL e que as migrations base existem."""
    try:
        await verificar_conexao_banco()
    except Exception as erro:
        logger.exception("Falha ao executar healthcheck do banco de dados.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "degradado",
                "banco": "indisponivel",
                "mensagem": "Não foi possível validar o PostgreSQL da V2.",
            },
        ) from erro

    return RespostaHealth(
        status="ok",
        banco="ok",
        redis="configurado" if configuracoes.redis_configurado else "nao_configurado",
    )
