# Hospedex V2

Monorepo oficial da V2 do Hospedex.

Este repositório contém a nova arquitetura do produto, separada da V1, com foco em multi-tenant, Supabase/PostgreSQL, FastAPI e painéis administrativos em Next.js.

## Apps

- `apps/marketplace`: `hospedex.com.br`
- `apps/gestao`: `gestao.hospedex.com.br`
- `apps/admin`: `admin.hospedex.com.br`

## Comandos

```bash
npm install
npm run dev:admin
npm run dev:marketplace
npm run dev:gestao
npm run build
npm run typecheck
npm run lint
```

## Estrutura

- `apps/admin`: painel administrativo da V2.
- `apps/marketplace`: superfície pública futura.
- `apps/gestao`: superfície de gestão futura.
- `packages/*`: tipos, UI, permissões, feature flags e configuração.
- `services/api-python`: API Python/FastAPI.
- `database/supabase`: migrations, policies, seeds e testes SQL.
- `docs`: decisões e escopo da V2.

## Status

- Autenticação base.
- Layout administrativo.
- Propriedades e unidades.
- Upload de imagens via Supabase Storage.
- Reservas manuais.
- Primeiro dashboard funcional do proprietário.
