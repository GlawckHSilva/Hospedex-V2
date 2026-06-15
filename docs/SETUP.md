# Setup do Hospedex V2

Este documento explica como preparar o ambiente local, conectar Supabase, rodar os apps e configurar deploy.

---

## Pré-requisitos

Instale:

- Node.js LTS
- npm
- Git
- Supabase CLI
- Docker Desktop, necessário para alguns comandos do Supabase como `db pull`

Verificações:

```bash
node -v
npm -v
git --version
supabase --version
```

---

## Instalação

Na raiz do projeto:

```bash
npm install
```

---

## Estrutura dos apps

```txt
apps/admin          # Painel administrativo
apps/marketplace    # Marketplace público
apps/gestao         # Página comercial da gestão
services/api-python # API auxiliar FastAPI
```

---

## Variáveis de ambiente

Crie arquivos `.env.local` conforme a necessidade de cada app.

Nunca envie `.env` para o GitHub.

### Frontend

Variáveis públicas usadas pelos apps Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### Backend/API

Variáveis sensíveis devem ficar apenas no backend:

```env
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REDIS_URL=
```

Use valores reais apenas em ambiente local ou no painel da Vercel/serviço de deploy.

---

## Supabase

### Login

```bash
supabase login
```

### Linkar projeto

Na raiz do projeto:

```bash
supabase link --project-ref SEU_PROJECT_REF
```

### Aplicar migrations

```bash
supabase db push
```

### Puxar schema remoto

Este comando pode exigir Docker Desktop aberto:

```bash
supabase db pull
```

---

## Problemas comuns com migrations

### Erro: remote migration versions not found

Isso significa que o banco remoto tem migrations registradas que não existem localmente.

Use com cuidado:

```bash
supabase migration repair --status reverted ID_DA_MIGRATION
```

Depois:

```bash
supabase db push
```

### Erro relacionado ao Docker

Se aparecer erro de Docker, abra o Docker Desktop e tente novamente.

Para `db push`, o Docker pode não ser necessário. Para `db pull`, normalmente é.

---

## Rodar localmente

### Admin

```bash
npm run dev:admin
```

### Marketplace

```bash
npm run dev:marketplace
```

### Gestão

```bash
npm run dev:gestao
```

A URL local será exibida no terminal, geralmente:

```txt
http://localhost:3000
```

ou outra porta disponível.

---

## Comandos de qualidade

```bash
npm run typecheck
npm run lint
npm run build
```

Antes de deploy, todos devem passar sem erros críticos.

---

## Deploy na Vercel

O projeto usa monorepo. Cada app deve ser configurado como projeto separado na Vercel.

### Admin

```txt
Root Directory: apps/admin
Framework: Next.js
Build Command: turbo run build
Output Directory: padrão do Next.js
Install Command: npm install
```

### Marketplace

```txt
Root Directory: apps/marketplace
Framework: Next.js
Build Command: turbo run build
Output Directory: padrão do Next.js
Install Command: npm install
```

### Gestão

```txt
Root Directory: apps/gestao
Framework: Next.js
Build Command: turbo run build
Output Directory: padrão do Next.js
Install Command: npm install
```

---

## Variáveis na Vercel

Configure em:

```txt
Vercel → Project Settings → Environment Variables
```

Para apps Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Não coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend, exceto se houver backend server-side claramente separado e seguro.

---

## Teste mínimo após deploy

Após publicar, validar:

- [ ] App abre sem tela branca.
- [ ] Login carrega.
- [ ] Variáveis Supabase estão corretas.
- [ ] Usuário Super Admin consegue entrar.
- [ ] Proprietário não acessa dados indevidos.
- [ ] Build não tem erros críticos.

---

## Fluxo recomendado de desenvolvimento

1. Criar pequena etapa.
2. Rodar typecheck.
3. Rodar lint.
4. Rodar build.
5. Aplicar migrations, se necessário.
6. Testar localmente.
7. Fazer commit.
8. Deploy em preview.
9. Validar no navegador.

---

## Observação importante

A V2 reaproveita parte da estrutura/banco anterior, mas o código deve seguir a arquitetura da V2.

Não copie padrões antigos sem revisão.

A V2 deve priorizar:

- modularidade;
- segurança;
- multi-tenant;
- manutenção;
- escalabilidade;
- experiência premium.
