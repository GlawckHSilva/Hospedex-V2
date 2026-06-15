"""Middleware leve para rastrear requisições da API."""

import logging
from collections.abc import Awaitable, Callable
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class MiddlewareContextoRequisicao(BaseHTTPMiddleware):
    """Adiciona um ID por requisição para facilitar logs e suporte em produção."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id

        try:
            resposta: Response = await call_next(request)
        except Exception:
            logger.exception("Erro inesperado ao processar a requisição %s.", request_id)
            raise

        resposta.headers["X-Request-ID"] = request_id
        return resposta
