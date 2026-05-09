import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabelaDRE } from './relatorios/TabelaDRE';
import { GraficosDRE } from './relatorios/GraficosDRE';
import { ComparativoDRE } from './relatorios/ComparativoDRE';
import { RelatorioFluxoCaixaComponent } from './relatorios/RelatorioFluxoCaixa';
import { FiltrosPeriodoDRE } from './relatorios/FiltrosPeriodoDRE';
import { MetricasAvancadasDRE } from './relatorios/MetricasAvancadasDRE';
import { AnaliseVencimentosDRE } from './relatorios/AnaliseVencimentosDRE';
import { DetalhamentoCategoriasDRE } from './relatorios/DetalhamentoCategoriasDRE';
import { GraficosAvancadosDRE } from './relatorios/GraficosAvancadosDRE';
import { RelatorioComparativoMensal } from './relatorios/RelatorioComparativoMensal';
import { RelatorioConsolidado } from './RelatorioConsolidado';
import { useDRE, type DadosDRE } from '@/hooks/useDRE';

export const RelatoriosDRE = () => {
  const [dadosDRE, setDadosDRE] = useState<DadosDRE | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });
  const { loading, buscarDadosDRE } = useDRE();

  const carregarDRE = async (inicio: string, fim: string) => {
    const dados = await buscarDadosDRE(inicio, fim);
    if (dados) {
      setDadosDRE(dados);
      setPeriodoSelecionado({ inicio, fim });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
          <p className="text-muted-foreground">
            Análise detalhada das receitas, despesas e fluxo de caixa
          </p>
        </div>
      </div>

      <Tabs defaultValue="consolidado" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10">
          <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
          <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="graficos-avancados">Gráficos Avançados</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="mensal">Comparativo Mensal</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="consolidado" className="space-y-4">
          <RelatorioConsolidado />
        </TabsContent>

        <TabsContent value="dre" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <TabelaDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar o DRE
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="metricas" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <MetricasAvancadasDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar as métricas avançadas
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="detalhamento" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <DetalhamentoCategoriasDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar o detalhamento por categorias
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="vencimentos" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <AnaliseVencimentosDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar a análise de vencimentos
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="graficos" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <GraficosDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar os gráficos
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="graficos-avancados" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <GraficosAvancadosDRE dados={dadosDRE} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar os gráficos avançados
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="comparativo" className="space-y-4">
          <FiltrosPeriodoDRE onPeriodoChange={carregarDRE} loading={loading} />
          {dadosDRE ? (
            <ComparativoDRE dadosAtuais={dadosDRE} periodo={periodoSelecionado} />
          ) : !loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Selecione um período para visualizar o comparativo
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="mensal" className="space-y-4">
          <RelatorioComparativoMensal />
        </TabsContent>

        <TabsContent value="fluxo" className="space-y-4">
          <RelatorioFluxoCaixaComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
};