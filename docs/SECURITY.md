# Segurança do Hospedex V2

Este documento define cuidados mínimos de segurança para o desenvolvimento, deploy e manutenção do Hospedex V2.

O repositório pode conter código público, mas nunca deve conter credenciais, senhas, chaves privadas ou dados reais sensíveis.

---

## Regras principais

- Nunca commitar arquivos `.env`.
- Nunca commitar `DATABASE_URL`.
- Nunca commitar `SUPABASE_SERVICE_ROLE_KEY`.
- Nunca commitar `OPENAI_API_KEY`.
- Nunca commitar senhas de teste reais.
- Nunca commitar dumps de banco com dados reais.
- Nunca expor dados pessoais de hóspedes, proprietários ou usuários.

---

## Variáveis públicas e privadas

### Podem ser usadas no frontend

Variáveis iniciadas com `NEXT_PUBLIC_` podem ir para o navegador.

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Mesmo assim, elas devem ser tratadas com cuidado e configuradas preferencialmente via Vercel.

### Não podem ir para o frontend

Estas variáveis são sensíveis e devem existir apenas em ambiente seguro de backend:

```env
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REDIS_URL=
```

A `SUPABASE_SERVICE_ROLE_KEY` ignora regras RLS e nunca deve ser usada em componentes client-side.

---

## Supabase e RLS

O Hospedex V2 utiliza arquitetura multi-tenant.

Todo dado de cliente deve ser isolado por campos como:

- `tenant_id`
- `owner_id`
- `property_id`

As policies RLS devem garantir que:

- Proprietários vejam apenas dados do próprio tenant.
- Funcionários vejam apenas o que suas permissões autorizam.
- Hóspedes vejam apenas dados públicos ou reservas próprias.
- Super Admin tenha acesso controlado e auditável.

---

## Cuidados com Super Admin

Usuários Super Admin possuem acesso crítico.

Regras:

- Criar Super Admin apenas por processo seguro.
- Usar senha forte.
- Trocar senhas temporárias após testes.
- Não registrar senha em logs.
- Não criar Super Admin por migration pública contendo senha.
- Registrar ações administrativas importantes em auditoria.

---

## Repositório público

Como o repositório pode estar público, antes de cada push verifique se não existem:

```txt
.env
.env.local
.env.production
.env.development
*.pem
*.key
service-role
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
senha
password
```

Se alguma credencial for exposta, ela deve ser revogada imediatamente.

---

## Gitignore obrigatório

O `.gitignore` deve bloquear pelo menos:

```gitignore
.env
.env.*
!.env.example
node_modules
.next
dist
build
*.log
.vercel
```

Caso exista `.env.example`, ele deve conter apenas nomes de variáveis e valores fictícios.

---

## Vercel

As variáveis de ambiente devem ser configuradas em:

```txt
Vercel → Project Settings → Environment Variables
```

Nunca coloque segredos diretamente no código.

Para apps frontend, use apenas variáveis públicas necessárias.

---

## Banco de dados

Antes de migrations grandes:

- Validar migration localmente quando possível.
- Fazer backup ou snapshot quando o banco tiver dados importantes.
- Evitar comandos destrutivos sem revisão.
- Nunca usar `db reset` em produção.

---

## Dados de teste

Dados de teste devem ser claramente fictícios.

Evite usar:

- emails pessoais;
- telefones reais;
- CPFs reais;
- endereços reais;
- senhas reutilizadas.

---

## Auditoria

Ações importantes devem gerar logs de auditoria futuramente:

- criação de proprietário;
- alteração de plano;
- bloqueio/desbloqueio de conta;
- alteração de permissões;
- criação/cancelamento de reserva;
- alteração de valores;
- exclusão de dados importantes.

---

## Checklist antes de publicar

- [ ] Nenhum `.env` commitado.
- [ ] Nenhuma senha no código.
- [ ] Nenhuma service role no frontend.
- [ ] RLS ativo nas tabelas sensíveis.
- [ ] Policies revisadas.
- [ ] Variáveis configuradas na Vercel.
- [ ] Build passando.
- [ ] Login validado.
- [ ] Acesso por role validado.
- [ ] Proprietário não acessa dados de outro tenant.

---

## Em caso de vazamento

Se uma credencial for exposta:

1. Revogue ou regenere a chave imediatamente.
2. Atualize a variável no Supabase/Vercel.
3. Remova a credencial do histórico, se necessário.
4. Verifique logs de acesso.
5. Registre o ocorrido.

Segurança não é opcional. Em um sistema multi-tenant, um erro de isolamento pode expor dados de todos os clientes.
