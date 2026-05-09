
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, FileText, Calendar } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioOrcamentosPostados as TipoRelatorioPostados } from '@/hooks/useRelatoriosAdmin';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  dataInicio: string;
  dataFim: string;
}

export const RelatorioOrcamentosPostados: React.FC<Props> = ({ dataInicio, dataFim }) => {
  const { buscarOrcamentosPostados, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<TipoRelatorioPostados[]>([]);
  
  // Usar useRef para controlar carregamento e evitar dependências circulares
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
      console.log('🔄 Iniciando carregamento de orçamentos postados:', { dataInicio, dataFim });
      const resultado = await buscarOrcamentosPostados(dataInicio, dataFim);
      console.log('✅ Resultado RAW do banco:', resultado);
      
      // Log detalhado de cada item para debug
      resultado.forEach((item, index) => {
        console.log(`📊 Item ${index + 1}:`, {
          dataOriginal: item.data,
          quantidadePostados: item.quantidade_postados,
          dataComoParsed: parseISO(item.data),
          dataFormatadaBrasil: format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR }),
          dataFormatadaGrafico: format(parseISO(item.data), 'dd/MM', { locale: ptBR })
        });
      });
      
      setDados(resultado);
    } catch (error) {
      console.error('❌ Erro ao carregar orçamentos postados:', error);
      setDados([]);
    } finally {
      carregandoRef.current = false;
    }
  }, [dataInicio, dataFim, buscarOrcamentosPostados]);

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (dataInicio && dataFim) {
      console.log('🕐 Agendando carregamento com delay para:', { dataInicio, dataFim });
      timeoutRef.current = setTimeout(() => {
        carregarDados();
      }, 300); // Debounce de 300ms
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dataInicio, dataFim, carregarDados]);

  const formatarDataBrasil = useCallback((dataString: string) => {
    try {
      // Assumir que a data vem no formato YYYY-MM-DD e é uma data local
      const data = parseISO(dataString);
      const dataFormatada = format(data, 'dd/MM/yyyy', { locale: ptBR });
      console.log(`📅 Formatando data Brasil: ${dataString} -> ${dataFormatada}`);
      return dataFormatada;
    } catch (error) {
      console.error('❌ Erro ao formatar data Brasil:', error, 'Data:', dataString);
      return dataString;
    }
  }, []);

  const formatarDataGrafico = useCallback((dataString: string) => {
    try {
      // Para o gráfico, usar formato curto
      const data = parseISO(dataString);
      const dataFormatada = format(data, 'dd/MM', { locale: ptBR });
      console.log(`📈 Formatando data gráfico: ${dataString} -> ${dataFormatada}`);
      return dataFormatada;
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
      ['Data', 'Orçamentos Postados'],
      ...dados.map(item => [
        formatarDataBrasil(item.data),
        item.quantidade_postados.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orcamentos-postados-${dataInicio}-${dataFim}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [dados, dataInicio, dataFim, formatarDataBrasil]);

  const totalOrcamentos = dados.reduce((total, item) => total + item.quantidade_postados, 0);
  const mediaOrcamentos = dados.length > 0 ? (totalOrcamentos / dados.length).toFixed(1) : '0';
  const diasComPostagem = dados.filter(item => item.quantidade_postados > 0).length;
  const picoMaximo = dados.length > 0 ? Math.max(...dados.map(d => d.quantidade_postados)) : 0;

  const isLoading = loading || carregandoRef.current;

  console.log('📊 Estado do componente RelatorioOrcamentosPostados:', { 
    dados: dados.length, 
    isLoading, 
    totalOrcamentos, 
    mediaOrcamentos,
    dataInicio,
    dataFim,
    dadosDetalhados: dados
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
                <p className="text-2xl font-bold">{totalOrcamentos}</p>
                <p className="text-sm text-muted-foreground">Total Postados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{mediaOrcamentos}</p>
                <p className="text-sm text-muted-foreground">Média Diária</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{diasComPostagem}</p>
                <p className="text-sm text-muted-foreground">Dias com Postagem</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{picoMaximo}</p>
                <p className="text-sm text-muted-foreground">Pico Diário</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gráfico de Orçamentos Postados por Dia</CardTitle>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={formatarDataGrafico}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => {
                    const dataFormatada = formatarDataBrasil(value);
                    console.log(`🔍 Tooltip formatando: ${value} -> ${dataFormatada}`);
                    return dataFormatada;
                  }}
                  formatter={(value) => [value, 'Orçamentos Postados']}
                />
                <Bar 
                  dataKey="quantidade_postados" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                />
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
                  <TableHead className="text-right">Orçamentos Postados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {formatarDataBrasil(item.data)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantidade_postados}
                    </TableCell>
                  </TableRow>
                ))}
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
