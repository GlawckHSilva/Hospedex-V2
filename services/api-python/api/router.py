"""Roteador raiz da API, mantendo versionamento explícito desde a base."""

from fastapi import APIRouter

from api.v1.router import roteador_v1

roteador_api = APIRouter(prefix="/api")
roteador_api.include_router(roteador_v1, prefix="/v1")
