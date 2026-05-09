import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEtapasConfig } from '@/hooks/useEtapasConfig';

interface DadosFunilAcumulado {
  etapa: string;
  quantidade_passou: number;
  percentual_total: number;
  taxa_conversao_proxima: number | null;
  ordem: number;
}

interface FunilAcumuladoCRMChartProps {
  dados: DadosFunilAcumulado[];
  carregando: boolean;
}

export const FunilAcumuladoCRMChart = ({ dados, carregando }: FunilAcumuladoCRMChartProps) => {
  const { etapas: etapasConfig, isLoading: carregandoEtapas } = useEtapasConfig('orcamentos');

  const getNomeEtapa = (etapaKey: string) => {
    const etapa = etapasConfig.find(e => e.valor === etapaKey);
    return etapa?.titulo || etapaKey;
  };

  const getCorEtapa = (etapaKey: string) => {
    const etapa = etapasConfig.find(e => e.valor === etapaKey);
    if (!etapa) return '#10b981';
    
    const colorMap: Record<string, string> = {
      'bg-blue-500': '#3b82f6',
      'bg-yellow-500': '#eab308',
      'bg-orange-500': '#f97316',
      'bg-purple-500': '#a855f7',
      'bg-amber-700': '#b45309',
      'bg-red-500': '#ef4444',
      'bg-gray-500': '#6b7280',
      'bg-green-600': '#16a34a',
      'bg-red-600': '#dc2626',
      'bg-indigo-500': '#6366f1',
      'bg-green-500': '#22c55e',
      'bg-teal-500': '#14b8a6',
      'bg-emerald-600': '#059669',
    };
    return colorMap[etapa.cor] || '#10b981';
  };

  const dadosFormatados = dados.map(item => ({
    etapa: getNomeEtapa(item.etapa),
    quantidade: Number(item.quantidade_passou),
    percentual: Number(item.percentual_total),
    taxa_conversao: item.taxa_conversao_proxima ? Number(item.taxa_conversao_proxima) : null,
    cor: getCorEtapa(item.etapa),
  }));

  if (carregando || carregandoEtapas) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil Acumulado - Jornada Completa dos Leads</CardTitle>
          <CardDescription>Quantos leads já passaram por cada etapa do CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalLeads = dadosFormatados.length > 0 ? dadosFormatados[0].quantidade : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Funil Acumulado - Jornada Completa dos Leads
            </CardTitle>
            <CardDescription>
              Mostra quantos leads únicos já passaram por cada etapa do CRM (histórico completo)
            </CardDescription>
          </div>
          {totalLeads > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{totalLeads}</div>
              <div className="text-xs text-muted-foreground">Total de Leads</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Análise por Cohort de Entrada</AlertTitle>
          <AlertDescription>
            Este funil mostra a jornada completa dos leads que <strong>entraram no CRM</strong> durante 
            o período filtrado, incluindo todas as suas movimentações subsequentes (mesmo fora do período). 
            Ideal para analisar o desempenho de leads por mês de captação.
          </AlertDescription>
        </Alert>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dadosFormatados} margin={{ top: 20, right: 30, left: 20, bottom: 80 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis 
              dataKey="etapa" 
              type="category"
              width={180}
              className="text-xs"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold mb-2">{data.etapa}</p>
                    <p className="text-sm">Leads que passaram: <strong>{data.quantidade}</strong></p>
                    <p className="text-sm">% do Total Inicial: <strong>{data.percentual.toFixed(1)}%</strong></p>
                    {data.taxa_conversao !== null && (
                      <p className="text-sm text-orange-600">
                        Conversão p/ próxima: <strong>{data.taxa_conversao.toFixed(1)}%</strong>
                      </p>
                    )}
                    {data.taxa_conversao !== null && data.taxa_conversao < 50 && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Gargalo detectado
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="quantidade" name="Leads que Passaram" radius={[0, 8, 8, 0]}>
              {dadosFormatados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela de Conversão Acumulada */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">Etapa</th>
                <th className="text-right py-2">Leads Passaram</th>
                <th className="text-right py-2">% do Total Inicial</th>
                <th className="text-right py-2">Conversão p/ Próxima</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {dadosFormatados.map((item, index) => {
                const isGargalo = item.taxa_conversao !== null && item.taxa_conversao < 50;
                return (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.cor }}
                        />
                        <span>{item.etapa}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium">{item.quantidade}</td>
                    <td className="text-right">{item.percentual.toFixed(1)}%</td>
                    <td className="text-right">
                      {item.taxa_conversao !== null ? (
                        <span className={isGargalo ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                          {item.taxa_conversao.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      {isGargalo ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          ⚠️ Gargalo
                        </span>
                      ) : item.taxa_conversao !== null && item.taxa_conversao >= 70 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✓ Saudável
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">💡 Insights sobre o Funil Acumulado:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Este funil mostra a <strong>jornada histórica completa</strong> dos leads no CRM</li>
            <li>Taxas de conversão abaixo de 50% indicam <strong>possíveis gargalos</strong> no processo</li>
            <li>Compare com o funil atual para identificar leads "presos" em etapas específicas</li>
            <li>Use estes dados para <strong>otimizar processos</strong> e treinar equipes nas etapas críticas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};