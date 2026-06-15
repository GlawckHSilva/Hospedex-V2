"""
Ponto de entrada da API Python da V2 do Hospedex.

Este arquivo monta somente a infraestrutura base:
- FastAPI;
- CORS;
- rotas versionadas;
- ciclo de vida da aplicação;
- middleware de contexto de requisição.

Regras de domínio como reservas, pagamentos e marketplace ficam fora desta etapa.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.router import roteador_api
from core.config import Configuracoes, obter_configuracoes
from core.logs import configurar_logs
from db.conexao import fechar_motor_banco
from middlewares.contexto_requisicao import MiddlewareContextoRequisicao


@asynccontextmanager
async def ciclo_vida_aplicacao(_: FastAPI) -> AsyncIterator[None]:
    """Fecha conexões compartilhadas ao encerrar o processo da API."""
    yield
    await fechar_motor_banco()


def criar_app(configuracoes: Configuracoes | None = None) -> FastAPI:
    """Cria a aplicação sem efeitos colaterais fortes, facilitando testes futuros."""
    config = configuracoes or obter_configuracoes()
    configurar_logs(config.ambiente)

    app = FastAPI(
        title=config.nome_api,
        version=config.versao_api,
        docs_url=config.docs_url,
        redoc_url=None,
        lifespan=ciclo_vida_aplicacao,
    )

    app.add_middleware(MiddlewareContextoRequisicao)

    if config.cors_origens:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.cors_origens,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(roteador_api)
    return app


app = criar_app()
