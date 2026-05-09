import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Calculator, Plus, Percent, AlertTriangle, CheckCircle2, DollarSign, Zap } from 'lucide-react';
import { useMedicoes } from '@/hooks/useMedicoes';

interface CriarMedicaoComItensProps {
  contratoId?: string;
  onVoltar?: () => void;
}

interface ItemMedicao {
  item_checklist_id: string;
  percentual_executado: number;
  valor_item_original: number;
  observacoes?: string;
}

export const CriarMedicaoComItens: React.FC<CriarMedicaoComItensProps> = ({ 
  contratoId,
  onVoltar 
}) => {
  const { 
    medicoes, 
    itensContrato, 
    loading, 
    loadingItens, 
    criarMedicaoComItens,
    calcularPercentualAcumulado,
    obterProximoNumeroMedicao 
  } = useMedicoes(contratoId);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [percentuaisAcumulados, setPercentuaisAcumulados] = useState<Record<string, number>>({});
  const [loadingPercentuais, setLoadingPercentuais] = useState(false);
  const [proximoNumero, setProximoNumero] = useState<number | null>(null);
  const [loadingNumero, setLoadingNumero] = useState(false);
  
  const [formData, setFormData] = useState({
    descricao: '',
    data_medicao: new Date().toISOString().split('T')[0],
    observacoes_fornecedor: '',
  });
  
  const [itensMedicao, setItensMedicao] = useState<Record<string, ItemMedicao>>({});

  // Carregar próximo número e percentuais acumulados ao abrir o modal
  useEffect(() => {
    if (modalAberto && contratoId) {
      carregarProximoNumero();
      if (itensContrato.length > 0) {
        carregarPercentuais();
      }
    }
  }, [modalAberto, itensContrato, contratoId]);

  const carregarProximoNumero = async () => {
    if (!contratoId) return;
    
    setLoadingNumero(true);
    try {
      const numero = await obterProximoNumeroMedicao(contratoId);
      setProximoNumero(numero);
    } catch (error) {
      console.error('Erro ao carregar próximo número:', error);
    } finally {
      setLoadingNumero(false);
    }
  };

  const carregarPercentuais = async () => {
    setLoadingPercentuais(true);
    const percentuais: Record<string, number> = {};
    
    for (const item of itensContrato) {
      const percentual = await calcularPercentualAcumulado(item.item_id);
      percentuais[item.item_id] = percentual;
    }
    
    setPercentuaisAcumulados(percentuais);
    setLoadingPercentuais(false);
  };

  const handlePercentualChange = (itemId: string, percentual: number) => {
    const item = itensContrato.find(i => i.item_id === itemId);
    if (!item) return;

    const percentualAcumulado = percentuaisAcumulados[itemId] || 0;
    const percentualMaximo = 100 - percentualAcumulado;

    if (percentual < 0) percentual = 0;
    if (percentual > percentualMaximo) percentual = percentualMaximo;

    setItensMedicao(prev => ({
      ...prev,
      [itemId]: {
        item_checklist_id: itemId,
        percentual_executado: percentual,
        valor_item_original: item.valor_estimado,
        observacoes: prev[itemId]?.observacoes || '',
      }
    }));
  };

  const handleObservacaoChange = (itemId: string, observacao: string) => {
    setItensMedicao(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observacoes: observacao,
      }
    }));
  };

  const calcularValorTotal = () => {
    return Object.values(itensMedicao).reduce((total, item) => {
      return total + (item.valor_item_original * item.percentual_executado / 100);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proximoNumero) return;
    
    const itensParaEnviar = Object.values(itensMedicao).filter(item => item.percentual_executado > 0);
    
    if (itensParaEnviar.length === 0) {
      return;
    }

    const dadosComNumero = {
      numero_medicao: proximoNumero,
      ...formData
    };

    const sucesso = await criarMedicaoComItens(dadosComNumero, itensParaEnviar);
    
    if (sucesso) {
      // Limpar formulário
      setFormData({
        descricao: '',
        data_medicao: new Date().toISOString().split('T')[0],
        observacoes_fornecedor: '',
      });
      setItensMedicao({});
      setProximoNumero(null);
      setModalAberto(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getItemStatus = (percentualAcumulado: number) => {
    if (percentualAcumulado >= 100) return { status: 'completed', label: 'Concluído', color: 'bg-green-500' };
    if (percentualAcumulado >= 80) return { status: 'nearly-complete', label: 'Quase Concluído', color: 'bg-yellow-500' };
    if (percentualAcumulado > 0) return { status: 'in-progress', label: 'Em Andamento', color: 'bg-blue-500' };
    return { status: 'available', label: 'Disponível', color: 'bg-gray-400' };
  };

  const usarSaldoCompleto = (itemId: string) => {
    const percentualAcumulado = percentuaisAcumulados[itemId] || 0;
    const percentualMaximo = 100 - percentualAcumulado;
    handlePercentualChange(itemId, percentualMaximo);
  };

  // Agrupar itens por categoria
  const itensAgrupados = itensContrato.reduce((grupos, item) => {
    if (!grupos[item.categoria]) {
      grupos[item.categoria] = [];
    }
    grupos[item.categoria].push(item);
    return grupos;
  }, {} as Record<string, typeof itensContrato>);

  if (loading || loadingItens) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nova Medição Baseada em Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando itens do contrato...</p>
        </CardContent>
      </Card>
    );
  }

  if (itensContrato.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nova Medição Baseada em Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não foi possível carregar os itens do contrato. Verifique se existe uma proposta aceita para este projeto.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com informações da obra e botão voltar */}
      {onVoltar && (
        <div className="flex items-center justify-between">
          <Button
            onClick={onVoltar}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Seleção de Obras
          </Button>
          {contratoId && (
            <div className="text-sm text-muted-foreground">
              Contrato ID: {contratoId.slice(0, 8)}
            </div>
          )}
        </div>
      )}

      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Medição Detalhada por Itens
          </div>
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Nova Medição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Medição Baseada em Itens</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações gerais da medição */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium">Número da Medição:</label>
                    <div className="relative">
                      <Input
                        value={loadingNumero ? "Carregando..." : `Medição nº ${proximoNumero || "?"}`}
                        readOnly
                        className="bg-muted font-medium text-center cursor-not-allowed"
                      />
                      {loadingNumero && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Numeração automática sequencial
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Data da Medição:</label>
                    <Input
                      type="date"
                      value={formData.data_medicao}
                      onChange={(e) => setFormData({...formData, data_medicao: e.target.value})}
                      required
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-sm font-medium">Valor Total:</label>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(calcularValorTotal())}
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium">Descrição Geral:</label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      placeholder="Descreva os serviços executados nesta medição..."
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium">Observações Gerais:</label>
                    <Textarea
                      value={formData.observacoes_fornecedor}
                      onChange={(e) => setFormData({...formData, observacoes_fornecedor: e.target.value})}
                      placeholder="Observações sobre esta medição..."
                    />
                  </div>
                </div>

                {/* Itens por categoria */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Itens do Contrato</h3>
                  
                  {Object.entries(itensAgrupados).map(([categoria, itens]) => {
                    const totalItens = itens.length;
                    const itensCompletos = itens.filter(item => (percentuaisAcumulados[item.item_id] || 0) >= 100).length;
                    const valorTotalCategoria = itens.reduce((sum, item) => sum + item.valor_estimado, 0);
                    const valorExecutadoCategoria = itens.reduce((sum, item) => {
                      const percentualAcumulado = percentuaisAcumulados[item.item_id] || 0;
                      return sum + (item.valor_estimado * percentualAcumulado / 100);
                    }, 0);
                    const valorDisponivelCategoria = valorTotalCategoria - valorExecutadoCategoria;
                    
                    return (
                      <div key={categoria} className="space-y-3">
                        {/* Header da Categoria com Resumo */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-primary text-lg">{categoria}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {itensCompletos}/{totalItens} concluídos
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium text-green-600">
                                  {formatCurrency(valorDisponivelCategoria)} disponível
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Total da Categoria</div>
                              <div className="font-medium">{formatCurrency(valorTotalCategoria)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Já Executado</div>
                              <div className="font-medium">{formatCurrency(valorExecutadoCategoria)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Saldo Disponível</div>
                              <div className="font-bold text-green-600">{formatCurrency(valorDisponivelCategoria)}</div>
                            </div>
                          </div>
                          
                          <Progress 
                            value={(valorExecutadoCategoria / valorTotalCategoria) * 100} 
                            className="h-2 mt-2"
                          />
                        </div>
                        
                        <div className="space-y-3">
                        {itens.map((item) => {
                          const percentualAcumulado = percentuaisAcumulados[item.item_id] || 0;
                          const percentualMaximo = 100 - percentualAcumulado;
                          const percentualAtual = itensMedicao[item.item_id]?.percentual_executado || 0;
                          const valorItem = item.valor_estimado * percentualAtual / 100;
                          const valorDisponivel = item.valor_estimado * percentualMaximo / 100;
                          const itemStatus = getItemStatus(percentualAcumulado);
                          const isCompleted = percentualAcumulado >= 100;
                          const isNearlyComplete = percentualAcumulado >= 80 && percentualAcumulado < 100;
                          
                          return (
                            <div key={item.item_id} className={`border rounded-lg p-4 space-y-3 ${isCompleted ? 'opacity-60 bg-muted/20' : 'bg-background'}`}>
                              {/* Header do Item com Status */}
                              <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium">{item.nome}</h5>
                                    <div className={`w-2 h-2 rounded-full ${itemStatus.color}`} />
                                    <Badge 
                                      variant={isCompleted ? "secondary" : "default"} 
                                      className="text-xs"
                                    >
                                      {itemStatus.label}
                                    </Badge>
                                    {isNearlyComplete && (
                                      <Badge variant="outline" className="text-xs text-yellow-600">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Baixo Saldo
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {item.descricao && (
                                    <p className="text-sm text-muted-foreground">{item.descricao}</p>
                                  )}
                                  
                                  {item.ambientes.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {item.ambientes.map((ambiente, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {ambiente}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-right space-y-1">
                                  <div className="text-lg font-bold text-primary">
                                    {formatCurrency(valorItem)}
                                  </div>
                                  {percentualAtual > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      {percentualAtual}% medido
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Informações de Saldo Disponível */}
                              <div className="bg-muted/30 rounded-md p-3 space-y-2">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <div className="text-muted-foreground">Valor Original</div>
                                    <div className="font-medium">{formatCurrency(item.valor_estimado)}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Já Executado</div>
                                    <div className="font-medium">{formatCurrency(item.valor_estimado * percentualAcumulado / 100)}</div>
                                    <div className="text-xs text-muted-foreground">{percentualAcumulado}%</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      Saldo Disponível
                                    </div>
                                    <div className="font-bold text-green-600">{formatCurrency(valorDisponivel)}</div>
                                    <div className="text-xs text-green-600">{percentualMaximo}% disponível</div>
                                  </div>
                                </div>
                                
                                {/* Barra de progresso melhorada */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Progresso do Item</span>
                                    <span>{percentualAcumulado}% de 100%</span>
                                  </div>
                                  <Progress value={percentualAcumulado} className="h-2" />
                                </div>
                              </div>
                              
                              {/* Input de medição com melhor UX */}
                              {!isCompleted && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-1">
                                      <Percent className="h-3 w-3" />
                                      Percentual a Medir Agora
                                    </label>
                                    
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={percentualMaximo}
                                        step="0.1"
                                        value={percentualAtual || ''}
                                        onChange={(e) => handlePercentualChange(item.item_id, parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className={`flex-1 ${percentualAtual > percentualMaximo ? 'border-red-500' : ''}`}
                                        disabled={isCompleted}
                                      />
                                      <span className="flex items-center text-sm text-muted-foreground min-w-[20px]">%</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      {percentualMaximo > 0 && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => usarSaldoCompleto(item.item_id)}
                                          className="text-xs"
                                        >
                                          <Zap className="h-3 w-3 mr-1" />
                                          Usar Saldo Completo ({percentualMaximo}%)
                                        </Button>
                                      )}
                                      
                                      {percentualAtual > 0 && (
                                        <div className="text-xs text-right">
                                          <div className="font-medium text-primary">
                                            = {formatCurrency(valorItem)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {percentualAtual > percentualMaximo && (
                                      <div className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Valor excede saldo disponível ({percentualMaximo}%)
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Observações do Item</label>
                                    <Textarea
                                      value={itensMedicao[item.item_id]?.observacoes || ''}
                                      onChange={(e) => handleObservacaoChange(item.item_id, e.target.value)}
                                      placeholder="Observações específicas deste item..."
                                      className="resize-none"
                                      rows={3}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Indicador para item concluído */}
                              {isCompleted && (
                                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Item 100% executado - não pode ser medido novamente
                                </div>
                              )}
                            </div>
                          );
                         })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="submit"
                    disabled={Object.values(itensMedicao).every(item => item.percentual_executado === 0)}
                  >
                    Enviar Medição - {formatCurrency(calcularValorTotal())}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Crie medições detalhadas baseadas nos itens do seu contrato. 
          Informe o percentual executado de cada item para cálculo automático dos valores.
        </p>
      </CardContent>
    </Card>
    </div>
  );
};