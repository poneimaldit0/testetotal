
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioAcessosUnicos as TipoRelatorioAcessos } from '@/hooks/useRelatoriosAdmin';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  dataInicio: string;
  dataFim: string;
}

export const RelatorioAcessosUnicos: React.FC<Props> = ({ dataInicio, dataFim }) => {
  const { buscarAcessosUnicos, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<TipoRelatorioAcessos[]>([]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const resultado = await buscarAcessosUnicos(dataInicio, dataFim);
        console.log('🔍 Dados brutos recebidos:', resultado);
        
        // Debugging das datas
        resultado.forEach((item, index) => {
          console.log(`📅 Item ${index}:`, {
            dataOriginal: item.data,
            dataParsed: parseISO(item.data),
            dataFormatada: format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR }),
            acessos: item.acessos_unicos
          });
        });
        
        setDados(resultado);
      } catch (error) {
        console.error('Erro ao carregar dados de acessos únicos:', error);
      }
    };

    carregarDados();
  }, [dataInicio, dataFim, buscarAcessosUnicos]);

  const exportarCSV = () => {
    const csv = [
      ['Data', 'Acessos Únicos'],
      ...dados.map(item => [
        format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR }),
        item.acessos_unicos.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acessos-unicos-${dataInicio}-${dataFim}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalAcessos = dados.reduce((total, item) => total + item.acessos_unicos, 0);
  const mediaAcessos = dados.length > 0 ? (totalAcessos / dados.length).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalAcessos}</p>
                <p className="text-sm text-muted-foreground">Total de Acessos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{mediaAcessos}</p>
                <p className="text-sm text-muted-foreground">Média Diária</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{dados.length}</p>
                <p className="text-sm text-muted-foreground">Dias com Acesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gráfico de Acessos Únicos por Dia</CardTitle>
            <Button onClick={exportarCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : dados.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={(value) => format(parseISO(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR })}
                  formatter={(value) => [value, 'Acessos Únicos']}
                />
                <Line 
                  type="monotone" 
                  dataKey="acessos_unicos" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
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
          <CardTitle>Tabela Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Acessos Únicos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.acessos_unicos}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
