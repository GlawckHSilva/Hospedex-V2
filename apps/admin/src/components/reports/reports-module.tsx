"use client";

import {
  Bar,
  BarChart,
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
import { Download, FileBarChart, Search, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, FadeIn, Input, Label } from "@hospedex/ui";

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
  linhasCsv,
  propriedades,
  propriedadesRentaveis,
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

  return (
    <FadeIn className="space-y-5">
      <section className="admin-glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="info">Relatorios gerenciais</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">Relatorios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tenantNome} - PDF e Excel ficam preparados para a proxima etapa.
            </p>
          </div>

          <Button
            disabled={!linhasCsv.length}
            onClick={() => exportarCsv(linhasCsv)}
            type="button"
            variant="outline"
          >
            <Download />
            Exportar CSV
          </Button>
        </div>
      </section>

      <Card className="admin-glass-card">
        <CardContent className="p-5">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_0.8fr_1fr_1fr_1fr_auto]">
            <CampoData label="Inicio" name="dataInicio" value={filtros.dataInicio} />
            <CampoData label="Fim" name="dataFim" value={filtros.dataFim} />
            <CampoPropriedade value={filtros.propriedadeId ?? ""} propriedades={propriedades} />
            <CampoStatus value={filtros.statusReserva} />
            <CampoCategoria
              categorias={categoriasFinanceiras}
              value={filtros.categoriaFinanceiraId ?? ""}
            />
            <div className="flex items-end">
              <Button className="w-full" type="submit" variant="outline">
                <Search />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo icon={<TrendingUp />} label="Receita" valor={formatarMoeda(resumo.receitaPeriodo)} />
        <Resumo label="Despesas" valor={formatarMoeda(resumo.despesasPeriodo)} />
        <Resumo label="Lucro" valor={formatarMoeda(resumo.lucroPeriodo)} />
        <Resumo icon={<FileBarChart />} label="Reservas" valor={String(resumo.reservasPeriodo)} />
        <Resumo label="Ocupacao" valor={`${resumo.taxaOcupacao.toFixed(1)}%`} />
        <Resumo label="Ticket medio" valor={formatarMoeda(resumo.ticketMedio)} />
        <Resumo icon={<Users />} label="Hospedes recorrentes" valor={String(resumo.hospedesRecorrentes)} />
        <Resumo label="Servicos extras" valor={String(resumo.servicosExtras)} />
      </section>

      {!possuiDados ? (
        <EstadoVazio mensagem="Nenhum dado encontrado para os filtros selecionados." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <GraficoFinanceiro dados={serieFinanceira} />
          <GraficoStatus dados={reservasPorStatus} />
          <TabelaPropriedades dados={propriedadesRentaveis} />
          <TabelaHospedes dados={hospedesRecorrentes} />
          <TabelaServicosExtras dados={servicosExtras} />
        </div>
      )}
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

function GraficoStatus({ dados }: { dados: DadosModuloRelatorios["reservasPorStatus"] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Reservas por status</h2>
        <div className="mt-4 h-72">
          {dados.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={dados} dataKey="total" innerRadius={62} nameKey="label" outerRadius={96}>
                  {dados.map((item) => (
                    <Cell fill={item.cor} key={item.status} />
                  ))}
                </Pie>
                <Tooltip formatter={(valor) => `${valor} reserva(s)`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EstadoVazio mensagem="Sem reservas para montar grafico de status." />
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {dados.map((item) => (
            <Badge key={item.status} variant="outline">
              {item.label}: {item.total}
            </Badge>
          ))}
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
          <>
            <div className="mt-4 h-56">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="propriedadeNome" tick={false} />
                  <YAxis tickFormatter={(valor) => formatarNumeroCurto(Number(valor))} width={72} />
                  <Tooltip formatter={(valor) => formatarMoeda(Number(valor))} />
                  <Bar dataKey="receitaReservas" fill="#06b6d4" name="Receita em reservas" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Tabela
              cabecalho={["Propriedade", "Reservas", "Receita", "Ticket"]}
              linhas={dados.map((item) => [
                item.propriedadeNome,
                String(item.reservas),
                formatarMoeda(item.receitaReservas),
                formatarMoeda(item.ticketMedio)
              ])}
            />
          </>
        ) : (
          <EstadoVazio mensagem="Sem reservas validas por propriedade no periodo." />
        )}
      </CardContent>
    </Card>
  );
}

function TabelaHospedes({ dados }: { dados: DadosModuloRelatorios["hospedesRecorrentes"] }) {
  return (
    <Card className="admin-glass-card">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Hospedes recorrentes</h2>
        {dados.length > 0 ? (
          <Tabela
            cabecalho={["Hospede", "Reservas", "Valor", "Ultima hospedagem"]}
            linhas={dados.map((item) => [
              item.nome,
              String(item.reservas),
              formatarMoeda(item.valorTotal),
              formatarData(item.ultimaHospedagem)
            ])}
          />
        ) : (
          <EstadoVazio mensagem="Nenhum hospede recorrente encontrado." />
        )}
      </CardContent>
    </Card>
  );
}

function TabelaServicosExtras({ dados }: { dados: DadosModuloRelatorios["servicosExtras"] }) {
  return (
    <Card className="admin-glass-card xl:col-span-2">
      <CardContent className="p-5">
        <h2 className="text-base font-semibold">Servicos extras</h2>
        {dados.length > 0 ? (
          <Tabela
            cabecalho={["Servico", "Quantidade", "Valor total"]}
            linhas={dados.map((item) => [
              item.nome,
              String(item.quantidade),
              formatarMoeda(item.valorTotal)
            ])}
          />
        ) : (
          <EstadoVazio mensagem="A estrutura existe, mas nao ha servicos extras ativos no periodo." />
        )}
      </CardContent>
    </Card>
  );
}

function Resumo({ icon, label, valor }: { icon?: ReactNode; label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-4 text-sm">
      {icon ? <div className="mb-2 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div> : null}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{valor}</p>
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

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-5 text-sm text-muted-foreground">
      {mensagem}
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

function exportarCsv(linhas: string[][]) {
  const conteudo = linhas.map((linha) => linha.map(escaparCsv).join(",")).join("\n");
  const blob = new Blob([`\ufeff${conteudo}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorios-hospedex.csv";
  link.click();
  URL.revokeObjectURL(url);
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
