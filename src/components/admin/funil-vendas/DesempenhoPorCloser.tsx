import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { ETAPAS_FUNIL, FunilReuniao } from '@/types/funilVendas';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DesempenhoPorCloser: React.FC = () => {
  const { buscarRegistros, buscarClosers, buscarMetas, calcularAcumulado, buscarReunioes } = useFunilVendas();
  const [closers, setClosers] = useState<any[]>([]);
  const [dadosPorCloser, setDadosPorCloser] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

    const [closersList, regs, metasData, reunioesData] = await Promise.all([
      buscarClosers(),
      buscarRegistros({ dataInicio: inicioMes, dataFim: fimMes }),
      buscarMetas(mesAtual, anoAtual),
      buscarReunioes({ dataInicio: inicioMes, dataFim: fimMes }),
    ]);

    setClosers(closersList);
    setMeta(metasData.find(m => !m.closer_id) || null);

    const reunioesList = reunioesData || [];

    const porCloser = closersList.map(closer => {
      const regsCloser = regs.filter(r => r.closer_id === closer.id);
      const baseAcumulado = calcularAcumulado(regsCloser);

      const reunioesCloser = reunioesList.filter((r: FunilReuniao) => r.closer_id === closer.id);
      const acumulado = {
        ...baseAcumulado,
        reunioes_agendadas: baseAcumulado.reunioes_agendadas + reunioesCloser.length,
        reunioes_iniciadas: baseAcumulado.reunioes_iniciadas + reunioesCloser.filter((r: FunilReuniao) => r.status === 'realizada').length,
        pitchs_realizados: baseAcumulado.pitchs_realizados + reunioesCloser.filter((r: FunilReuniao) => r.teve_pitch).length,
        vendas: baseAcumulado.vendas + reunioesCloser.filter((r: FunilReuniao) => r.teve_venda).length,
        caixa_coletado: baseAcumulado.caixa_coletado + reunioesCloser.reduce((sum: number, r: FunilReuniao) => sum + Number(r.caixa_coletado || 0), 0),
        faturamento_gerado: baseAcumulado.faturamento_gerado + reunioesCloser.reduce((sum: number, r: FunilReuniao) => sum + Number(r.faturamento_gerado || 0), 0),
      };

      const metaCloser = metasData.find(m => m.closer_id === closer.id);
      return { ...closer, acumulado, meta: metaCloser };
    });

    // Ranking por vendas
    porCloser.sort((a, b) => b.acumulado.vendas - a.acumulado.vendas);
    setDadosPorCloser(porCloser);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  const getStatusBadge = (valor: number, metaVal: number) => {
    if (metaVal === 0) return null;
    const pct = (valor / metaVal) * 100;
    if (pct >= 80) return <Badge className="bg-green-500 text-white text-[10px]">{pct.toFixed(0)}%</Badge>;
    if (pct >= 50) return <Badge className="bg-yellow-500 text-white text-[10px]">{pct.toFixed(0)}%</Badge>;
    return <Badge variant="destructive" className="text-[10px]">{pct.toFixed(0)}%</Badge>;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Desempenho por Closer — {format(hoje, "MMMM yyyy", { locale: ptBR })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Closer</TableHead>
                {ETAPAS_FUNIL.filter(e => !['leads_entrada', 'mql', 'ligacoes_realizadas'].includes(e.key)).map(e => <TableHead key={e.key} className="text-center">{e.label}</TableHead>)}
                <TableHead className="text-right">Caixa (R$)</TableHead>
                <TableHead className="text-right">Faturamento (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPorCloser.map((c, idx) => {
                const metaRef = c.meta || meta;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant={idx === 0 ? 'default' : 'outline'}>{idx + 1}º</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{c.nome || c.email}</TableCell>
                    {ETAPAS_FUNIL.filter(e => !['leads_entrada', 'mql', 'ligacoes_realizadas'].includes(e.key)).map(e => (
                      <TableCell key={e.key} className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{c.acumulado[e.key]}</span>
                          {metaRef && getStatusBadge(c.acumulado[e.key], metaRef[e.metaKey])}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{Number(c.acumulado.caixa_coletado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{Number(c.acumulado.faturamento_gerado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
              {dadosPorCloser.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhum closer cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
