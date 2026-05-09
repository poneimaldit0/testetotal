import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, BarChart3, Award, AlertCircle } from 'lucide-react';
import type { MetricasGeraisCRM } from '@/types/crm';

interface MetricasCRMCardsProps {
  metricas: MetricasGeraisCRM | null;
  carregando: boolean;
}

export const MetricasCRMCards = ({ metricas, carregando }: MetricasCRMCardsProps) => {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  if (carregando) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metricas) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Não foi possível carregar as métricas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      title: 'Orçamentos Ativos',
      value: (metricas.total_orcamentos_ativos ?? 0).toString(),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: 'Pipeline Total',
      value: formatarMoeda(Number(metricas.valor_total_pipeline ?? 0)),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: 'Ticket Médio',
      value: formatarMoeda(Number(metricas.ticket_medio_geral ?? 0)),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      title: 'Pipeline Ponderado',
      value: formatarMoeda(Number(metricas.pipeline_ponderado_total ?? 0)),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
      subtitle: 'Valor esperado de conversão',
    },
    {
      title: 'Ganhos no Período',
      value: (metricas.total_ganhos ?? 0).toString(),
      icon: Award,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    },
    {
      title: 'Taxa de Conversão',
      value: formatarPercentual(Number(metricas.taxa_conversao_geral ?? 0)),
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-950',
      subtitle: `${metricas.total_ganhos ?? 0} ganhos / ${(metricas.total_ganhos ?? 0) + (metricas.total_perdas ?? 0)} conclusões`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
