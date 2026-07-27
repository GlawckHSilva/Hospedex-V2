# Tutoriais por módulo

O catálogo oficial fica em `apps/admin/src/lib/tutorials/catalog.json`. Cada tutorial possui chave estável, versão, rota, papéis permitidos e alvos `data-tour-id`.

## Regras

- A apresentação inicial tem no máximo cinco etapas e não reaparece automaticamente depois de iniciada ou dispensada.
- O Supabase é a fonte principal do progresso por tenant, usuário, módulo e versão.
- O `localStorage` é apenas contingência e nunca inicia um tutorial sozinho.
- Convites são registrados por usuário, módulo e versão.
- Permissões e feature flags do menu filtram os tutoriais disponíveis.
- Alterações relevantes de conteúdo devem incrementar `version`; não altere a chave do módulo.
- Etapas apenas orientam. Ações sensíveis continuam exigindo ação e confirmação do usuário.

## Novo tutorial

1. Adicione a definição ao catálogo.
2. Use alvos estáveis no shell ou módulo correspondente.
3. Restrinja `roles` e escolha uma rota já protegida.
4. Execute `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
