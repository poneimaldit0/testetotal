import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { FunilReuniao, FunilCanalOrigem } from '@/types/funilVendas';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DesempenhoPorCanal: React.FC = () => {
  const { buscarReunioes, buscarCanaisOrigem } = useFunilVendas();
  const [canais, setCanais] = useState<FunilCanalOrigem[]>([]);
  const [reunioes, setReunioes] = useState<FunilReuniao[]>([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

    const [canaisData, reunioesData] = await Promise.all([
      buscarCanaisOrigem(),
      buscarReunioes({ dataInicio: inicioMes, dataFim: fimMes }),
    ]);

    setCanais(canaisData);
    setReunioes(reunioesData || []);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  const dadosPorCanal = canais.map(canal => {
    const reunioesCanal = reunioes.filter(r => r.canal_origem_id === canal.id);
    return {
      ...canal,
      total: reunioesCanal.length,
      realizadas: reunioesCanal.filter(r => r.status === 'realizada').length,
      no_show: reunioesCanal.filter(r => r.status.startsWith('no_show')).length,
      pitchs: reunioesCanal.filter(r => r.teve_pitch).length,
      vendas: reunioesCanal.filter(r => r.teve_venda).length,
      caixa: reunioesCanal.reduce((sum, r) => sum + Number(r.caixa_coletado || 0), 0),
      faturamento: reunioesCanal.reduce((sum, r) => sum + Number(r.faturamento_gerado || 0), 0),
    };
  });

  // Também reuniões sem canal
  const semCanal = reunioes.filter(r => !r.canal_origem_id);
  if (semCanal.length > 0) {
    dadosPorCanal.push({
      id: 'sem-canal',
      nome: 'Sem Canal',
      ativo: true,
      created_at: '',
      total: semCanal.length,
      realizadas: semCanal.filter(r => r.status === 'realizada').length,
      no_show: semCanal.filter(r => r.status.startsWith('no_show')).length,
      pitchs: semCanal.filter(r => r.teve_pitch).length,
      vendas: semCanal.filter(r => r.teve_venda).length,
      caixa: semCanal.reduce((sum, r) => sum + Number(r.caixa_coletado || 0), 0),
      faturamento: semCanal.reduce((sum, r) => sum + Number(r.faturamento_gerado || 0), 0),
    });
  }

  // Sort by total descending
  dadosPorCanal.sort((a, b) => b.total - a.total);

  const taxaConversao = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) + '%' : '—';

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Desempenho por Canal — {format(hoje, "MMMM yyyy", { locale: ptBR })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-center">Agendadas</TableHead>
                <TableHead className="text-center">Realizadas</TableHead>
                <TableHead className="text-center">No Show</TableHead>
                <TableHead className="text-center">Pitchs</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead className="text-center">Conv. Reunião→Venda</TableHead>
                <TableHead className="text-right">Caixa (R$)</TableHead>
                <TableHead className="text-right">Faturamento (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPorCanal.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-center">{c.total}</TableCell>
                  <TableCell className="text-center">{c.realizadas}</TableCell>
                  <TableCell className="text-center">{c.no_show}</TableCell>
                  <TableCell className="text-center">{c.pitchs}</TableCell>
                  <TableCell className="text-center">{c.vendas}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={c.vendas > 0 ? 'default' : 'secondary'}>
                      {taxaConversao(c.vendas, c.realizadas)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.caixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{c.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              {dadosPorCanal.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhuma reunião neste mês
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