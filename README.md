# 🏡 Hospedex V2

<p align="center">
  <strong>Marketplace, gestão e automação para hospedagens modernas.</strong>
</p>

<p align="center">
  Plataforma multi-tenant para proprietários de casas de temporada, pousadas e pequenos hotéis gerenciarem reservas, propriedades, unidades, financeiro, operações e canais próprios em um só lugar.
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-0ea5e9?style=for-the-badge" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-111827?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-16a34a?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-059669?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-2563eb?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## ✨ Visão do projeto

O **Hospedex V2** é a nova arquitetura do Hospedex, construída para reduzir a dependência de plataformas como Airbnb e Booking, oferecendo ao proprietário um canal próprio de reservas e uma operação centralizada.

A proposta é unir:

- 🌎 **Marketplace público** para hóspedes encontrarem propriedades.
- 🏢 **Página de gestão** para apresentar o produto a proprietários.
- 🧭 **Painel administrativo** para proprietários, funcionários e Super Admin.
- 🔐 **Multi-tenant** com isolamento por tenant, proprietário e permissões.
- ⚙️ **Feature flags** para liberar módulos conforme plano ou cliente.
- 🧠 **Base preparada para IA** e automações futuras.

---

## 🧱 Arquitetura

```txt
Hospedex-V2
├── apps
│   ├── admin          # Painel administrativo: proprietário, funcionários e Super Admin
│   ├── marketplace    # Marketplace público de hospedagens
│   └── gestao         # Página comercial do sistema de gestão
│
├── packages
│   ├── ui             # Componentes compartilhados e design system
│   ├── types          # Tipos compartilhados
│   ├── config         # Configurações comuns
│   ├── permissions    # Regras de permissões
│   └── feature-flags  # Controle modular de funcionalidades
│
├── services
│   └── api-python     # API auxiliar em Python/FastAPI
│
├── database
│   └── supabase       # Migrations, policies, seeds e testes SQL
│
└── docs               # Decisões, arquitetura e roadmap da V2
```

---

## 🚀 Apps

| App | Domínio planejado | Objetivo |
|---|---|---|
| `apps/marketplace` | `hospedex.com.br` | Site público para hóspedes encontrarem e reservarem hospedagens |
| `apps/gestao` | `gestao.hospedex.com.br` | Página de apresentação do sistema para proprietários |
| `apps/admin` | `admin.hospedex.com.br` | Painel do proprietário, funcionários e Super Admin |

---

## 🧩 Módulos previstos

### Proprietário

- Dashboard operacional
- Propriedades e unidades
- Reservas
- Calendário e disponibilidade
- Financeiro
- Hóspedes/CRM básico
- Limpeza
- Inventário
- Relatórios
- Notificações
- Configurações

### Super Admin

- Dashboard global
- Proprietários
- Hóspedes
- Planos e licenças
- Feature flags
- Financeiro global
- Auditoria
- Configurações

### Marketplace

- Home pública
- Busca e filtros
- Página premium da propriedade
- Galeria de imagens
- Comodidades
- Regras
- Avaliações verificadas
- Fluxo de reserva

---

## 🛠️ Stack

| Camada | Tecnologias |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| UI/UX | shadcn/ui, Framer Motion, Lucide, Recharts |
| Backend auxiliar | Python, FastAPI |
| Banco/Auth | Supabase, PostgreSQL, RLS |
| Monorepo | Turborepo |
| Deploy | Vercel |
| Futuro | Redis, OpenAI, integrações externas |

---

## 📌 Status atual

- ✅ Autenticação base
- ✅ Layout administrativo
- ✅ Propriedades e unidades
- ✅ Upload de imagens via Supabase Storage
- ✅ Reservas manuais
- ✅ Primeiro dashboard funcional do proprietário
- 🟡 Marketplace inicial em evolução
- 🟡 Super Admin em evolução
- 🟡 Calendário e disponibilidade em evolução

---

## ▶️ Como rodar localmente

```bash
npm install
npm run dev:admin
npm run dev:marketplace
npm run dev:gestao
```

### Comandos úteis

```bash
npm run build
npm run typecheck
npm run lint
```

---

## 🔐 Variáveis de ambiente

Cada app pode exigir variáveis próprias. As principais do frontend são:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> Nunca commite `.env`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo no repositório.

---

## 🧭 Roadmap resumido

### MVP

- Super Admin cria proprietário
- Proprietário cria propriedade e unidades
- Propriedade aparece no marketplace
- Hóspede solicita ou realiza reserva
- Proprietário gerencia reservas no painel

### Próximas fases

- Pagamentos com Pix/cartão/boleto
- Comissão automática
- Calendário com importação/exportação `.ics`
- Notificações e WhatsApp
- Avaliações verificadas
- Financeiro completo
- IA para insights, relatórios e precificação

---

## 📄 Licença

Projeto em desenvolvimento. Uso e distribuição dependem da definição final do proprietário do projeto.
