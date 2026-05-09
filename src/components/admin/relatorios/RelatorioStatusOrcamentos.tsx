
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, BarChart3 } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioStatusOrcamentos as TipoRelatorioStatus } from '@/hooks/useRelatoriosAdmin';

interface Props {
  fornecedorId: string;
  dataInicio: string;
  dataFim: string;
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

export const RelatorioStatusOrcamentos: React.FC<Props> = ({ fornecedorId, dataInicio, dataFim }) => {
  const { buscarStatusOrcamentos, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<TipoRelatorioStatus[]>([]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const resultado = await buscarStatusOrcamentos(fornecedorId, dataInicio, dataFim);
        setDados(resultado);
      } catch (error) {
        console.error('Erro ao carregar status dos orçamentos:', error);
      }
    };

    if (fornecedorId) {
      carregarDados();
    }
  }, [fornecedorId, dataInicio, dataFim, buscarStatusOrcamentos]);

  const exportarCSV = () => {
    const csv = [
      ['Status Acompanhamento', 'Quantidade', 'Percentual'],
      ...dados.map(item => [
        `"${getStatusAcompanhamento(item.status_acompanhamento)}"`,
        item.quantidade.toString(),
        `${item.percentual}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `status-orcamentos-${dataInicio}-${dataFim}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusAcompanhamento = (status: string) => {
    const statusMap: { [key: string]: string } = {
      '1_contato_realizado': '1º Contato Realizado',
      '2_contato_realizado': '2º Contato Realizado',
      '3_contato_realizado': '3º Contato Realizado',
      '4_contato_realizado': '4º Contato Realizado',
      '5_contato_realizado': '5º Contato Realizado',
      'cliente_respondeu_nao_agendou': 'Cliente Respondeu',
      'visita_agendada': 'Visita Agendada',
      'visita_realizada': 'Visita Realizada',
      'orcamento_enviado': 'Orçamento Enviado',
      'negocio_fechado': 'Negócio Fechado',
      'negocio_perdido': 'Negócio Perdido',
      'nao_respondeu_mensagens': 'Não Respondeu',
      'Sem status': 'Sem Status'
    };

    return statusMap[status] || status;
  };

  const dadosGrafico = dados.map((item, index) => ({
    name: getStatusAcompanhamento(item.status_acompanhamento),
    value: item.quantidade,
    percentual: item.percentual
  }));

  const totalOrcamentos = dados.reduce((total, item) => total + item.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalOrcamentos}</p>
                <p className="text-sm text-muted-foreground">Total de Orçamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{dados.length}</p>
                <p className="text-sm text-muted-foreground">Status Diferentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dados.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentual }) => `${percentual}%`}
                  >
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Detalhamento por Status</CardTitle>
              <Button onClick={exportarCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Percentual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{getStatusAcompanhamento(item.status_acompanhamento)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantidade}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.percentual}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
