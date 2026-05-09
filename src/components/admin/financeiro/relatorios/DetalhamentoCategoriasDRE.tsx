import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosDRE } from '@/hooks/useDRE';

interface DetalhamentoCategoriasDREProps {
  dados: DadosDRE;
}

interface DetalheCategoria {
  categoria: string;
  tipo: 'receita' | 'despesa';
  valor_total: number;
  percentual_total: number;
  transacoes: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status: string;
    cliente_fornecedor: string;
  }>;
}

export const DetalhamentoCategoriasDRE = ({ dados }: DetalhamentoCategoriasDREProps) => {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<string[]>([]);
  const [detalhesCarregados, setDetalhesCarregados] = useState<Record<string, DetalheCategoria>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const toggleCategoria = async (categoria: string, tipo: 'receita' | 'despesa') => {
    const key = `${categoria}-${tipo}`;
    
    if (categoriasExpandidas.includes(key)) {
      setCategoriasExpandidas(prev => prev.filter(c => c !== key));
    } else {
      setCategoriasExpandidas(prev => [...prev, key]);
      
      // Carregar detalhes se ainda não foram carregados
      if (!detalhesCarregados[key]) {
        await carregarDetalhesCategoria(categoria, tipo);
      }
    }
  };

  const carregarDetalhesCategoria = async (categoria: string, tipo: 'receita' | 'despesa') => {
    const key = `${categoria}-${tipo}`;
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (tipo === 'receita') {
        const { data: contasReceber } = await supabase
          .from('contas_receber')
          .select(`
            id,
            descricao,
            valor_original,
            valor_recebido,
            data_vencimento,
            status,
            cliente_nome,
            categorias_financeiras!inner(nome)
          `)
          .gte('data_vencimento', dados.periodo.inicio)
          .lte('data_vencimento', dados.periodo.fim)
          .eq('categorias_financeiras.nome', categoria);

        const valorTotal = dados.receitas.find(r => r.categoria === categoria)?.valor || 0;
        const percentualTotal = dados.totalReceitas > 0 ? (valorTotal / dados.totalReceitas) * 100 : 0;

        const detalhe: DetalheCategoria = {
          categoria,
          tipo,
          valor_total: valorTotal,
          percentual_total: percentualTotal,
          transacoes: contasReceber?.map(conta => ({
            id: conta.id,
            descricao: conta.descricao,
            valor: conta.valor_recebido > 0 ? conta.valor_recebido : conta.valor_original,
            data_vencimento: conta.data_vencimento,
            status: conta.status,
            cliente_fornecedor: conta.cliente_nome
          })) || []
        };

        setDetalhesCarregados(prev => ({ ...prev, [key]: detalhe }));
      } else {
        const { data: contasPagar } = await supabase
          .from('contas_pagar')
          .select(`
            id,
            descricao,
            valor_original,
            valor_pago,
            data_vencimento,
            status,
            fornecedor_nome,
            categorias_financeiras!inner(nome)
          `)
          .gte('data_vencimento', dados.periodo.inicio)
          .lte('data_vencimento', dados.periodo.fim)
          .eq('categorias_financeiras.nome', categoria);

        const valorTotal = dados.despesas.find(d => d.categoria === categoria)?.valor || 0;
        const percentualTotal = dados.totalDespesas > 0 ? (valorTotal / dados.totalDespesas) * 100 : 0;

        const detalhe: DetalheCategoria = {
          categoria,
          tipo,
          valor_total: valorTotal,
          percentual_total: percentualTotal,
          transacoes: contasPagar?.map(conta => ({
            id: conta.id,
            descricao: conta.descricao,
            valor: conta.valor_pago > 0 ? conta.valor_pago : conta.valor_original,
            data_vencimento: conta.data_vencimento,
            status: conta.status,
            cliente_fornecedor: conta.fornecedor_nome
          })) || []
        };

        setDetalhesCarregados(prev => ({ ...prev, [key]: detalhe }));
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da categoria:', error);
    }

    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'pago':
      case 'recebido':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'pago':
        return 'Pago';
      case 'recebido':
        return 'Recebido';
      case 'vencido':
        return 'Vencido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Receitas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Receitas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.receitas.map((receita, index) => {
            const key = `${receita.categoria}-receita`;
            const isExpanded = categoriasExpandidas.includes(key);
            const isLoading = loading[key];
            const detalhe = detalhesCarregados[key];
            const percentual = (receita.valor / dados.totalReceitas) * 100;

            return (
              <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleCategoria(receita.categoria, 'receita')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">{receita.categoria}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(receita.valor)} • {formatPercentage(percentual)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentual} className="w-20" />
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : detalhe ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3">Descrição</th>
                              <th className="text-left p-3">Cliente</th>
                              <th className="text-right p-3">Valor</th>
                              <th className="text-center p-3">Vencimento</th>
                              <th className="text-center p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalhe.transacoes.map((transacao) => (
                              <tr key={transacao.id} className="border-t hover:bg-muted/30">
                                <td className="p-3 max-w-[200px] truncate">{transacao.descricao}</td>
                                <td className="p-3 max-w-[150px] truncate">{transacao.cliente_fornecedor}</td>
                                <td className="p-3 text-right font-medium text-green-600">
                                  {formatCurrency(transacao.valor)}
                                </td>
                                <td className="p-3 text-center">{formatDate(transacao.data_vencimento)}</td>
                                <td className="p-3 text-center">
                                  <Badge className={getStatusColor(transacao.status)}>
                                    {getStatusLabel(transacao.status)}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total de {detalhe.transacoes.length} transações
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Despesas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.despesas.map((despesa, index) => {
            const key = `${despesa.categoria}-despesa`;
            const isExpanded = categoriasExpandidas.includes(key);
            const isLoading = loading[key];
            const detalhe = detalhesCarregados[key];
            const percentual = (despesa.valor / dados.totalDespesas) * 100;

            return (
              <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleCategoria(despesa.categoria, 'despesa')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">{despesa.categoria}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(despesa.valor)} • {formatPercentage(percentual)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentual} className="w-20" />
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : detalhe ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3">Descrição</th>
                              <th className="text-left p-3">Fornecedor</th>
                              <th className="text-right p-3">Valor</th>
                              <th className="text-center p-3">Vencimento</th>
                              <th className="text-center p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalhe.transacoes.map((transacao) => (
                              <tr key={transacao.id} className="border-t hover:bg-muted/30">
                                <td className="p-3 max-w-[200px] truncate">{transacao.descricao}</td>
                                <td className="p-3 max-w-[150px] truncate">{transacao.cliente_fornecedor}</td>
                                <td className="p-3 text-right font-medium text-red-600">
                                  {formatCurrency(transacao.valor)}
                                </td>
                                <td className="p-3 text-center">{formatDate(transacao.data_vencimento)}</td>
                                <td className="p-3 text-center">
                                  <Badge className={getStatusColor(transacao.status)}>
                                    {getStatusLabel(transacao.status)}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total de {detalhe.transacoes.length} transações
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};