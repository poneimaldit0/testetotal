import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowRight, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { ETAPAS_FUNIL, ETAPAS_FINANCEIRAS, calcularConversao, calcularForecast, calcularForecastFinanceiro, FunilVendasAcumulado, FunilReuniao, FunilCanalOrigem } from '@/types/funilVendas';
import { format, startOfMonth, endOfMonth, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const VisaoGeralFunil: React.FC = () => {
  const { buscarRegistros, buscarMetas, calcularAcumulado, buscarReunioes, buscarClosers, buscarCanaisOrigem } = useFunilVendas();
  const [acumulado, setAcumulado] = useState<FunilVendasAcumulado | null>(null);
  const [reunioes, setReunioes] = useState<FunilReuniao[]>([]);
  const [closers, setClosers] = useState<any[]>([]);
  const [canais, setCanais] = useState<FunilCanalOrigem[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const diasNoMes = getDaysInMonth(hoje);
  const diasPassados = differenceInCalendarDays(hoje, startOfMonth(hoje)) + 1;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

    const [regs, metasData, reunioesData, closersData, canaisData] = await Promise.all([
      buscarRegistros({ dataInicio: inicioMes, dataFim: fimMes }),
      buscarMetas(mesAtual, anoAtual),
      buscarReunioes({ dataInicio: inicioMes, dataFim: fimMes }),
      buscarClosers(),
      buscarCanaisOrigem(),
    ]);

    const baseAcumulado = calcularAcumulado(regs);
    const reunioesList = reunioesData || [];
    
    // Overlay reunion-derived metrics on top of daily records
    const reunioesAgendadas = reunioesList.length;
    const reunioesRealizadas = reunioesList.filter((r: FunilReuniao) => r.status === 'realizada').length;
    const pitchs = reunioesList.filter((r: FunilReuniao) => r.teve_pitch).length;
    const vendas = reunioesList.filter((r: FunilReuniao) => r.teve_venda).length;
    const caixaReunioes = reunioesList.reduce((sum: number, r: FunilReuniao) => sum + Number(r.caixa_coletado || 0), 0);
    const fatReunioes = reunioesList.reduce((sum: number, r: FunilReuniao) => sum + Number(r.faturamento_gerado || 0), 0);

    setAcumulado({
      ...baseAcumulado,
      reunioes_agendadas: baseAcumulado.reunioes_agendadas + reunioesAgendadas,
      reunioes_iniciadas: baseAcumulado.reunioes_iniciadas + reunioesRealizadas,
      pitchs_realizados: baseAcumulado.pitchs_realizados + pitchs,
      vendas: baseAcumulado.vendas + vendas,
      caixa_coletado: baseAcumulado.caixa_coletado + caixaReunioes,
      faturamento_gerado: baseAcumulado.faturamento_gerado + fatReunioes,
    });
    setReunioes(reunioesList);
    setClosers(closersData || []);
    setCanais(canaisData || []);
    setMeta(metasData.find(m => !m.closer_id) || null);
    setLoading(false);
  };

  if (loading || !acumulado) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  const getProgress = (v: number, m: number) => m > 0 ? Math.min((v / m) * 100, 100) : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Mês e resumo */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm">
          {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })} — Dia {diasPassados}/{diasNoMes}
        </Badge>
      </div>

      {/* Cards de etapas do funil */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ETAPAS_FUNIL.map(etapa => {
          const valor = acumulado[etapa.key as keyof FunilVendasAcumulado] as number;
          const metaVal = meta?.[etapa.metaKey] || 0;
          const forecast = calcularForecast(valor, diasPassados, diasNoMes);
          return (
            <Card key={etapa.key} className="border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">{etapa.label}</p>
                <p className="text-2xl font-bold text-foreground">{valor}</p>
                {metaVal > 0 && (
                  <>
                    <Progress value={getProgress(valor, metaVal)} className="h-1.5 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Meta: {metaVal} | Forecast: {forecast}</p>
                    <p className="text-[10px] text-muted-foreground">Faltam: {Math.max(0, metaVal - valor)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ETAPAS_FINANCEIRAS.map(etapa => {
          const valor = acumulado[etapa.key as keyof FunilVendasAcumulado] as number;
          const metaVal = meta?.[etapa.metaKey] || 0;
          const forecast = calcularForecastFinanceiro(valor, diasPassados, diasNoMes);
          return (
            <Card key={etapa.key}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground font-medium">{etapa.label}</p>
                <p className="text-3xl font-bold text-foreground">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {metaVal > 0 && (
                  <>
                    <Progress value={getProgress(valor, metaVal)} className="h-2 mt-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{Math.round(getProgress(valor, metaVal))}% da meta</span>
                      <span>Meta: R$ {metaVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Forecast: R$ {forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Faltam: R$ {Math.max(0, metaVal - valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Taxas de conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Taxas de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {ETAPAS_FUNIL.map((etapa, idx) => {
              const valor = acumulado[etapa.key as keyof FunilVendasAcumulado] as number;
              if (idx === 0) {
                return (
                  <div key={etapa.key} className="flex items-center gap-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{etapa.label}</p>
                      <p className="text-lg font-bold">{valor}</p>
                    </div>
                  </div>
                );
              }
              const anterior = acumulado[ETAPAS_FUNIL[idx - 1].key as keyof FunilVendasAcumulado] as number;
              const taxa = calcularConversao(valor, anterior);
              return (
                <div key={etapa.key} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant={taxa >= 50 ? 'default' : taxa >= 25 ? 'secondary' : 'destructive'} className="text-[10px]">
                      {taxa.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{etapa.label}</p>
                    <p className="text-lg font-bold">{valor}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {/* Resumo de Reuniões Individuais */}
      {reunioes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Reuniões do Mês ({reunioes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{reunioes.length}</p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{reunioes.filter(r => r.status === 'realizada').length}</p>
                <p className="text-xs text-muted-foreground">Realizadas</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{reunioes.filter(r => r.teve_pitch).length}</p>
                <p className="text-xs text-muted-foreground">Pitchs</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{reunioes.filter(r => r.teve_venda).length}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reunião</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Closer</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Pitch</TableHead>
                    <TableHead className="text-center">Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reunioes.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{format(new Date(r.data_agendada + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</TableCell>
                      <TableCell>{closers.find(c => c.id === r.closer_id)?.nome || '—'}</TableCell>
                      <TableCell className="text-xs">{canais.find(c => c.id === r.canal_origem_id)?.nome || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'realizada' ? 'default' : r.status.startsWith('no_show') ? 'destructive' : 'outline'}>
                          {r.status === 'agendada' ? 'Agendada' : r.status === 'realizada' ? 'Realizada' : r.status === 'no_show_desapareceu' ? 'No Show - Desapareceu' : r.status === 'no_show_remarcar' ? 'No Show - Remarcar' : r.status === 'no_show_cancelar' ? 'No Show - Cancelar' : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{r.teve_pitch ? '✅' : '—'}</TableCell>
                      <TableCell className="text-center">{r.teve_venda ? '✅' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
