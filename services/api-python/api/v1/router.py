"""Agrupa as rotas públicas já disponíveis na V1."""

from fastapi import APIRouter

from api.v1.health import roteador as roteador_health

roteador_v1 = APIRouter()
roteador_v1.include_router(roteador_health)
