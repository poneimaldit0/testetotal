import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ETAPAS_CRM } from '@/constants/crmEtapas';
import type { DadosFunilCRM } from '@/types/crm';

interface FunilCRMChartProps {
  dados: DadosFunilCRM[];
  carregando: boolean;
}

export const FunilCRMChart = ({ dados, carregando }: FunilCRMChartProps) => {
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

  const dadosFormatados = dados.map(item => ({
    etapa: getNomeEtapa(item.etapa),
    quantidade: Number(item.quantidade),
    valor_total: Number(item.valor_total),
    ticket_medio: Number(item.ticket_medio),
    percentual: Number(item.percentual_total),
    taxa_conversao: Number(item.taxa_conversao_proxima),
    cor: getCorEtapa(item.etapa),
  }));

  if (carregando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão CRM</CardTitle>
          <CardDescription>Distribuição de orçamentos por etapa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão CRM</CardTitle>
        <CardDescription>Distribuição de orçamentos por etapa do pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dadosFormatados} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="etapa" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold mb-2">{data.etapa}</p>
                    <p className="text-sm">Quantidade: <strong>{data.quantidade}</strong></p>
                    <p className="text-sm">Valor Total: <strong>{formatarMoeda(data.valor_total)}</strong></p>
                    <p className="text-sm">Ticket Médio: <strong>{formatarMoeda(data.ticket_medio)}</strong></p>
                    <p className="text-sm">% do Total: <strong>{data.percentual.toFixed(1)}%</strong></p>
                    {data.taxa_conversao > 0 && (
                      <p className="text-sm text-green-600">
                        Conversão: <strong>{data.taxa_conversao.toFixed(1)}%</strong>
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="quantidade" name="Quantidade" radius={[8, 8, 0, 0]}>
              {dadosFormatados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela de Conversão */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">Etapa</th>
                <th className="text-right py-2">Qtd</th>
                <th className="text-right py-2">Valor Total</th>
                <th className="text-right py-2">Ticket Médio</th>
                <th className="text-right py-2">% Total</th>
                <th className="text-right py-2">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {dadosFormatados.map((item, index) => (
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
                  <td className="text-right">{formatarMoeda(item.valor_total)}</td>
                  <td className="text-right">{formatarMoeda(item.ticket_medio)}</td>
                  <td className="text-right">{item.percentual.toFixed(1)}%</td>
                  <td className="text-right">
                    {item.taxa_conversao > 0 ? (
                      <span className="text-green-600 font-medium">
                        {item.taxa_conversao.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
