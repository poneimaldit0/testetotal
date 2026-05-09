import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRelatorioFunilVendas, DadosFunilVendas } from '@/hooks/useRelatorioFunilVendas';
import { TrendingDown, TrendingUp, FilterX } from 'lucide-react';

interface RelatorioFunilVendasProps {
  dataInicio: string;
  dataFim: string;
  onDataInicioChange: (value: string) => void;
  onDataFimChange: (value: string) => void;
  filtrosAplicados: boolean;
  onAplicarFiltros: () => void;
}

export const RelatorioFunilVendas = ({
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  filtrosAplicados,
  onAplicarFiltros
}: RelatorioFunilVendasProps) => {
  const { loading, buscarDadosFunil } = useRelatorioFunilVendas();
  const [dadosFunil, setDadosFunil] = useState<DadosFunilVendas[]>([]);

  // Função para ordenar os dados conforme o fluxo do processo de vendas
  const ordenarDadosFunil = (dados: DadosFunilVendas[]): DadosFunilVendas[] => {
    const ordemStatus = [
      'Sem Status',
      '1_contato_realizado',
      '2_contato_realizado', 
      '3_contato_realizado',
      '4_contato_realizado',
      '5_contato_realizado',
      'nao_respondeu_mensagens',
      'cliente_respondeu_nao_agendou',
      'visita_agendada',
      'visita_realizada',
      'orcamento_enviado',
      'negocio_fechado',
      'negocio_perdido'
    ];

    return dados.sort((a, b) => {
      const indexA = ordemStatus.indexOf(a.etapa);
      const indexB = ordemStatus.indexOf(b.etapa);
      
      // Se não encontrar na lista, coloca no final
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  };

  const carregarDados = async () => {
    const dados = await buscarDadosFunil(dataInicio, dataFim);
    const dadosOrdenados = ordenarDadosFunil(dados);
    setDadosFunil(dadosOrdenados);
  };

  const aplicarFiltros = () => {
    onAplicarFiltros();
    carregarDados();
  };

  // Helper function to format status names
  const formatStatusName = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      '1_contato_realizado': '1º Contato Realizado',
      '2_contato_realizado': '2º Contato Realizado', 
      '3_contato_realizado': '3º Contato Realizado',
      '4_contato_realizado': '4º Contato Realizado',
      '5_contato_realizado': '5º Contato Realizado',
      'cliente_respondeu_nao_agendou': 'Cliente Respondeu - Não Agendou',
      'nao_respondeu_mensagens': 'Não Respondeu Mensagens',
      'visita_agendada': 'Visita Agendada',
      'visita_realizada': 'Visita Realizada', 
      'orcamento_enviado': 'Orçamento Enviado',
      'negocio_fechado': 'Negócio Fechado',
      'negocio_perdido': 'Negócio Perdido',
      'Sem Status': 'Sem Status'
    };
    return statusMap[status] || status;
  };

  const getCorStatus = (status: string): string => {
    if (status.includes('contato_realizado')) return 'bg-blue-500';
    if (status.includes('cliente_respondeu') || status.includes('nao_respondeu')) return 'bg-yellow-500';
    if (status.includes('visita')) return 'bg-purple-500';
    if (status === 'orcamento_enviado') return 'bg-orange-500';
    if (status === 'negocio_fechado') return 'bg-green-500';
    if (status === 'negocio_perdido') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getBarWidth = (quantidade: number): number => {
    if (dadosFunil.length === 0) return 0;
    const maxQuantidade = Math.max(...dadosFunil.map(d => Number(d.quantidade)));
    return maxQuantidade > 0 ? (Number(quantidade) / maxQuantidade) * 100 : 0;
  };

  // Interface para dados do funil acumulado
  interface DadosFunilAcumulado extends DadosFunilVendas {
    quantidade_individual: number;
    quantidade_acumulada: number;
    percentual_acumulado: number;
    taxa_conversao: number;
  }

  // Função para calcular dados do funil acumulado
  const calcularFunilAcumulado = (): DadosFunilAcumulado[] => {
    if (dadosFunil.length === 0) return [];
    
    const dadosOrdenados = [...dadosFunil];
    const total = dadosOrdenados.reduce((sum, item) => sum + item.quantidade, 0);
    
    // Etapas finais que não devem acumular
    const etapasFinais = ['negocio_fechado', 'negocio_perdido'];
    
    // Calcula valores acumulados de trás para frente
    let acumulado = 0;
    const dadosAcumulados = dadosOrdenados.reverse().map((item, index) => {
      const isEtapaFinal = etapasFinais.includes(item.etapa);
      
      if (!isEtapaFinal) {
        acumulado += item.quantidade;
      }
      
      const quantidadeAcumulada = isEtapaFinal ? item.quantidade : acumulado;
      const proximoIndex = index + 1;
      const proximoItem = dadosOrdenados[proximoIndex];
      const taxaConversao = proximoItem ? Math.round((quantidadeAcumulada / (quantidadeAcumulada + proximoItem.quantidade)) * 100) : 100;
      
      return {
        ...item,
        quantidade_individual: item.quantidade,
        quantidade_acumulada: quantidadeAcumulada,
        percentual_acumulado: total > 0 ? Math.round((quantidadeAcumulada / total) * 100) : 0,
        taxa_conversao: taxaConversao
      };
    }).reverse();
    
    return dadosAcumulados;
  };

  const dadosFunilAcumulado = calcularFunilAcumulado();

  const getBarWidthAcumulado = (quantidadeAcumulada: number) => {
    if (dadosFunilAcumulado.length === 0) return 0;
    const maxQuantidade = Math.max(...dadosFunilAcumulado.map(item => item.quantidade_acumulada));
    return maxQuantidade === 0 ? 0 : (quantidadeAcumulada / maxQuantidade) * 100;
  };

  const filtrosComuns = (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="dataInicio">Data Início</Label>
        <Input
          id="dataInicio"
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="dataFim">Data Fim</Label>
        <Input
          id="dataFim"
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
        />
      </div>
      <Button 
        onClick={aplicarFiltros} 
        disabled={loading}
        className="min-w-[120px]"
      >
        {loading ? 'Carregando...' : 'Aplicar Filtros'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          {filtrosComuns}
        </CardContent>
      </Card>

      {!filtrosAplicados ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FilterX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aplique os filtros para visualizar o relatório</h3>
            <p className="text-muted-foreground text-center">
              Selecione o período desejado e clique em "Aplicar Filtros" para gerar o funil de vendas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Visualização por Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status Detalhado - Gráfico de Barras</CardTitle>
              <CardDescription>
                Distribuição de orçamentos por status individual (ordenado por fluxo do processo)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Linha do Total Geral */}
                {dadosFunil.length > 0 && (
                  <>
                    <div className="space-y-2 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-4 h-4 rounded bg-primary" />
                          <span className="font-bold text-base">
                            📊 Total de Orçamentos
                          </span>
                          <Badge variant="default" className="shrink-0 font-bold">
                            {dadosFunil.reduce((total, item) => total + item.quantidade, 0)}
                          </Badge>
                        </div>
                        <span className="text-base font-bold text-primary shrink-0 ml-2">
                          100%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className="h-4 rounded-full bg-primary"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    
                    {/* Separador visual */}
                    <div className="border-t border-border my-4"></div>
                  </>
                )}

                {/* Status individuais */}
                <div className="space-y-3">
                  {dadosFunil.map((item) => (
                    <div key={item.etapa} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-4 h-4 rounded ${getCorStatus(item.etapa)}`} />
                          <span className="font-medium text-sm truncate">
                            {formatStatusName(item.etapa)}
                          </span>
                          <Badge variant="secondary" className="shrink-0">
                            {item.quantidade}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground shrink-0 ml-2">
                          {item.percentual_total}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 relative">
                        <div 
                          className={`h-3 rounded-full ${getCorStatus(item.etapa)}`}
                          style={{ width: `${getBarWidth(item.quantidade)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Detalhados por Status</CardTitle>
              <CardDescription>
                Métricas completas de cada status individual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFunil.map((item) => (
                    <TableRow key={item.etapa}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getCorStatus(item.etapa)}`} />
                          {formatStatusName(item.etapa)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.percentual_total}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Funil Acumulado */}
          {dadosFunilAcumulado.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔄 Funil Acumulado - Gráfico de Barras
                  <Badge variant="outline" className="text-xs">NOVO</Badge>
                </CardTitle>
                <CardDescription>
                  Visualização acumulativa do funil (cada etapa inclui todas as etapas posteriores). 
                  Ex: "Orçamento Enviado" = 33 + 2 + 6 = 41 orçamentos ainda ativos no processo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dadosFunilAcumulado.map((item) => (
                    <div key={`acum-${item.etapa}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-4 h-4 rounded ${getCorStatus(item.etapa)}`} />
                          <span className="font-medium text-sm truncate">
                            {formatStatusName(item.etapa)}
                          </span>
                          <div className="flex gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {item.quantidade_individual}
                            </Badge>
                            <Badge variant="default" className="text-xs font-bold">
                              {item.quantidade_acumulada}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground">
                            {item.percentual_acumulado}%
                          </span>
                          {item.taxa_conversao !== 100 && (
                            <span className="text-xs text-orange-600 font-medium">
                              {item.taxa_conversao}% conv.
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className={`h-4 rounded-full ${getCorStatus(item.etapa)} opacity-80`}
                          style={{ width: `${getBarWidthAcumulado(item.quantidade_acumulada)}%` }}
                        />
                        {/* Barra interna mostrando valor individual */}
                        <div 
                          className={`absolute top-0 left-0 h-4 rounded-full ${getCorStatus(item.etapa)}`}
                          style={{ width: `${getBarWidthAcumulado(item.quantidade_individual)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela Comparativa - Individual vs Acumulado */}
          {dadosFunilAcumulado.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparativo: Individual vs Acumulado</CardTitle>
                <CardDescription>
                  Comparação detalhada entre valores individuais e acumulados por etapa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Individual</TableHead>
                      <TableHead className="text-right">Acumulado</TableHead>
                      <TableHead className="text-right">% Acumulado</TableHead>
                      <TableHead className="text-right">Taxa Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosFunilAcumulado.map((item) => (
                      <TableRow key={`table-acum-${item.etapa}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${getCorStatus(item.etapa)}`} />
                            {formatStatusName(item.etapa)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {item.quantidade_individual}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {item.quantidade_acumulada}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.percentual_acumulado}%
                        </TableCell>
                        <TableCell className="text-right">
                          {item.taxa_conversao !== 100 ? (
                            <span className="text-orange-600 font-medium">
                              {item.taxa_conversao}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {dadosFunil.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {dadosFunil.reduce((acc, curr) => acc + curr.quantidade, 0)}
                    </div>
                    <div className="text-sm text-blue-600">Total de Orçamentos</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {dadosFunil.find(d => d.etapa === 'negocio_fechado')?.quantidade || 0}
                    </div>
                    <div className="text-sm text-green-600">Negócios Fechados</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {dadosFunil.find(d => d.etapa === 'negocio_perdido')?.quantidade || 0}
                    </div>
                    <div className="text-sm text-red-600">Negócios Perdidos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};