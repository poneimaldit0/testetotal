import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';
import { ETAPAS_CRM } from '@/constants/crmEtapas';
import type { DadosForecastCRM } from '@/types/crm';
import { Progress } from '@/components/ui/progress';

interface ForecastCardProps {
  dados: DadosForecastCRM[];
  carregando: boolean;
}

export const ForecastCard = ({ dados, carregando }: ForecastCardProps) => {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const getNomeEtapa = (etapaKey: string) => {
    const etapa = ETAPAS_CRM.find(e => e.valor === etapaKey);
    return etapa?.titulo || etapaKey;
  };

  const getCorEtapa = (etapaKey: string) => {
    const etapa = ETAPAS_CRM.find(e => e.valor === etapaKey);
    // Converter classe Tailwind para código de cor hex
    const colorMap: Record<string, string> = {
      'bg-blue-500': '#3b82f6',
      'bg-yellow-500': '#eab308',
      'bg-orange-500': '#f97316',
      'bg-purple-500': '#a855f7',
      'bg-amber-700': '#b45309',
      'bg-red-500': '#ef4444',
      'bg-gray-500': '#6b7280',
    };
    return colorMap[etapa?.cor || ''] || '#8884d8';
  };

  const totalPipelineBruto = dados.reduce((acc, item) => acc + Number(item.pipeline_bruto), 0);
  const totalPipelinePonderado = dados.reduce((acc, item) => acc + Number(item.pipeline_ponderado), 0);

  if (carregando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast de Vendas</CardTitle>
          <CardDescription>Análise de previsão de receita ponderada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando forecast...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Forecast de Vendas
        </CardTitle>
        <CardDescription>Previsão de receita baseada em probabilidade de conversão por etapa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pipeline Total (Bruto)</span>
            </div>
            <p className="text-2xl font-bold">{formatarMoeda(totalPipelineBruto)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todos os valores estimados
            </p>
          </div>

          <div className="p-4 rounded-lg border border-primary bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Forecast Ponderado</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatarMoeda(totalPipelinePonderado)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Receita esperada (valores × probabilidades)
            </p>
          </div>
        </div>

        {/* Detalhamento por Etapa */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Detalhamento por Etapa</h4>
          {dados.map((item) => {
            const nomeEtapa = getNomeEtapa(item.etapa);
            const cor = getCorEtapa(item.etapa);
            const pipelineBruto = Number(item.pipeline_bruto);
            const pipelinePonderado = Number(item.pipeline_ponderado);
            const probabilidade = Number(item.probabilidade);
            const quantidade = Number(item.quantidade);

            return (
              <div key={item.etapa} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cor }}
                    />
                    <span className="text-sm font-medium">{nomeEtapa}</span>
                    <span className="text-xs text-muted-foreground">
                      ({quantidade} {quantidade === 1 ? 'orçamento' : 'orçamentos'})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatarMoeda(pipelinePonderado)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarMoeda(pipelineBruto)} × {probabilidade}%
                    </p>
                  </div>
                </div>
                <Progress 
                  value={probabilidade} 
                  className="h-2"
                  style={{ 
                    '--progress-background': cor 
                  } as React.CSSProperties}
                />
              </div>
            );
          })}
        </div>

        {/* Explicação */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> Cada etapa tem uma probabilidade de conversão baseada em histórico. 
            O forecast ponderado multiplica o valor do pipeline pela probabilidade, 
            gerando uma previsão mais realista de receita esperada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
