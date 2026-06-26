/*
  Libera os detalhes publicos da casa para o Marketplace anonimo.

  A listagem publica usa public_details para exibir titulo, descricao e nome
  preparados pelo proprietario. A coluna nao contem dados internos, mas sem este
  GRANT o PostgREST bloqueia a query completa de properties para o papel anon.
*/

grant select (public_details) on public.properties to anon;
