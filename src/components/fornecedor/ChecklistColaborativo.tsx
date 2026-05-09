import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, CheckCircle, AlertCircle, Save, MessageCircle, FileEdit } from 'lucide-react';
import { useChecklistItens } from '@/hooks/useChecklistItens';
import { useChecklistColaborativo } from '@/hooks/useChecklistColaborativo';
import { useToast } from '@/hooks/use-toast';
import { abrirWhatsApp } from '@/utils/orcamentoUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface ChecklistColaborativoProps {
  orcamentoId: string;
  candidaturaId: string;
  dadosContato?: {
    nome: string;
    telefone: string;
    email: string;
  };
  onChecklistConsolidado?: () => void;
  onPreencherProposta?: () => void;
}

export const ChecklistColaborativo = memo<ChecklistColaborativoProps>(({
  orcamentoId,
  candidaturaId,
  dadosContato,
  onChecklistConsolidado,
  onPreencherProposta
}) => {
  // All hooks must be called before any early returns
  const { itemsByCategory, loading: loadingItens } = useChecklistItens();
  const {
    checklistColaborativo,
    minhasContribuicoes,
    loading,
    tempoRestante,
    formatarTempoRestante,
    salvarContribuicoes
  } = useChecklistColaborativo(orcamentoId);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [itensLocal, setItensLocal] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  // All useCallback and useMemo hooks
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

  const isItemSelecionado = useCallback((itemId: string) => {
    // Primeiro verifica estado local, depois contribuições salvas
    if (itemId in itensLocal) {
      return itensLocal[itemId];
    }
    return minhasContribuicoes.some(contrib => contrib.item_id === itemId && contrib.marcado);
  }, [minhasContribuicoes, itensLocal]);

  const getObservacaoItem = useCallback((itemId: string) => {
    // Primeiro verifica estado local, depois contribuições salvas
    if (itemId in observacoes) {
      return observacoes[itemId];
    }
    const contrib = minhasContribuicoes.find(c => c.item_id === itemId);
    return contrib?.observacoes || '';
  }, [minhasContribuicoes, observacoes]);

  const handleItemToggle = useCallback((itemId: string, marcado: boolean) => {
    console.log('🔄 handleItemToggle (local):', { itemId, marcado });
    setItensLocal(prev => ({
      ...prev,
      [itemId]: marcado
    }));
  }, []);

  const handleObservacaoChange = useCallback((itemId: string, novaObservacao: string) => {
    console.log('📝 handleObservacaoChange (local):', { itemId, novaObservacao });
    setObservacoes(prev => ({ ...prev, [itemId]: novaObservacao }));
  }, []);

  const salvarTodasContribuicoes = useCallback(async () => {
    setSalvando(true);
    
    try {
      // Preparar contribuições para salvar
      const contribuicoes: Array<{ itemId: string; marcado: boolean; observacoes?: string }> = [];
      
      // Itens que foram modificados localmente
      Object.keys(itensLocal).forEach(itemId => {
        contribuicoes.push({
          itemId,
          marcado: itensLocal[itemId],
          observacoes: observacoes[itemId] || ''
        });
      });
      
      // Observações que foram modificadas sem alterar o checkbox
      Object.keys(observacoes).forEach(itemId => {
        if (!contribuicoes.find(c => c.itemId === itemId)) {
          contribuicoes.push({
            itemId,
            marcado: isItemSelecionado(itemId),
            observacoes: observacoes[itemId] || ''
          });
        }
      });

      if (contribuicoes.length > 0) {
        const sucesso = await salvarContribuicoes(contribuicoes);
        if (sucesso) {
          // Limpar estado local após salvar
          setItensLocal({});
          setObservacoes({});
          
          toast({
            title: "✅ Contribuições Salvas!",
            description: "Suas contribuições foram registradas. O sistema verificará automaticamente se a fase colaborativa pode ser finalizada.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Nenhuma alteração",
          description: "Não há alterações para salvar",
        });
      }
    } catch (error) {
      console.error('Erro ao salvar contribuições:', error);
    } finally {
      setSalvando(false);
    }
  }, [itensLocal, observacoes, salvarContribuicoes, isItemSelecionado, toast]);

  const getStatusInfo = useMemo(() => {
    if (!checklistColaborativo) {
      return {
        status: 'Aguardando criação',
        color: 'bg-muted',
        icon: AlertCircle
      };
    }

    switch (checklistColaborativo.status) {
      case 'aguardando_primeiro_preenchimento':
        return {
          status: 'Aguardando primeira contribuição',
          color: 'bg-warning/10 text-warning-foreground',
          icon: Clock
        };
      case 'fase_colaborativa_ativa':
      case 'fase_colaborativa':
        return {
          status: 'Fase colaborativa ativa',
          color: 'bg-primary/10 text-primary-foreground',
          icon: Users
        };
      case 'consolidado':
      case 'checklist_definido':
        return {
          status: 'Consolidado',
          color: 'bg-success/10 text-success-foreground',
          icon: CheckCircle
        };
      default:
        return {
          status: checklistColaborativo.status,
          color: 'bg-muted',
          icon: AlertCircle
        };
    }
  }, [checklistColaborativo]);

  const podeContribuir = useMemo(() => {
    // Verifica se já fez contribuições
    const jaContribuiu = minhasContribuicoes.length > 0;
    
    // Se o checklist colaborativo não existe ainda, pode contribuir para criar um
    if (!checklistColaborativo) {
      return true; // Permite contribuir mesmo sem checklist ativo
    }
    
    // Se já contribuiu, não pode mais contribuir 
    if (jaContribuiu) {
      return false;
    }
    
    // Verifica se está na fase colaborativa
    return checklistColaborativo?.status === 'aguardando_primeiro_preenchimento' || 
           checklistColaborativo?.status === 'fase_colaborativa_ativa' ||
           checklistColaborativo?.status === 'fase_colaborativa';
  }, [checklistColaborativo, minhasContribuicoes]);

  // Now we can have conditional logic and early returns
  console.log('🧱 ChecklistColaborativo render:', {
    orcamentoId,
    checklistStatus: checklistColaborativo?.status,
    loading,
    loadingItens,
    contribuicoesCount: minhasContribuicoes.length,
    tempoRestante
  });

  const statusInfo = getStatusInfo;
  const StatusIcon = statusInfo.icon;

  if (loadingItens || loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Carregando checklist colaborativo...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não há checklist colaborativo ainda, assumir que pode contribuir para criar um

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                Checklist Colaborativo
              </CardTitle>
              <CardDescription>
                Contribua para o checklist deste orçamento junto com outros fornecedores
              </CardDescription>
            </div>
            
            <Badge className={statusInfo.color}>
              {statusInfo.status}
            </Badge>
          </div>
          
          {checklistColaborativo && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {checklistColaborativo.contribuicoes_recebidas}/{checklistColaborativo.total_fornecedores} contribuições
                </div>
                
                {tempoRestante !== null && tempoRestante > 0 && (
                  <div className="flex items-center gap-1 text-warning-foreground">
                    <Clock className="h-4 w-4" />
                    {formatarTempoRestante(tempoRestante)} restantes
                  </div>
                )}
                
                {checklistColaborativo.status === 'checklist_definido' && (
                  <Badge variant="default" className="bg-success/10 text-success-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Consolidado
                  </Badge>
                )}
              </div>
              
              {/* Indicador de progresso */}
              {checklistColaborativo.status !== 'checklist_definido' && (
                <div className="text-xs text-muted-foreground">
                  {checklistColaborativo.contribuicoes_recebidas >= checklistColaborativo.total_fornecedores 
                    ? "🎯 Todas as contribuições recebidas! Aguardando consolidação..."
                    : `${checklistColaborativo.total_fornecedores - checklistColaborativo.contribuicoes_recebidas} fornecedores restantes`
                  }
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Checklist */}
      {itemsByCategory && Object.keys(itemsByCategory).length > 0 ? (
        // Priorizar status consolidado
        checklistColaborativo?.status === 'checklist_definido' ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <h3 className="font-medium">Checklist Consolidado</h3>
                <p className="text-sm text-muted-foreground">
                  A fase colaborativa foi finalizada. Agora você pode enviar a proposta para o cliente 
                  ou preenchê-la com valores detalhados.
                </p>
                <div className="flex gap-3 justify-center">
                  {dadosContato && (
                    <Button 
                      onClick={() => abrirWhatsApp(
                        dadosContato.telefone, 
                        dadosContato.nome, 
                        `${orcamentoId} - Proposta colaborativa finalizada`
                      )}
                      variant="default"
                      className="goodref-button-primary"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar Proposta
                    </Button>
                  )}
                  {onPreencherProposta && (
                    <Button 
                      onClick={onPreencherProposta}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <FileEdit className="h-4 w-4 mr-2" />
                      Preencher Proposta
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : podeContribuir ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione os itens necessários</CardTitle>
              <CardDescription>
                Marque os itens que considera importantes para este orçamento. 
                Suas seleções serão combinadas com as de outros fornecedores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(itemsByCategory).map(([categoria, items]) => (
              <Collapsible 
                key={categoria} 
                open={expandedCategories.has(categoria)}
                onOpenChange={() => toggleCategory(categoria)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{categoria}</span>
                      <Badge variant="outline">
                        {items.filter(item => isItemSelecionado(item.id)).length}/{items.length}
                      </Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-3">
                  <Separator />
                  {items.map((item) => (
                    <div key={item.id} className="pl-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={isItemSelecionado(item.id)}
                          onCheckedChange={(checked) => 
                            handleItemToggle(item.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor={`item-${item.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.nome}
                          </label>
                          {item.descricao && (
                            <p className="text-xs text-muted-foreground">
                              {item.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="pl-6">
                        <Textarea
                          placeholder="Observações sobre este item (opcional)"
                          value={observacoes[item.id] || getObservacaoItem(item.id)}
                          onChange={(e) => handleObservacaoChange(item.id, e.target.value)}
                          className="text-xs"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
            </CardContent>
            <div className="p-4 border-t">
              <Button 
                onClick={salvarTodasContribuicoes}
                disabled={salvando || (Object.keys(itensLocal).length === 0 && Object.keys(observacoes).length === 0)}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Contribuições'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="font-medium">Aguardando Contribuições</h3>
                <p className="text-sm text-muted-foreground">
                  Você já contribuiu para o checklist. Aguarde outros fornecedores ou faça seu pré-orçamento.
                </p>
                {minhasContribuicoes.length > 0 && (
                  <Button onClick={() => onChecklistConsolidado?.()} className="mt-4">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Fazer Pré-Orçamento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="font-medium">Checklist não disponível</h3>
              <p className="text-sm text-muted-foreground">
                Não há itens de checklist cadastrados no sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});