"""Configuração mínima de logs da API."""

import logging


def configurar_logs(ambiente: str) -> None:
    """Define nível de log sem expor dados sensíveis."""
    nivel = logging.DEBUG if ambiente == "local" else logging.INFO
    logging.basicConfig(
        level=nivel,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
