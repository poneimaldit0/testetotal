import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProdutividadeChecklist } from "@/hooks/useProdutividadeChecklist";
import { ConfigurarMetasChecklistModal } from "./produtividade/ConfigurarMetasChecklistModal";
import { DetalhesAtividadesConciergeModal } from "./produtividade/DetalhesAtividadesConciergeModal";
import { FiltrosPeriodoProdutividade } from "./produtividade/FiltrosPeriodoProdutividade";
import { useState } from "react";
import { 
  ClipboardCheck, 
  TrendingUp, 
  Target,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  CalendarDays
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CORES_LINHAS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function DashboardProdutividadeChecklist() {
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const inicioDefault = format(subDays(new Date(), 13), 'yyyy-MM-dd');
  
  const [dataInicio, setDataInicio] = useState<string>(inicioDefault);
  const [dataFim, setDataFim] = useState<string>(hoje);
  const [tipoCrm, setTipoCrm] = useState<'orcamentos' | 'marcenaria' | undefined>();
  const [modalMetasOpen, setModalMetasOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [conciergeDetalhes, setConciergeDetalhes] = useState<{ id: string; nome: string } | null>(null);

  const {
    produtividadePorConcierge,
    evolucaoDiaria,
    totaisGerais,
    isLoading,
    salvarMeta,
    isSaving
  } = useProdutividadeChecklist({ dataInicio, dataFim }, tipoCrm);

  const handlePeriodoChange = (inicio: string, fim: string) => {
    setDataInicio(inicio);
    setDataFim(fim);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      acima: <Badge className="bg-emerald-500 hover:bg-emerald-600">🟢 Acima</Badge>,
      ok: <Badge className="bg-green-500 hover:bg-green-600">🟢 OK</Badge>,
      medio: <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Médio</Badge>,
      baixo: <Badge variant="destructive">🔴 Baixo</Badge>
    };
    return badges[status as keyof typeof badges] || badges.baixo;
  };

  const getProgressColor = (percentual: number) => {
    if (percentual >= 100) return "[&>div]:bg-emerald-500";
    if (percentual >= 80) return "[&>div]:bg-green-500";
    if (percentual >= 50) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Produtividade de Checklist
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento diário de itens de checklist concluídos pela equipe
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            📅 Período: {format(new Date(dataInicio), "dd/MM/yyyy")} até {format(new Date(dataFim), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <FiltrosPeriodoProdutividade
              dataInicio={dataInicio}
              dataFim={dataFim}
              onPeriodoChange={handlePeriodoChange}
            />
            <Select
              value={tipoCrm || "todos"}
              onValueChange={(v) => setTipoCrm(v === "todos" ? undefined : v as any)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os CRMs</SelectItem>
                <SelectItem value="orcamentos">CRM Orçamentos</SelectItem>
                <SelectItem value="marcenaria">CRM Marcenaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Período</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisGerais.totalPeriodo}</div>
            <p className="text-xs text-muted-foreground">
              itens concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisGerais.totalHoje}</div>
            <p className="text-xs text-muted-foreground">
              itens hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisGerais.mediaDiaria.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              itens/dia por pessoa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Meta Período</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisGerais.percentualMetaPeriodo.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totaisGerais.totalPeriodo} / {totaisGerais.metaTotalPeriodo} itens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Métricas por Período */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Semanal (7d)</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisGerais.percentualMetaSemanal.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {totaisGerais.total7Dias} / {totaisGerais.metaTotalSemanal} itens
            </p>
            <Progress 
              value={Math.min(totaisGerais.percentualMetaSemanal, 100)} 
              className={`h-2 ${getProgressColor(totaisGerais.percentualMetaSemanal)}`}
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Quinzenal (15d)</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisGerais.percentualMetaQuinzenal.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {totaisGerais.total15Dias} / {totaisGerais.metaTotalQuinzenal} itens
            </p>
            <Progress 
              value={Math.min(totaisGerais.percentualMetaQuinzenal, 100)} 
              className={`h-2 ${getProgressColor(totaisGerais.percentualMetaQuinzenal)}`}
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Mensal (30d)</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totaisGerais.percentualMetaMensal.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {totaisGerais.total30Dias} / {totaisGerais.metaTotalMensal} itens
            </p>
            <Progress 
              value={Math.min(totaisGerais.percentualMetaMensal, 100)} 
              className={`h-2 ${getProgressColor(totaisGerais.percentualMetaMensal)}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Produtividade */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              👤 Produtividade por Concierge
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalMetasOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Metas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-center p-2 font-medium">Clientes</th>
                  <th className="text-center p-2 font-medium">Taxa</th>
                  <th className="text-center p-2 font-medium">Meta/dia</th>
                  <th className="text-center p-2 font-medium">Período</th>
                  <th className="text-center p-2 font-medium">7d</th>
                  <th className="text-center p-2 font-medium">15d</th>
                  <th className="text-center p-2 font-medium">30d</th>
                  <th className="text-left p-2 font-medium">% Período</th>
                  <th className="text-center p-2 font-medium">Status</th>
                  <th className="text-center p-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtividadePorConcierge.map((concierge) => (
                  <tr 
                    key={concierge.usuarioId} 
                    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setConciergeDetalhes({ id: concierge.usuarioId, nome: concierge.nome });
                      setDetalhesModalOpen(true);
                    }}
                  >
                    <td className="p-2 font-medium">{concierge.nome}</td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                        {concierge.clientesCarteira}
                      </Badge>
                    </td>
                    <td className="text-center p-2 text-sm text-muted-foreground">
                      {(concierge.taxaProdutividade * 100).toFixed(0)}%
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="secondary">{concierge.metaDiaria}</Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-green-500/10 font-semibold">{concierge.itensPeriodo}</Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-blue-500/10">{concierge.itens7Dias}</Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-purple-500/10">{concierge.itens15Dias}</Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-amber-500/10">{concierge.itens30Dias}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(concierge.percentualMetaPeriodo, 100)} 
                          className={`h-2 flex-1 ${getProgressColor(concierge.percentualMetaPeriodo)}`}
                        />
                        <span className="text-sm font-medium min-w-[45px]">
                          {concierge.percentualMetaPeriodo.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      {getStatusBadge(concierge.status)}
                    </td>
                    <td className="text-center p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConciergeDetalhes({ id: concierge.usuarioId, nome: concierge.nome });
                          setDetalhesModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {produtividadePorConcierge.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum dado de produtividade encontrado para o período selecionado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Evolução Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={evolucaoDiaria}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="data" 
                tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value as string), "dd 'de' MMMM", { locale: ptBR })}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {produtividadePorConcierge.map((concierge, index) => (
                <Line
                  key={concierge.usuarioId}
                  type="monotone"
                  dataKey={concierge.nome}
                  stroke={CORES_LINHAS[index % CORES_LINHAS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Modal de Configuração de Metas */}
      <ConfigurarMetasChecklistModal
        open={modalMetasOpen}
        onOpenChange={setModalMetasOpen}
        concierges={produtividadePorConcierge.map(c => ({
          usuarioId: c.usuarioId,
          nome: c.nome,
          metaDiaria: c.metaDiaria,
          clientesCarteira: c.clientesCarteira,
          taxaProdutividade: c.taxaProdutividade,
          nivelConcierge: c.nivelConcierge
        }))}
        onSalvarMeta={(usuarioId, nivelConcierge, taxaProdutividade) => 
          salvarMeta({ usuarioId, nivelConcierge, taxaProdutividade })
        }
        isSaving={isSaving}
      />

      {/* Modal de Detalhes de Atividades */}
      <DetalhesAtividadesConciergeModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        usuarioId={conciergeDetalhes?.id || null}
        nomeUsuario={conciergeDetalhes?.nome || ''}
        dataInicio={dataInicio}
        dataFim={dataFim}
        tipoCrm={tipoCrm}
      />
    </div>
  );
}
