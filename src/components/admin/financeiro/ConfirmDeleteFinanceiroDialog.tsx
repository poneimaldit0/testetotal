import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Loader2, Calendar, DollarSign } from 'lucide-react';
import type { ContaReceber, ContaPagar, ContaRecorrenteInfo, ExclusaoRecorrenteOptions } from '@/types/financeiro';
import { useFinanceiro } from '@/hooks/useFinanceiro';

interface ConfirmDeleteFinanceiroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contaIds: string[]) => Promise<void>;
  conta: ContaReceber | ContaPagar | null;
  isLoading: boolean;
}

export const ConfirmDeleteFinanceiroDialog: React.FC<ConfirmDeleteFinanceiroDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conta,
  isLoading
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [opcaoExclusao, setOpcaoExclusao] = useState<'apenas_atual' | 'todas_abertas'>('apenas_atual');
  const [infoRecorrente, setInfoRecorrente] = useState<ContaRecorrenteInfo | null>(null);
  const [loadingRecorrente, setLoadingRecorrente] = useState(false);
  const [erroRecorrente, setErroRecorrente] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const { buscarContasRecorrenteRelacionadas } = useFinanceiro();
  
  // Memoizar dados da conta para evitar re-renders
  const dadosConta = useMemo(() => {
    if (!conta) return null;
    
    return {
      id: conta.id,
      shortId: conta.id.slice(-8),
      isContaReceber: 'cliente_nome' in conta,
      clienteFornecedor: 'cliente_nome' in conta ? (conta as ContaReceber).cliente_nome : (conta as ContaPagar).fornecedor_nome,
      tipo: 'cliente_nome' in conta ? 'Conta a Receber' : 'Conta a Pagar'
    };
  }, [conta]);

  // Usar useCallback para estabilizar a função de verificação
  const verificarRecorrencia = useCallback(async (conta: ContaReceber | ContaPagar) => {
    console.log('[MODAL] Iniciando verificação de recorrência para conta:', conta.id);
    
    // Cancelar consulta anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoadingRecorrente(true);
    setErroRecorrente(false);
    setInfoRecorrente(null);
    
    // Criar nova instância de AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      // Timeout de segurança reduzido para 3 segundos
      timeoutRef.current = setTimeout(() => {
        console.log('[MODAL] Timeout na verificação de recorrência');
        setLoadingRecorrente(false);
        setErroRecorrente(true);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 3000);
      
      const info = await buscarContasRecorrenteRelacionadas(conta);
      
      // Verificar se não foi cancelado
      if (!abortControllerRef.current?.signal.aborted) {
        console.log('[MODAL] Informações de recorrência obtidas:', info);
        setInfoRecorrente(info);
        setLoadingRecorrente(false);
        clearTimeout(timeoutRef.current);
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('[MODAL] Erro ao verificar recorrência:', error);
        setErroRecorrente(true);
        setLoadingRecorrente(false);
        clearTimeout(timeoutRef.current);
      }
    }
  }, [buscarContasRecorrenteRelacionadas]);
  
  // Buscar informações de recorrência quando o modal abre
  useEffect(() => {
    if (isOpen && conta) {
      verificarRecorrencia(conta);
    }
    
    // Cleanup ao fechar modal ou desmontar componente
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, conta, verificarRecorrencia]);

  const handleConfirm = async () => {
    if (!conta) return;
    
    const shortId = conta.id.slice(-8);
    const isConfirmValid = confirmText === shortId;
    
    if (isConfirmValid) {
      const isRecorrente = infoRecorrente && infoRecorrente.contas_abertas > 0;
      const contasParaExcluir = opcaoExclusao === 'todas_abertas' && infoRecorrente 
        ? [conta.id, ...infoRecorrente.contas_ids]
        : [conta.id];
        
      await onConfirm(contasParaExcluir);
      setConfirmText('');
      setOpcaoExclusao('apenas_atual');
      onClose();
    }
  };

  const handleClose = () => {
    console.log('[MODAL] Fechando modal');
    
    // Cancelar operações em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset estados
    setConfirmText('');
    setOpcaoExclusao('apenas_atual');
    setInfoRecorrente(null);
    setLoadingRecorrente(false);
    setErroRecorrente(false);
    onClose();
  };

  // Handle null conta case without early return
  if (!conta) {
    return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-w-[90vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Erro</DialogTitle>
          <DialogDescription>
            Nenhuma conta foi selecionada para exclusão.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  }
  
  // Usar dados memoizados
  if (!dadosConta) return null;
  
  const { shortId, isContaReceber, clienteFornecedor, tipo } = dadosConta;
  const isConfirmValid = confirmText === shortId;

  const isRecorrente = infoRecorrente && infoRecorrente.contas_abertas > 0;
  const contasParaExcluir = opcaoExclusao === 'todas_abertas' && infoRecorrente 
    ? [conta.id, ...infoRecorrente.contas_ids]
    : [conta.id];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Exclusão de {tipo}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          <DialogDescription className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-medium mb-2">
                ⚠️ ATENÇÃO: Esta ação é irreversível!
              </p>
              <p className="text-red-700 text-sm">
                Você está prestes a excluir permanentemente {contasParaExcluir.length === 1 ? 'esta conta' : `${contasParaExcluir.length} contas`} e TODOS os dados relacionados:
              </p>
              <ul className="text-red-700 text-sm mt-2 list-disc list-inside space-y-1">
                <li>Todas as transações financeiras relacionadas</li>
                <li>Histórico de pagamentos/recebimentos</li>
                <li>Movimentações bancárias vinculadas</li>
                <li>Registros de auditoria</li>
              </ul>
            </div>

            {/* Informações de Recorrência com Skeleton */}
            {loadingRecorrente && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            )}

            {erroRecorrente && !loadingRecorrente && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800 text-sm">
                    Não foi possível verificar contas recorrentes. A exclusão será feita apenas para esta conta.
                  </span>
                </div>
              </div>
            )}

            {isRecorrente && !loadingRecorrente && !erroRecorrente && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-800 font-medium">Conta Recorrente Detectada</span>
                </div>
                <div className="text-orange-700 text-sm space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <span>Total: <strong>{infoRecorrente.total_contas}</strong></span>
                    <span>Em aberto: <strong>{infoRecorrente.contas_abertas}</strong></span>
                    <span>Freq.: <strong>{infoRecorrente.frequencia}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-xs">Total das abertas: <strong>R$ {infoRecorrente.valor_total.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-orange-800 font-medium text-sm">Escolha uma opção:</Label>
                  <RadioGroup value={opcaoExclusao} onValueChange={(value: 'apenas_atual' | 'todas_abertas') => setOpcaoExclusao(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="apenas_atual" id="apenas_atual" />
                      <Label htmlFor="apenas_atual" className="text-sm">
                        Apenas esta conta (#{shortId})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="todas_abertas" id="todas_abertas" />
                      <Label htmlFor="todas_abertas" className="text-sm">
                        Todas as {infoRecorrente.contas_abertas + 1} contas desta série
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="text-gray-800">
                <p className="font-medium text-sm mb-2">
                  {contasParaExcluir.length === 1 ? 'Detalhes da Conta:' : `Resumo (${contasParaExcluir.length} contas):`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">ID:</span> #{shortId}
                  </div>
                  <div>
                    <span className="font-medium">{isContaReceber ? 'Cliente' : 'Fornecedor'}:</span> {clienteFornecedor}
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span> R$ {conta.valor_original.toFixed(2)}
                    {contasParaExcluir.length > 1 && infoRecorrente && (
                      <span className="text-orange-600 block">(Total: R$ {infoRecorrente.valor_total.toFixed(2)})</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Vencimento:</span> {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-medium text-xs">Descrição:</span> 
                  <span className="text-xs block">{conta.descricao}</span>
                </div>
                {contasParaExcluir.length > 1 && (
                  <p className="text-xs text-orange-600 font-medium mt-2">
                    + {contasParaExcluir.length - 1} conta(s) adicional(is) da série recorrente
                  </p>
                )}
              </div>
            </div>
          </DialogDescription>

          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                Digite os últimos 8 caracteres do ID: <span className="font-mono font-bold">{shortId}</span>
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite aqui..."
                className="mt-1"
                disabled={isLoading || loadingRecorrente}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading || loadingRecorrente}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading || loadingRecorrente}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              `Excluir ${contasParaExcluir.length === 1 ? 'Conta' : `${contasParaExcluir.length} Contas`}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};