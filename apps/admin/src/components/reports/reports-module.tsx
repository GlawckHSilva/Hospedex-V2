"use client";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  CalendarDays,
  Download,
  FileBarChart,
  FileDown,
  Printer,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";

import { Button, Card, CardContent, FadeIn, Input, Label } from "@hospedex/ui";

import {
  LABEL_STATUS_RESERVA_RELATORIOS,
  STATUS_RESERVA_RELATORIOS,
  type DadosModuloRelatorios
} from "../../lib/reports/types";

/**
 * Modulo visual de Relatorios.
 *
 * A tela apresenta apenas dados reais ja carregados no servidor. A exportacao
 * CSV usa o mesmo payload filtrado para evitar expor dados fora do tenant.
 */

export type ReportsModuleProps = DadosModuloRelatorios;

const campoClasse =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ReportsModule({
  categoriasFinanceiras,
  filtros,
  hospedesRecorrentes,
  lancamentosDetalhados,
  linhasCsv,
  propriedades,
  propriedadesRentaveis,
  reservasDetalhadas,
  reservasPorStatus,
  resumo,
  serieFinanceira,
  servicosExtras,
  tenantNome,
}: ReportsModuleProps) {
  const possuiDados =
    resumo.reservasPeriodo > 0 ||
    resumo.receitaPeriodo > 0 ||
    resumo.despesasPeriodo > 0 ||
    propriedadesRentaveis.length > 0 ||
    servicosExtras.length > 0;
  const periodoFormatado = `${formatarData(filtros.dataInicio)} a ${formatarData(filtros.dataFim)}`;

  return (
    <FadeIn className="reports-page space-y-5">
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #111827 !important;
          }

          .glass-navbar,
          .glass-sidebar,
          .reports-screen,
          .reports-no-print {
            display: none !important;
          }

          .reports-print {
            display: block !important;
          }

          main {
            padding: 0 !important;
          }

          @page {
            margin: 14mm;
            size: A4;
          }
        }
      `}</style>

      <div className="reports-screen space-y-5">
      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Relatórios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Acompanhe receitas, reservas, ocupação e desempenho das propriedades.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button disabled={!possuiDados} onClick={imprimirRelatorio} type="button">
              <FileDown />
              Exportar PDF
            </Button>
            <Button disabled={!possuiDados} onClick={imprimirRelatorio} type="button" variant="outline">
              <Printer />
              Imprimir
            </Button>
            <Button
              disabled={!linhasCsv.length || !possuiDados}
              onClick={() => exportarCsv(linhasCsv, filtros)}
              type="button"
              variant="outline"
            >
              <Download />
              Exportar CSV
            </Button>
          </div>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr_auto]">
            <div className="grid gap-4 md:grid-cols-2 xl:col-span-2">
            <CampoData label="Início" name="dataInicio" value={filtros.dataInicio} />
            <CampoData label="Fim" name="dataFim" value={filtros.dataFim} />
            </div>
            <CampoPropriedade value={filtros.propriedadeId ?? ""} propriedades={propriedades} />
            <div className="grid gap-4 md:grid-cols-3 xl:col-span-3">
              <CampoStatus value={filtros.statusReserva} />
              <CampoCategoria
                categorias={categoriasFinanceiras}
                value={filtros.categoriaFinanceiraId ?? ""}
              />
              <AtalhosPeriodo />
            </div>
            <div className="flex items-end gap-2 xl:col-start-4 xl:row-start-1">
              <Button onClick={limparFiltros} type="button" variant="outline">
                <RotateCcw />
                Limpar filtros
              </Button>
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">
        <span className="font-medium text-cyan-300">Prévia do relatório</span>
        <span className="mx-2 text-muted-foreground">•</span>
        Dados atualizados conforme os filtros selecionados.
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo descricao="Total no período" icon={<TrendingUp />} label="Receita" valor={formatarMoeda(resumo.receitaPeriodo)} />
        <Resumo descricao="Total no período" icon={<TrendingDown />} label="Despesas" valor={formatarMoeda(resumo.despesasPeriodo)} />
        <Resumo descricao="Receita menos despesas" icon={<TrendingUp />} label="Lucro" valor={formatarMoeda(resumo.lucroPeriodo)} />
        <Resumo descricao="Total de reservas" icon={<FileBarChart />} label="Reservas" valor={String(resumo.reservasPeriodo)} />
        <Resumo descricao="Taxa de ocupação" icon={<CalendarDays />} label="Ocupação" valor={`${resumo.taxaOcupacao.toFixed(1)}%`} />
        <Resumo descricao="Por reserva" icon={<WalletCards />} label="Ticket médio" valor={formatarMoeda(resumo.ticketMedio)} />
        <Resumo descricao="Total de hóspedes" icon={<Users />} label="Hóspedes recorrentes" valor={String(resumo.hospedesRecorrentes)} />
        <Resumo descricao="Receita adicional" icon={<FileBarChart />} label="Serviços extras" valor={formatarMoeda(resumo.servicosExtras)} />
      </section>

      {!possuiDados ? (
        <EstadoVazio
          acao={<Button onClick={limparFiltros} type="button" variant="outline">Limpar filtros</Button>}
          mensagem="Altere os filtros ou selecione outro intervalo para gerar o relatório."
          titulo="Nenhum dado encontrado no período"
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <GraficoFinanceiro dados={serieFinanceira} />
          <GraficoStatus dados={reservasPorStatus} total={resumo.reservasPeriodo} />
          <TabelaPropriedades dados={propriedadesRentaveis} />
          <TabelaHospedes dados={hospedesRecorrentes} />
          <TabelaServicosExtras dados={servicosExtras} />
          <DetalhamentoRelatorio
            lancamentos={lancamentosDetalhados}
            reservas={reservasDetalhadas}
            servicos={servicosExtras}
          />
        </div>
      )}
      </div>

      <RelatorioImpressao
        filtros={filtros}
        hospedes={hospedesRecorrentes}
        lancamentos={lancamentosDetalhados}
        periodo={periodoFormatado}
        propriedades={propriedadesRentaveis}
        reservas={reservasDetalhadas}
        resumo={resumo}
        servicos={servicosExtras}
        tenantNome={tenantNome}
      />
    </FadeIn>
  );
}

function GraficoFinanceiro({ dados }: { dados: DadosModuloRelatorios["serieFinanceira"] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Receita, despesas e lucro</h2>
        <div className="mt-4 h-72">
          {dados.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rotulo" tickLine={false} />
                <YAxis tickFormatter={(valor) => formatarNumeroCurto(Number(valor))} width={72} />
                <Tooltip formatter={(valor) => formatarMoeda(Number(valor))} />
                <Line dataKey="receita" name="Receita" stroke="#06b6d4" strokeWidth={2} />
                <Line dataKey="despesas" name="Despesas" stroke="#f97316" strokeWidth={2} />
                <Line dataKey="lucro" name="Lucro" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EstadoVazio mensagem="Sem lancamentos financeiros no periodo." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GraficoStatus({
  dados,
  total
}: {
  dados: DadosModuloRelatorios["reservasPorStatus"];
  total: number;
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Reservas por status</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1fr]">
          {dados.length > 0 ? (
            <>
              <div className="h-60">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie data={dados} dataKey="total" innerRadius={56} nameKey="label" outerRadius={88}>
                      {dados.map((item) => (
                        <Cell fill={item.cor} key={item.status} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor) => `${valor} reserva(s)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {dados.map((item) => (
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 text-sm" key={item.status}>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                      {item.label}
                    </span>
                    <strong>{item.total} ({calcularPercentual(item.total, total)}%)</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EstadoVazio mensagem="Não há reservas para montar o gráfico de status." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TabelaPropriedades({
  dados
}: {
  dados: DadosModuloRelatorios["propriedadesRentaveis"];
}) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Propriedades mais rentaveis</h2>
        {dados.length > 0 ? (
          <div className="mt-4">
            <Tabela
              cabecalho={["#", "Propriedade", "Reservas", "Receita", "Ticket médio"]}
              linhas={dados.map((item) => [
                String(dados.indexOf(item) + 1),
                item.propriedadeNome,
                String(item.reservas),
                formatarMoeda(item.receitaReservas),
                formatarMoeda(item.ticketMedio)
              ])}
            />
          </div>
        ) : (
          <EstadoVazio mensagem="Sem reservas válidas por propriedade no período." />
        )}
      </CardContent>
    </Card>
  );
}

function TabelaHospedes({ dados }: { dados: DadosModuloRelatorios["hospedesRecorrentes"] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Hóspedes recorrentes</h2>
        {dados.length > 0 ? (
          <Tabela
            cabecalho={["Hóspede", "Reservas", "Valor", "Última hospedagem"]}
            linhas={dados.map((item) => [
              item.nome,
              String(item.reservas),
              formatarMoeda(item.valorTotal),
              formatarData(item.ultimaHospedagem)
            ])}
          />
        ) : (
          <EstadoVazio
            mensagem="Não há hóspedes que retornaram no período selecionado."
            titulo="Nenhum hóspede recorrente encontrado."
          />
        )}
      </CardContent>
    </Card>
  );
}

function TabelaServicosExtras({ dados }: { dados: DadosModuloRelatorios["servicosExtras"] }) {
  return (
    <Card className="admin-glass-card xl:col-span-2">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Serviços extras</h2>
        {dados.length > 0 ? (
          <Tabela
            cabecalho={["Serviço", "Quantidade", "Valor total"]}
            linhas={dados.map((item) => [
              item.nome,
              String(item.quantidade),
              formatarMoeda(item.valorTotal)
            ])}
          />
        ) : (
          <EstadoVazio mensagem="Nenhum serviço extra vendido no período." />
        )}
      </CardContent>
    </Card>
  );
}

function DetalhamentoRelatorio({
  lancamentos,
  reservas,
  servicos
}: {
  lancamentos: DadosModuloRelatorios["lancamentosDetalhados"];
  reservas: DadosModuloRelatorios["reservasDetalhadas"];
  servicos: DadosModuloRelatorios["servicosExtras"];
}) {
  return (
    <Card className="admin-glass-card xl:col-span-2">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-base font-semibold">Detalhamento do relatório</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reservas, lançamentos e serviços respeitam os filtros selecionados.
          </p>
        </div>
        <SecaoDetalhe
          cabecalho={["Código", "Hóspede", "Propriedade", "Status", "Pagamento", "Total"]}
          linhas={reservas.map((reserva) => [
            reserva.codigo,
            reserva.hospede,
            reserva.propriedade,
            reserva.status,
            reserva.pagamento,
            formatarMoeda(reserva.total)
          ])}
          titulo="Reservas do período"
          vazio="Nenhuma reserva encontrada no período."
        />
        <SecaoDetalhe
          cabecalho={["Data", "Categoria", "Descrição", "Tipo", "Valor"]}
          linhas={lancamentos.map((lancamento) => [
            formatarData(lancamento.data),
            lancamento.categoria,
            lancamento.descricao,
            lancamento.tipo,
            formatarMoeda(lancamento.valor)
          ])}
          titulo="Lançamentos financeiros"
          vazio="Nenhum lançamento financeiro encontrado no período."
        />
        <SecaoDetalhe
          cabecalho={["Serviço", "Quantidade", "Valor total"]}
          linhas={servicos.map((servico) => [
            servico.nome,
            String(servico.quantidade),
            formatarMoeda(servico.valorTotal)
          ])}
          titulo="Serviços extras"
          vazio="Nenhum serviço extra vendido no período."
        />
      </CardContent>
    </Card>
  );
}

function SecaoDetalhe({
  cabecalho,
  linhas,
  titulo,
  vazio
}: {
  cabecalho: string[];
  linhas: string[][];
  titulo: string;
  vazio: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {linhas.length > 0 ? <Tabela cabecalho={cabecalho} linhas={linhas} /> : <EstadoVazio mensagem={vazio} />}
    </section>
  );
}

function Resumo({
  descricao,
  icon,
  label,
  valor
}: {
  descricao: string;
  icon?: ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border bg-background/55 p-4 text-sm">
      {icon ? <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div> : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
    </div>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted/45 text-xs uppercase text-muted-foreground">
          <tr>
            {cabecalho.map((titulo) => (
              <th className="px-3 py-2 font-medium" key={titulo}>
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr className="border-t" key={`${linha[0]}-${indice}`}>
              {linha.map((valor, coluna) => (
                <td className="px-3 py-3" key={`${valor}-${coluna}`}>
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstadoVazio({
  acao,
  mensagem,
  titulo
}: {
  acao?: ReactNode;
  mensagem: string;
  titulo?: string;
}) {
  return (
    <div className="rounded-lg border bg-background/55 p-5 text-sm text-muted-foreground">
      {titulo ? <p className="mb-1 font-semibold text-foreground">{titulo}</p> : null}
      <p>{mensagem}</p>
      {acao ? <div className="mt-3">{acao}</div> : null}
    </div>
  );
}

function CampoData({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={value} id={name} name={name} required type="date" />
    </div>
  );
}

function CampoPropriedade({
  propriedades,
  value
}: {
  propriedades: Array<{ id: string; name: string }>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="propriedadeId">Propriedade</Label>
      <select className={campoClasse} defaultValue={value} id="propriedadeId" name="propriedadeId">
        <option value="">Todas</option>
        {propriedades.map((propriedade) => (
          <option key={propriedade.id} value={propriedade.id}>
            {propriedade.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoStatus({ value }: { value: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="statusReserva">Status</Label>
      <select className={campoClasse} defaultValue={value} id="statusReserva" name="statusReserva">
        <option value="todos">Todos</option>
        {STATUS_RESERVA_RELATORIOS.map((status) => (
          <option key={status} value={status}>
            {LABEL_STATUS_RESERVA_RELATORIOS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoCategoria({
  categorias,
  value
}: {
  categorias: Array<{ id: string; kind: string; name: string }>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="categoriaFinanceiraId">Categoria</Label>
      <select
        className={campoClasse}
        defaultValue={value}
        id="categoriaFinanceiraId"
        name="categoriaFinanceiraId"
      >
        <option value="">Todas</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.kind === "income" ? "Receita" : "Despesa"} - {categoria.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function AtalhosPeriodo() {
  const atalhos = [
    { label: "Hoje", intervalo: calcularAtalhoPeriodo("hoje") },
    { label: "Esta semana", intervalo: calcularAtalhoPeriodo("semana") },
    { label: "Este mês", intervalo: calcularAtalhoPeriodo("mes") },
    { label: "Últimos 30 dias", intervalo: calcularAtalhoPeriodo("30dias") }
  ];

  return (
    <div className="grid gap-2">
      <Label>Período rápido</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {atalhos.map((atalho) => (
          <Button
            key={atalho.label}
            onClick={() => aplicarPeriodo(atalho.intervalo.dataInicio, atalho.intervalo.dataFim)}
            size="sm"
            type="button"
            variant="outline"
          >
            {atalho.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RelatorioImpressao({
  filtros,
  hospedes,
  lancamentos,
  periodo,
  propriedades,
  reservas,
  resumo,
  servicos,
  tenantNome
}: {
  filtros: DadosModuloRelatorios["filtros"];
  hospedes: DadosModuloRelatorios["hospedesRecorrentes"];
  lancamentos: DadosModuloRelatorios["lancamentosDetalhados"];
  periodo: string;
  propriedades: DadosModuloRelatorios["propriedadesRentaveis"];
  reservas: DadosModuloRelatorios["reservasDetalhadas"];
  resumo: DadosModuloRelatorios["resumo"];
  servicos: DadosModuloRelatorios["servicosExtras"];
  tenantNome: string;
}) {
  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date());

  return (
    <section className="reports-print hidden bg-white p-8 text-black">
      <header className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xl font-bold">Hospedex</p>
          <h1 className="mt-4 text-2xl font-bold">Relatório gerencial</h1>
          <p className="mt-2 text-sm">Proprietário: {tenantNome}</p>
          <p className="text-sm">Período: {periodo}</p>
        </div>
        <p className="text-right text-xs text-slate-600">Data de geração<br />{geradoEm}</p>
      </header>

      <TabelaImpressao
        cabecalho={["Receita", "Despesas", "Lucro", "Reservas", "Ocupação", "Ticket médio"]}
        linhas={[[
          formatarMoeda(resumo.receitaPeriodo),
          formatarMoeda(resumo.despesasPeriodo),
          formatarMoeda(resumo.lucroPeriodo),
          String(resumo.reservasPeriodo),
          `${resumo.taxaOcupacao.toFixed(1)}%`,
          formatarMoeda(resumo.ticketMedio)
        ]]}
        titulo="Resumo"
      />
      <TabelaImpressao
        cabecalho={["Código", "Hóspede", "Propriedade", "Status", "Pagamento", "Total"]}
        linhas={reservas.map((reserva) => [
          reserva.codigo,
          reserva.hospede,
          reserva.propriedade,
          reserva.status,
          reserva.pagamento,
          formatarMoeda(reserva.total)
        ])}
        titulo="Reservas do período"
      />
      <TabelaImpressao
        cabecalho={["Data", "Categoria", "Descrição", "Tipo", "Valor"]}
        linhas={lancamentos.map((lancamento) => [
          formatarData(lancamento.data),
          lancamento.categoria,
          lancamento.descricao,
          lancamento.tipo,
          formatarMoeda(lancamento.valor)
        ])}
        titulo="Lançamentos financeiros"
      />
      <TabelaImpressao
        cabecalho={["Propriedade", "Reservas", "Receita", "Ticket médio"]}
        linhas={propriedades.map((propriedade) => [
          propriedade.propriedadeNome,
          String(propriedade.reservas),
          formatarMoeda(propriedade.receitaReservas),
          formatarMoeda(propriedade.ticketMedio)
        ])}
        titulo="Propriedades mais rentáveis"
      />
      <TabelaImpressao
        cabecalho={["Hóspede", "Reservas", "Receita", "Última hospedagem"]}
        linhas={hospedes.map((hospede) => [
          hospede.nome,
          String(hospede.reservas),
          formatarMoeda(hospede.valorTotal),
          formatarData(hospede.ultimaHospedagem)
        ])}
        titulo="Hóspedes recorrentes"
      />
      <TabelaImpressao
        cabecalho={["Serviço", "Quantidade", "Valor total"]}
        linhas={servicos.map((servico) => [
          servico.nome,
          String(servico.quantidade),
          formatarMoeda(servico.valorTotal)
        ])}
        titulo="Serviços extras"
      />
      <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-600">
        Gerado pelo Hospedex em {geradoEm}. Filtros: {filtros.statusReserva === "todos" ? "todos os status" : LABEL_STATUS_RESERVA_RELATORIOS[filtros.statusReserva]}.
      </footer>
    </section>
  );
}

function TabelaImpressao({
  cabecalho,
  linhas,
  titulo
}: {
  cabecalho: string[];
  linhas: string[][];
  titulo: string;
}) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="mb-2 text-base font-bold">{titulo}</h2>
      {linhas.length > 0 ? (
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {cabecalho.map((item) => (
                <th className="border border-slate-200 bg-slate-100 px-2 py-2" key={item}>
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <tr key={`${titulo}-${indice}`}>
                {linha.map((valor, coluna) => (
                  <td className="border border-slate-200 px-2 py-2" key={`${valor}-${coluna}`}>
                    {valor}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded border border-slate-200 p-3 text-sm text-slate-600">
          Nenhum dado encontrado para esta seção.
        </p>
      )}
    </section>
  );
}

function exportarCsv(linhas: string[][], filtros: DadosModuloRelatorios["filtros"]) {
  if (linhas.length <= 1) {
    window.alert("Nenhum dado encontrado para exportar.");
    return;
  }

  const conteudo = linhas.map((linha) => linha.map(escaparCsv).join(",")).join("\n");
  const blob = new Blob([`\ufeff${conteudo}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-hospedex-${filtros.dataInicio}-a-${filtros.dataFim}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function imprimirRelatorio() {
  window.print();
}

function aplicarPeriodo(dataInicio: string, dataFim: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("dataInicio", dataInicio);
  params.set("dataFim", dataFim);
  window.location.assign(`/relatorios?${params.toString()}`);
}

function limparFiltros() {
  window.location.assign("/relatorios");
}

function calcularAtalhoPeriodo(tipo: "hoje" | "semana" | "mes" | "30dias") {
  const hoje = criarDataLocal(new Date());
  const data = new Date(`${hoje}T00:00:00`);

  if (tipo === "hoje") return { dataFim: hoje, dataInicio: hoje };
  if (tipo === "30dias") return { dataFim: hoje, dataInicio: formatarDataInput(adicionarDias(data, -29)) };
  if (tipo === "mes") {
    return {
      dataFim: hoje,
      dataInicio: formatarDataInput(new Date(data.getFullYear(), data.getMonth(), 1))
    };
  }

  const diaSemana = data.getDay();
  const inicioSemana = adicionarDias(data, diaSemana === 0 ? -6 : 1 - diaSemana);
  return { dataFim: hoje, dataInicio: formatarDataInput(inicioSemana) };
}

function adicionarDias(data: Date, dias: number) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function criarDataLocal(data: Date) {
  return formatarDataInput(new Date(data.getFullYear(), data.getMonth(), data.getDate()));
}

function formatarDataInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function escaparCsv(valor: string) {
  return `"${valor.replaceAll("\"", "\"\"")}"`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(valor);
}

function formatarNumeroCurto(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
    notation: "compact"
  }).format(valor);
}

function formatarData(valor: string) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${valor}T00:00:00Z`));
}

function calcularPercentual(valor: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((valor / total) * 100);
}
