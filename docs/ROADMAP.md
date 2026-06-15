# Roadmap do Hospedex V2

Este documento organiza o caminho de evolução do Hospedex V2 por fases.

O objetivo é evitar desenvolvimento desordenado, priorizar o MVP e manter clareza sobre o que deve ser feito agora, depois e futuramente.

---

## Objetivo do produto

O Hospedex V2 é uma plataforma para hospedagens que combina:

- marketplace público;
- painel de gestão para proprietários;
- painel Super Admin;
- reservas;
- calendário;
- financeiro;
- automações;
- operação multi-tenant.

O foco inicial é atender:

- casas de temporada;
- pousadas;
- pequenos hotéis.

---

## Princípios do roadmap

- Construir primeiro o fluxo ponta a ponta.
- Evitar funcionalidades avançadas antes do MVP.
- Manter arquitetura modular.
- Priorizar segurança e isolamento multi-tenant.
- Evitar dependência de gambiarras da V1.
- Evoluir visual depois da base funcional.

---

## MVP obrigatório

O MVP só deve ser considerado funcional quando o fluxo abaixo estiver completo:

```txt
Super Admin cria proprietário
↓
Proprietário acessa o painel
↓
Proprietário cadastra propriedade e unidades
↓
Propriedade aparece no marketplace
↓
Hóspede solicita ou realiza reserva
↓
Proprietário gerencia a reserva no painel
```

---

## Fase 1 — Base do sistema

Status esperado: fundação técnica funcionando.

- [x] Estrutura monorepo.
- [x] Apps separados.
- [x] Painel administrativo inicial.
- [x] Supabase conectado.
- [x] Migrations funcionando.
- [x] Base de autenticação.
- [x] Layout administrativo.
- [x] Base de propriedades e unidades.
- [x] Upload de imagens.
- [x] Dashboard inicial do proprietário.
- [ ] Validação completa de RLS.
- [ ] Seed seguro de dados de teste.
- [ ] Revisão das variáveis de ambiente.

---

## Fase 2 — Operação principal

Status esperado: proprietário consegue operar hospedagens.

- [ ] Criar proprietário pelo Super Admin.
- [ ] Gerenciar planos e licenças.
- [ ] Cadastrar propriedades.
- [ ] Cadastrar unidades.
- [ ] Cadastrar comodidades.
- [ ] Definir regras da propriedade.
- [ ] Definir preços base.
- [ ] Criar reservas manuais.
- [ ] Editar reservas.
- [ ] Cancelar reservas.
- [ ] Timeline da reserva.
- [ ] Status da reserva.
- [ ] Calendário mensal.
- [ ] Bloqueio manual de datas.
- [ ] Validação de conflitos de datas.

---

## Fase 3 — Marketplace público

Status esperado: hóspede encontra e solicita reserva.

- [ ] Home pública.
- [ ] Busca por cidade, datas e hóspedes.
- [ ] Filtros básicos.
- [ ] Cards públicos de propriedades.
- [ ] Página pública da propriedade.
- [ ] Galeria de imagens.
- [ ] Exibição de unidades.
- [ ] Exibição de comodidades.
- [ ] Regras e política de cancelamento.
- [ ] Botão de solicitar reserva.
- [ ] Botão de compartilhar/copiar link.
- [ ] Fluxo de dados do hóspede sem cadastro obrigatório.

---

## Fase 4 — Financeiro

Status esperado: proprietário acompanha dinheiro e operação.

- [ ] Receitas.
- [ ] Despesas.
- [ ] Caixa.
- [ ] Categorias financeiras.
- [ ] Comissão da plataforma.
- [ ] Faturamento por período.
- [ ] Indicadores financeiros.
- [ ] Receita por propriedade.
- [ ] Despesas por propriedade.
- [ ] Exportação futura.

---

## Fase 5 — Check-in, check-out e limpeza

Status esperado: operação diária controlada.

- [ ] Check-in pendente.
- [ ] Check-in confirmado.
- [ ] Hospedado.
- [ ] Check-out realizado.
- [ ] Reserva concluída.
- [ ] Status de limpeza.
- [ ] Aguardando limpeza.
- [ ] Em limpeza.
- [ ] Limpeza finalizada.
- [ ] Histórico de limpeza.
- [ ] Responsável opcional pela limpeza.

---

## Fase 6 — Notificações e experiência

Status esperado: sistema mais vivo e comunicativo.

- [ ] Sino de notificações.
- [ ] Contador de notificações.
- [ ] Popups internos.
- [ ] Notificação de nova reserva.
- [ ] Notificação de cancelamento.
- [ ] Notificação de limpeza.
- [ ] Notificação de licença vencendo.
- [ ] Alternância claro/escuro.
- [ ] Avatar do usuário.
- [ ] Dropdown de perfil.
- [ ] Sidebar retrátil.

---

## Fase 7 — Polimento visual

Status esperado: experiência premium.

- [ ] Design System compartilhado.
- [ ] Componentes glassmorphism.
- [ ] Microinterações com Framer Motion.
- [ ] Skeleton loading padronizado.
- [ ] Empty states bonitos.
- [ ] Cards do marketplace mais ricos.
- [ ] Dashboard visualmente refinado.
- [ ] Modais em vidro.
- [ ] Badges de status.
- [ ] Responsividade avançada.

---

## Fase 8 — Recursos avançados

Status esperado: expansão do produto.

- [ ] Pagamento Pix.
- [ ] Pagamento cartão.
- [ ] Pagamento boleto.
- [ ] WhatsApp automático.
- [ ] Avaliações verificadas.
- [ ] Inventário.
- [ ] Agenda.
- [ ] Locais próximos.
- [ ] Relatórios avançados.
- [ ] Importação/exportação `.ics`.
- [ ] Integrações futuras.

---

## Fase 9 — Futuro

Itens fora do MVP.

- [ ] Aplicativo do hóspede.
- [ ] Aplicativo do proprietário.
- [ ] IA para relatórios.
- [ ] IA para precificação.
- [ ] API pública.
- [ ] Contratos digitais.
- [ ] Assinatura eletrônica.
- [ ] Marketplace de serviços.
- [ ] Integrações completas com Airbnb e Booking.

---

## Prioridade atual recomendada

A prioridade imediata deve ser:

1. Criar proprietário pelo Super Admin.
2. Garantir login e permissões do proprietário.
3. Finalizar propriedades e unidades.
4. Finalizar reservas.
5. Finalizar calendário.
6. Publicar propriedade no marketplace.

Sem esse fluxo, o sistema ainda não é um produto utilizável.
