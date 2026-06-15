"""
Modelo do contexto autenticado.

O contexto é a fronteira de autorização da API:
- `tenant_id` define o cliente atual;
- `user_id` identifica o usuário autenticado;
- `role` descreve o papel operacional;
- `permissions` detalha ações permitidas;
- `feature_flags` mostra recursos habilitados para o tenant.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

PapelUsuario = Literal["convidado", "proprietario", "equipe", "super_admin"]


class ContextoUsuario(BaseModel):
    """Carrega decisões de autorização já resolvidas para a requisição atual."""

    model_config = ConfigDict(frozen=True)

    user_id: UUID
    tenant_id: UUID | None = None
    role: PapelUsuario
    permissions: tuple[str, ...] = Field(default_factory=tuple)
    feature_flags: dict[str, bool] = Field(default_factory=dict)

    def possui_permissao(self, permissao: str) -> bool:
        """Centraliza a regra para evitar checagens duplicadas em endpoints."""
        return (
            self.role in {"proprietario", "super_admin"}
            or "*" in self.permissions
            or permissao in self.permissions
        )

    def feature_habilitada(self, chave: str) -> bool:
        """Evita tratar feature flag ausente como habilitada por acidente."""
        return bool(self.feature_flags.get(chave, False))
