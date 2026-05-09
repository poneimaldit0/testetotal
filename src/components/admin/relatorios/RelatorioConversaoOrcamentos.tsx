import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileText, CheckCircle, Percent, Clock } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioConversaoOrcamentos as TipoRelatorioConversao } from '@/hooks/useRelatoriosAdmin';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  dataInicio: string;
  dataFim: string;
}

export const RelatorioConversaoOrcamentos: React.FC<Props> = ({ dataInicio, dataFim }) => {
  const { buscarConversaoOrcamentos, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<TipoRelatorioConversao[]>([]);
  
  const carregandoRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const carregarDados = useCallback(async () => {
    if (!dataInicio || !dataFim) {
      console.log('⚠️ Datas não definidas, não carregando dados');
      return;
    }

    if (carregandoRef.current) {
      console.log('⚠️ Já está carregando, ignorando nova chamada');
      return;
    }
    
    carregandoRef.current = true;
    try {
      console.log('🔄 Iniciando carregamento de conversão de orçamentos:', { dataInicio, dataFim });
      const resultado = await buscarConversaoOrcamentos(dataInicio, dataFim);
      console.log('✅ Resultado RAW do banco:', resultado);
      setDados(resultado);
    } catch (error) {
      console.error('❌ Erro ao carregar conversão de orçamentos:', error);
      setDados([]);
    } finally {
      carregandoRef.current = false;
    }
  }, [dataInicio, dataFim, buscarConversaoOrcamentos]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (dataInicio && dataFim) {
      console.log('🕐 Agendando carregamento com delay para:', { dataInicio, dataFim });
      timeoutRef.current = setTimeout(() => {
        carregarDados();
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dataInicio, dataFim, carregarDados]);

  const formatarDataBrasil = useCallback((dataString: string) => {
    try {
      const data = parseISO(dataString);
      return format(data, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('❌ Erro ao formatar data Brasil:', error, 'Data:', dataString);
      return dataString;
    }
  }, []);

  const formatarDataGrafico = useCallback((dataString: string) => {
    try {
      const data = parseISO(dataString);
      return format(data, 'dd/MM', { locale: ptBR });
    } catch (error) {
      console.error('❌ Erro ao formatar data do gráfico:', error, 'Data:', dataString);
      return dataString;
    }
  }, []);

  const exportarCSV = useCallback(() => {
    if (dados.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const csv = [
      ['Data', 'Postados', 'Fechados', 'Em Aberto', 'Taxa Conversão (%)'],
      ...dados.map(item => [
        formatarDataBrasil(item.data),
        item.quantidade_postados.toString(),
        item.quantidade_fechados.toString(),
        (item.quantidade_postados - item.quantidade_fechados).toString(),
        item.taxa_conversao.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversao-orcamentos-${dataInicio}-${dataFim}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [dados, dataInicio, dataFim, formatarDataBrasil]);

  const totalPostados = dados.reduce((total, item) => total + item.quantidade_postados, 0);
  const totalFechados = dados.reduce((total, item) => total + item.quantidade_fechados, 0);
  const totalAbertos = totalPostados - totalFechados;
  const taxaConversaoMedia = totalPostados > 0 ? ((totalFechados / totalPostados) * 100).toFixed(1) : '0';

  const isLoading = loading || carregandoRef.current;

  // Preparar dados para o gráfico de barras empilhadas
  const dadosGrafico = dados.map(item => ({
    data: formatarDataGrafico(item.data),
    dataOriginal: item.data,
    Postados: item.quantidade_postados,
    Fechados: item.quantidade_fechados,
    'Em Aberto': item.quantidade_postados - item.quantidade_fechados
  }));

  console.log('📊 Estado do componente RelatorioConversaoOrcamentos:', { 
    dados: dados.length, 
    isLoading, 
    totalPostados, 
    totalFechados,
    dataInicio,
    dataFim
  });

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalPostados}</p>
                <p className="text-sm text-muted-foreground">Total Postados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalFechados}</p>
                <p className="text-sm text-muted-foreground">Fechados (3 fornec.)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Percent className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{taxaConversaoMedia}%</p>
                <p className="text-sm text-muted-foreground">Taxa Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{totalAbertos}</p>
                <p className="text-sm text-muted-foreground">Em Aberto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gráfico de Conversão (Postados vs Fechados)</CardTitle>
            <Button onClick={exportarCSV} variant="outline" size="sm" disabled={dados.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
            </div>
          ) : dados.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return formatarDataBrasil(payload[0].payload.dataOriginal);
                    }
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="Postados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fechados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Em Aberto" fill="hsl(var(--amber))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {dataInicio && dataFim ? 
                    'Nenhum orçamento foi postado no período selecionado' : 
                    'Selecione um período para visualizar os dados'
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          {dados.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Postados</TableHead>
                  <TableHead className="text-right">Fechados</TableHead>
                  <TableHead className="text-right">Em Aberto</TableHead>
                  <TableHead className="text-right">Taxa Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => {
                  const emAberto = item.quantidade_postados - item.quantidade_fechados;
                  const corTaxa = item.taxa_conversao >= 80 ? 'text-green-600' :
                                 item.taxa_conversao >= 50 ? 'text-amber-600' :
                                 'text-red-600';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{formatarDataBrasil(item.data)}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantidade_postados}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{item.quantidade_fechados}</TableCell>
                      <TableCell className="text-right text-amber-600">{emAberto}</TableCell>
                      <TableCell className={`text-right font-bold ${corTaxa}`}>
                        {item.taxa_conversao.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {dataInicio && dataFim ? 
                  'Nenhum dado encontrado para o período selecionado' : 
                  'Selecione um período para visualizar os dados'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
