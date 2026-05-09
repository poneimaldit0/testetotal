import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useFinanceiroSync } from '@/hooks/useFinanceiroSync';
import type { DashboardFinanceiro } from '@/types/financeiro';
import { PERIODOS_DASHBOARD } from '@/types/financeiro';
import { ContasReceberTab } from './financeiro/ContasReceberTab';
import { ContasPagarTab } from './financeiro/ContasPagarTab';
import { AlertasVencimento } from './financeiro/AlertasVencimento';
import { GraficosFinanceiro } from './financeiro/GraficosFinanceiro';
import { ConfiguracoesFinanceiras } from './financeiro/ConfiguracoesFinanceiras';
import { RelatoriosDRE } from './financeiro/RelatoriosDRE';
import { ConciliacaoBancaria } from './financeiro/ConciliacaoBancaria';

export const FinanceiroDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(30); // Default: 30 dias
  const [activeTab, setActiveTab] = useState('overview'); // Controle de aba ativa
  const { buscarDashboard } = useFinanceiro();
  const { lastUpdate, triggerGlobalUpdate } = useFinanceiroSync();

  useEffect(() => {
    carregarDashboard();
  }, [periodoSelecionado]);

  // Recarregar dashboard quando houver atualizações globais (ex: conciliação bancária)
  useEffect(() => {
    if (lastUpdate && !loading) {
      carregarDashboard();
    }
  }, [lastUpdate]);

  const carregarDashboard = async () => {
    setLoading(true);
    const data = await buscarDashboard(periodoSelecionado);
    setDashboard(data);
    setLoading(false);
  };

  const handlePeriodoChange = (valor: string) => {
    setPeriodoSelecionado(Number(valor));
  };

  const obterLabelPeriodo = (dias: number) => {
    const periodo = PERIODOS_DASHBOARD.find(p => p.valor === dias);
    return periodo ? periodo.label : `Próximos ${dias} dias`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-muted-foreground">Carregando dashboard financeiro...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas de Vencimento */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Alertas de Vencimento</h2>
        <AlertasVencimento dashboard={dashboard} onDashboardUpdate={carregarDashboard} />
      </div>

      {/* Cards do Dashboard Resumo */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold">Resumo Financeiro</h2>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodoSelecionado.toString()} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS_DASHBOARD.map((periodo) => (
                  <SelectItem key={periodo.valor} value={periodo.valor.toString()}>
                    {periodo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboard.totalReceber)}
              </div>
              <p className="text-xs text-muted-foreground">
                {obterLabelPeriodo(dashboard.periodoSelecionado).toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(dashboard.totalPagar)}
              </div>
              <p className="text-xs text-muted-foreground">
                {obterLabelPeriodo(dashboard.periodoSelecionado).toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fluxo de Caixa</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboard.fluxoCaixa >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dashboard.fluxoCaixa)}
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo para o período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas vs Despesas</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm text-green-600">
                  ↗ {formatCurrency(dashboard.receitasPeriodo)}
                </div>
                <div className="text-sm text-red-600">
                  ↘ {formatCurrency(dashboard.despesasPeriodo)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Movimento do período
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="contas-receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="contas-pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <GraficosFinanceiro dashboard={dashboard} />
        </TabsContent>
        
        <TabsContent value="contas-receber" className="space-y-4">
          <ContasReceberTab onUpdate={triggerGlobalUpdate} />
        </TabsContent>
        
        <TabsContent value="contas-pagar" className="space-y-4">
          <ContasPagarTab onUpdate={triggerGlobalUpdate} />
        </TabsContent>

        <TabsContent value="conciliacao" className="space-y-6">
          <ConciliacaoBancaria />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-6">
          <RelatoriosDRE />
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <ConfiguracoesFinanceiras />
        </TabsContent>
      </Tabs>
    </div>
  );
};