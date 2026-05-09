import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useChecklistItens } from '@/hooks/useChecklistItens';
import { useChecklistColaborativo } from '@/hooks/useChecklistColaborativo';
import { usePreOrcamento } from '@/hooks/usePreOrcamento';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface PreOrcamentoColaborativoProps {
  orcamentoId: string;
  candidaturaId: string;
  onVoltar: () => void;
  onConcluido: () => void;
}

interface ItemOrcamento {
  itemId: string;
  incluido: boolean;
  valorEstimado: number;
  observacoes: string;
  ambientes: string[];
}

const AMBIENTES_OPCOES = [
  'Sala de estar', 'Sala de jantar', 'Cozinha', 'Quarto principal', 
  'Quarto 2', 'Quarto 3', 'Banheiro social', 'Banheiro suíte',
  'Área de serviço', 'Varanda', 'Hall de entrada', 'Todos os ambientes'
];

export const PreOrcamentoColaborativo = memo<PreOrcamentoColaborativoProps>(({
  orcamentoId,
  candidaturaId,
  onVoltar,
  onConcluido
}) => {
  const { itemsByCategory, loading: loadingItens } = useChecklistItens();
  const { minhasContribuicoes, checklistColaborativo } = useChecklistColaborativo(orcamentoId);
  const { salvarPreOrcamento, carregarPreOrcamento, loading: salvandoOrcamento } = usePreOrcamento(candidaturaId);
  const { toast } = useToast();

  const [itensOrcamento, setItensOrcamento] = useState<Record<string, ItemOrcamento>>({});
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Itens que foram marcados no checklist colaborativo
  const itensContribuidos = useMemo(() => {
    return minhasContribuicoes
      .filter(contrib => contrib.marcado)
      .map(contrib => contrib.item_id);
  }, [minhasContribuicoes]);

  // Carregar dados existentes do pré-orçamento
  useEffect(() => {
    const carregarDadosExistentes = async () => {
      console.log('🔄 Carregando dados existentes do pré-orçamento para candidatura:', candidaturaId);
      const dadosExistentes = await carregarPreOrcamento();
      
      if (dadosExistentes && dadosExistentes.respostas_checklist && dadosExistentes.respostas_checklist.length > 0) {
        console.log('✅ Dados existentes encontrados, preenchendo formulário:', dadosExistentes);
        
        // Preencher observações gerais
        setObservacoesGerais(dadosExistentes.observacoes || '');
        
        // Preencher itens do orçamento com dados salvos
        const itensCarregados: Record<string, ItemOrcamento> = {};
        
        dadosExistentes.respostas_checklist.forEach((resposta: any) => {
          itensCarregados[resposta.item_id] = {
            itemId: resposta.item_id,
            incluido: resposta.incluido,
            valorEstimado: resposta.valor_estimado || 0,
            observacoes: resposta.observacoes || '',
            ambientes: resposta.ambientes || []
          };
        });
        
        setItensOrcamento(itensCarregados);
      } else {
        console.log('🔍 Nenhum pré-orçamento salvo encontrado, inicializando com dados do checklist');
        // Se não há dados salvos, inicializar com base nas contribuições do checklist
        if (itensContribuidos.length > 0) {
          const novosItens: Record<string, ItemOrcamento> = {};
          
          itensContribuidos.forEach(itemId => {
            const contrib = minhasContribuicoes.find(c => c.item_id === itemId);
            novosItens[itemId] = {
              itemId,
              incluido: true,
              valorEstimado: 0,
              observacoes: contrib?.observacoes || '',
              ambientes: []
            };
          });
          
          setItensOrcamento(novosItens);
        }
      }
    };
    
    if (candidaturaId && minhasContribuicoes.length >= 0) {
      carregarDadosExistentes();
    }
  }, [candidaturaId, carregarPreOrcamento, itensContribuidos, minhasContribuicoes]);

  const toggleCategory = useCallback((categoria: string) => {
    setExpandedCategories(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(categoria)) {
        newExpanded.delete(categoria);
      } else {
        newExpanded.add(categoria);
      }
      return newExpanded;
    });
  }, []);

  const updateItemOrcamento = useCallback((itemId: string, field: keyof ItemOrcamento, value: any) => {
    setItensOrcamento(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  }, []);

  const handleAmbienteToggle = useCallback((itemId: string, ambiente: string) => {
    setItensOrcamento(prev => {
      const item = prev[itemId] || { itemId, incluido: true, valorEstimado: 0, observacoes: '', ambientes: [] };
      const ambientes = item.ambientes.includes(ambiente)
        ? item.ambientes.filter(a => a !== ambiente)
        : [...item.ambientes, ambiente];
      
      return {
        ...prev,
        [itemId]: {
          ...item,
          ambientes
        }
      };
    });
  }, []);

  const valorTotalEstimado = useMemo(() => {
    return Object.values(itensOrcamento)
      .filter(item => item.incluido)
      .reduce((total, item) => total + (item.valorEstimado || 0), 0);
  }, [itensOrcamento]);

  const handleSalvarPreOrcamento = useCallback(async () => {
    try {
      const itensParaSalvar = Object.values(itensOrcamento).filter(item => item.incluido);
      
      if (itensParaSalvar.length === 0) {
        toast({
          title: "Atenção",
          description: "Selecione pelo menos um item para o orçamento",
          variant: "destructive",
        });
        return;
      }

      const sucesso = await salvarPreOrcamento({
        itens: itensParaSalvar,
        valorTotal: valorTotalEstimado,
        observacoesGerais
      });

      if (sucesso) {
        toast({
          title: "Sucesso",
          description: "Pré-orçamento salvo com sucesso!",
        });
        onConcluido();
      }
    } catch (error) {
      console.error('Erro ao salvar pré-orçamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pré-orçamento",
        variant: "destructive",
      });
    }
  }, [itensOrcamento, valorTotalEstimado, observacoesGerais, salvarPreOrcamento, toast, onConcluido]);

  if (loadingItens) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Carregando pré-orçamento...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pré-Orçamento Colaborativo
              </CardTitle>
              <CardDescription>
                Defina valores estimados para os itens selecionados no checklist colaborativo
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onVoltar}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Object.values(itensOrcamento).filter(item => item.incluido).length}
              </div>
              <div className="text-sm text-muted-foreground">Itens Incluídos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                R$ {valorTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground">Valor Total Estimado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {itensContribuidos.length}
              </div>
              <div className="text-sm text-muted-foreground">Itens do Checklist</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorias de Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens por Categoria</CardTitle>
          <CardDescription>
            Defina valores e observações para os itens selecionados no checklist colaborativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(itemsByCategory).map(([categoria, items]) => {
            const itensCategoria = items.filter(item => itensContribuidos.includes(item.id));
            
            if (itensCategoria.length === 0) return null;

            return (
              <Collapsible
                key={categoria}
                open={expandedCategories.has(categoria)}
                onOpenChange={() => toggleCategory(categoria)}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{categoria}</span>
                    <Badge variant="secondary">
                      {itensCategoria.length} {itensCategoria.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-3 pt-3">
                  <Separator />
                  {itensCategoria.map((item) => {
                    const itemOrcamento = itensOrcamento[item.id] || {
                      itemId: item.id,
                      incluido: true,
                      valorEstimado: 0,
                      observacoes: '',
                      ambientes: []
                    };

                    return (
                      <div key={item.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.nome}</h4>
                              {itemOrcamento.incluido ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground">
                                {item.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              Valor Estimado (R$)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={itemOrcamento.valorEstimado}
                              onChange={(e) => updateItemOrcamento(item.id, 'valorEstimado', parseFloat(e.target.value) || 0)}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              Ambientes
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {AMBIENTES_OPCOES.map(ambiente => (
                                <div key={ambiente} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={itemOrcamento.ambientes.includes(ambiente)}
                                    onCheckedChange={() => handleAmbienteToggle(item.id, ambiente)}
                                    className="h-3 w-3"
                                  />
                                  <span className="text-xs">{ambiente}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Observações Específicas
                          </label>
                          <Textarea
                            value={itemOrcamento.observacoes}
                            onChange={(e) => updateItemOrcamento(item.id, 'observacoes', e.target.value)}
                            placeholder="Observações específicas sobre este item..."
                            rows={2}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Gerais do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
            placeholder="Observações gerais sobre o orçamento, prazo de execução, condições especiais, etc..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onVoltar} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Checklist
            </Button>
            <Button 
              onClick={handleSalvarPreOrcamento}
              disabled={salvandoOrcamento || valorTotalEstimado === 0}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {salvandoOrcamento ? 'Salvando...' : 'Salvar Pré-Orçamento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});