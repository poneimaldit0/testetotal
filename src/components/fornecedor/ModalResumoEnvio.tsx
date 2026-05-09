import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, CheckSquare, FileText, AlertCircle } from 'lucide-react';
import { FormaPagamentoData } from '@/types/comparacao';

interface ChecklistItem {
  id: string;
  categoria: string;
  nome: string;
  descricao?: string;
  obrigatorio?: boolean;
}

interface RespostaChecklist {
  item_id: string;
  incluido: boolean;
  valor_estimado: number;
  ambientes: string[];
  observacoes?: string;
}

interface ItemExtra {
  id: string;
  nome: string;
  descricao?: string;
  valor_estimado: number;
  ambientes: string[];
  observacoes?: string;
  item_extra: boolean;
}

interface ModalResumoEnvioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmarEnvio: () => void;
  checklistData: { checklistItems: ChecklistItem[]; respostas: RespostaChecklist[]; };
  itensExtras: ItemExtra[];
  valorTotal: number;
  formaPagamento?: FormaPagamentoData[] | null;
  enviando: boolean;
}

export const ModalResumoEnvio: React.FC<ModalResumoEnvioProps> = ({
  open,
  onOpenChange,
  onConfirmarEnvio,
  checklistData,
  itensExtras,
  valorTotal,
  enviando,
  formaPagamento
}) => {
  const { checklistItems, respostas } = checklistData;
  
  // Filtrar apenas itens incluídos na proposta
  const itensIncluidos = respostas.filter(r => r.incluido);
  
  // Agrupar itens por categoria
  const itensAgrupados = itensIncluidos.reduce((acc, resposta) => {
    const item = checklistItems.find(i => i.id === resposta.item_id);
    if (!item) return acc;
    
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push({ item, resposta });
    return acc;
  }, {} as Record<string, Array<{ item: ChecklistItem; resposta: RespostaChecklist }>>);

  // Verificar se há itens obrigatórios não preenchidos
  const itensObrigatoriosNaoIncluidos = checklistItems
    .filter(item => item.obrigatorio)
    .filter(item => !respostas.find(r => r.item_id === item.id && r.incluido));

  const temItensObrigatoriosPendentes = itensObrigatoriosNaoIncluidos.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Resumo da Proposta
          </DialogTitle>
          <DialogDescription>
            Revise os itens incluídos na sua proposta antes do envio definitivo.
            Após o envio, a proposta não poderá ser editada até que o cliente solicite revisões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta para itens obrigatórios */}
          {temItensObrigatoriosPendentes && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Itens obrigatórios não incluídos:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {itensObrigatoriosNaoIncluidos.map(item => (
                      <li key={item.id}>{item.categoria}: {item.nome}</li>
                    ))}
                  </ul>
                  <p className="text-sm">Volte e inclua estes itens ou prossiga se não se aplicam ao seu orçamento.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Valor Total e Forma de Pagamento */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">Valor Total da Proposta</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {formaPagamento && (
              <div className="border-t pt-3">
                <div className="space-y-2">
                  <span className="font-medium text-sm text-muted-foreground">
                    Forma de Pagamento:
                  </span>
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    {formaPagamento && formaPagamento.length > 0 ? (
                      <div className="space-y-2">
                        {formaPagamento.map((forma, idx) => (
                          <div key={idx} className="p-3 bg-muted rounded-md">
                            <span className="font-medium">Opção {idx + 1}:</span>{' '}
                            {forma.tipo === 'a_vista' && (
                              <span>À Vista{forma.desconto_porcentagem ? ` com ${forma.desconto_porcentagem}% de desconto` : ''}</span>
                            )}
                            {forma.tipo === 'entrada_medicoes' && (
                              <span>Entrada de {forma.entrada_porcentagem || 0}% + Medições {forma.frequencia_medicoes || 'conforme execução'}</span>
                            )}
                            {forma.tipo === 'medicoes' && (
                              <span>Medições {forma.frequencia_medicoes || 'conforme execução'}</span>
                            )}
                            {forma.tipo === 'boletos' && (
                              <span>{forma.boletos_quantidade || 1} boleto{(forma.boletos_quantidade || 1) > 1 ? 's' : ''}</span>
                            )}
                            {forma.tipo === 'cartao' && (
                              <span>Cartão em {forma.cartao_parcelas || 1}x</span>
                            )}
                            {forma.tipo === 'personalizado' && (
                              <span>{forma.texto_personalizado}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Não definida</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Itens incluídos por categoria */}
          {Object.keys(itensAgrupados).length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Itens Incluídos ({itensIncluidos.length + itensExtras.length})
              </h3>
              
              {Object.entries(itensAgrupados).map(([categoria, items]) => (
                <div key={categoria} className="border rounded-lg p-4">
                  <h4 className="font-medium text-base mb-3 pb-2 border-b">
                    {categoria}
                  </h4>
                  
                  <div className="space-y-3">
                    {items.map(({ item, resposta }) => (
                      <div key={item.id} className="bg-muted/50 rounded-md p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.nome}</span>
                              {item.obrigatorio && (
                                <Badge variant="destructive" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground">
                                {item.descricao}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              R$ {resposta.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        {resposta.ambientes.length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">Ambientes: </span>
                            <span className="text-sm">{resposta.ambientes.join(', ')}</span>
                          </div>
                        )}
                        
                        {resposta.observacoes && (
                          <div>
                            <span className="text-sm font-medium">Observações: </span>
                            <span className="text-sm">{resposta.observacoes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Seção de Itens Extras */}
              {itensExtras.length > 0 && (
                <div className="border rounded-lg p-4 border-orange-200 bg-orange-50/30">
                  <h4 className="font-medium text-base mb-3 pb-2 border-b border-orange-200 text-orange-800">
                    Itens Extras Incluídos
                  </h4>
                  
                  <div className="space-y-3">
                    {itensExtras.map((itemExtra, index) => (
                      <div key={itemExtra.id || index} className="bg-orange-100/50 rounded-md p-3 border-l-4 border-orange-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{itemExtra.nome}</span>
                              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                ITEM EXTRA
                              </Badge>
                            </div>
                            {itemExtra.descricao && (
                              <p className="text-sm text-muted-foreground">
                                {itemExtra.descricao}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              R$ {itemExtra.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        
                        {itemExtra.ambientes && itemExtra.ambientes.length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">Ambientes: </span>
                            <span className="text-sm">{itemExtra.ambientes.join(', ')}</span>
                          </div>
                        )}
                        
                        {itemExtra.observacoes && (
                          <div>
                            <span className="text-sm font-medium">Observações: </span>
                            <span className="text-sm">{itemExtra.observacoes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            ) : (itensIncluidos.length === 0 && itensExtras.length === 0) ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum item foi selecionado na proposta. Volte e selecione ao menos um item para enviar.
                </AlertDescription>
              </Alert>
            ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviando}
          >
            Voltar e Revisar
          </Button>
          <Button
            onClick={onConfirmarEnvio}
            disabled={enviando || (itensIncluidos.length === 0 && itensExtras.length === 0) || valorTotal <= 0 || !formaPagamento}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {enviando ? 'Enviando...' : 'Confirmar Envio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};