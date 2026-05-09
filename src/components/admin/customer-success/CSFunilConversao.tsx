import { CSRitualSemanal } from '@/types/customerSuccess';
import { obterFunilConversao } from '@/utils/calcularMetricasCS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown } from 'lucide-react';

interface CSFunilConversaoProps {
  rituais: CSRitualSemanal[];
}

export function CSFunilConversao({ rituais }: CSFunilConversaoProps) {
  const funil = obterFunilConversao(rituais);
  const maxValor = Math.max(funil.inscricoes, 1);

  const getCorConversao = (taxa: number) => {
    if (taxa >= 50) return 'text-green-600 dark:text-green-400';
    if (taxa >= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const etapas = [
    { label: 'Inscrições', valor: funil.inscricoes, taxa: null },
    { label: 'Visitas', valor: funil.visitas, taxa: funil.taxaInscricoesVisitas },
    { label: 'Orçamentos', valor: funil.orcamentos, taxa: funil.taxaVisitasOrcamentos },
    { label: 'Contratos', valor: funil.contratos, taxa: funil.taxaOrcamentosContratos },
  ];

  if (funil.inscricoes === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum dado disponível ainda. Complete rituais semanais para ver o funil.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📊 Funil de Conversão (Acumulado)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {etapas.map((etapa, index) => (
          <div key={etapa.label}>
            {etapa.taxa !== null && (
              <div className="flex items-center justify-center gap-2 py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${getCorConversao(etapa.taxa)}`}>
                  {etapa.taxa.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div 
                className="h-8 bg-primary/80 rounded transition-all flex items-center justify-end pr-2"
                style={{ width: `${Math.max((etapa.valor / maxValor) * 100, 10)}%` }}
              >
                <span className="text-xs font-bold text-primary-foreground">
                  {etapa.valor}
                </span>
              </div>
              <span className="text-sm font-medium whitespace-nowrap">{etapa.label}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
