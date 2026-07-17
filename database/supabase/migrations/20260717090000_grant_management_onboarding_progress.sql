/*
 * Libera a tabela de progresso para usuarios autenticados.
 *
 * As policies RLS continuam garantindo que cada usuario acesse somente o
 * proprio progresso dentro do tenant ao qual pertence.
 */
grant select, insert, update on public.user_tutorial_progress to authenticated;

grant all on public.user_tutorial_progress to service_role;

revoke all on public.user_tutorial_progress from anon;
