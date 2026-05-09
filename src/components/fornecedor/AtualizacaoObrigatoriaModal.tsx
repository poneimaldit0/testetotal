import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, AlertTriangle, Loader2, Save } from 'lucide-react';
import { OrcamentoPendenteCard } from './OrcamentoPendenteCard';
import { OrcamentoPendente } from '@/hooks/useVerificacaoAtualizacaoDiaria';
import { useStatusAcompanhamento, StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

interface AtualizacaoObrigatoriaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pendencias: OrcamentoPendente[];
  podeUsarConfirmacaoRapida: boolean;
  diasConsecutivos: number;
  onConfirmacaoRapida: () => Promise<void>;
  onConcluir: () => void;
  recarregarOrcamentos?: () => void;
  onStatusUpdated?: (inscricaoId: string, novoStatus: string) => void;
}

export const AtualizacaoObrigatoriaModal: React.FC<AtualizacaoObrigatoriaModalProps> = ({
  isOpen,
  onOpenChange,
  pendencias,
  podeUsarConfirmacaoRapida,
  diasConsecutivos,
  onConfirmacaoRapida,
  onConcluir,
  recarregarOrcamentos,
  onStatusUpdated,
}) => {
  const { atualizarStatus } = useStatusAcompanhamento();
  const [atualizados, setAtualizados] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mudancasPendentes, setMudancasPendentes] = useState<Map<string, StatusAcompanhamento>>(new Map());

  // Agrupar por status do orçamento
  const { abertos, fechados } = useMemo(() => {
    const abertos = pendencias.filter(p => p.status_orcamento === 'aberto');
    const fechados = pendencias.filter(p => p.status_orcamento === 'fechado');
    return { abertos, fechados };
  }, [pendencias]);

  // Considera atualizado se já foi salvo OU se tem mudança pendente
  const todosAtualizados = pendencias.every(p => 
    atualizados.has(p.inscricao_id) || mudancasPendentes.has(p.inscricao_id)
  );

  // Apenas armazena a mudança localmente (sem salvar)
  const handleStatusChange = (inscricaoId: string, novoStatus: StatusAcompanhamento) => {
    setMudancasPendentes(prev => {
      const novo = new Map(prev);
      novo.set(inscricaoId, novoStatus);
      return novo;
    });
  };

  // Salva todas as mudanças pendentes de uma vez
  const handleSalvarTudo = async () => {
    if (mudancasPendentes.size === 0) return;
    
    setIsSubmitting(true);
    try {
      for (const [inscricaoId, novoStatus] of mudancasPendentes) {
        const sucesso = await atualizarStatus(inscricaoId, novoStatus);
        if (sucesso) {
          onStatusUpdated?.(inscricaoId, novoStatus);
          setAtualizados(prev => new Set([...prev, inscricaoId]));
        }
      }
      setMudancasPendentes(new Map());
      recarregarOrcamentos?.();
      
      // Fechar modal automaticamente após salvar no modo rápido
      if (podeUsarConfirmacaoRapida) {
        onConcluir();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmacaoRapida = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmacaoRapida();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarTodos = () => {
    setAtualizados(new Set(pendencias.map(p => p.inscricao_id)));
  };

  const handleConcluir = () => {
    setAtualizados(new Set());
    onConcluir();
  };

  // Sempre bloqueia fechamento manual - usuário deve usar os botões de ação
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Não permite fechar o modal manualmente - deve usar os botões
      return;
    }
    onOpenChange(open);
  };

  const renderGrupo = (titulo: string, itens: OrcamentoPendente[], badgeClass: string) => {
    if (itens.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={badgeClass}>
            {titulo}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({itens.length} {itens.length === 1 ? 'orçamento' : 'orçamentos'})
          </span>
        </div>
        <div className="space-y-2">
          {itens.map((pendencia) => (
            <OrcamentoPendenteCard
              key={pendencia.inscricao_id}
              pendencia={pendencia}
              onStatusChange={handleStatusChange}
              statusPendente={mudancasPendentes.get(pendencia.inscricao_id)}
              foiAtualizado={atualizados.has(pendencia.inscricao_id)}
              modoObrigatorio={!podeUsarConfirmacaoRapida}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-lg max-h-[90vh] overflow-hidden grid grid-rows-[auto,1fr] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Atualize seus Orçamentos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Alerta quando bloqueado (5+ dias) */}
          {!podeUsarConfirmacaoRapida && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você confirmou rapidamente nos últimos {diasConsecutivos} dias. 
                Atualize cada orçamento individualmente para continuar.
              </AlertDescription>
            </Alert>
          )}

          {/* Texto explicativo */}
          <p className="text-sm text-muted-foreground">
            Para continuar se inscrevendo, confirme ou atualize o status dos seus trabalhos:
          </p>

          {/* Botão de confirmação rápida (quando disponível) */}
          {podeUsarConfirmacaoRapida && (
            <>
              <Button
                onClick={handleConfirmacaoRapida}
                disabled={isSubmitting}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar que todos estão atualizados
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou atualize individualmente</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {/* Contador de progresso (modo obrigatório) */}
          {!podeUsarConfirmacaoRapida && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">Progresso:</span>
              <Badge variant={todosAtualizados ? 'default' : 'secondary'}>
                {atualizados.size + mudancasPendentes.size} / {pendencias.length} atualizados
              </Badge>
            </div>
          )}

          {/* Botão confirmar todos (modo obrigatório) */}
          {!podeUsarConfirmacaoRapida && !todosAtualizados && (
            <Button
              onClick={handleConfirmarTodos}
              variant="outline"
              className="w-full h-12 border-primary text-primary hover:bg-primary/10"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar que todos estão atualizados
            </Button>
          )}
          {mudancasPendentes.size > 0 && (
            <Button
              onClick={handleSalvarTudo}
              disabled={isSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar {mudancasPendentes.size} {mudancasPendentes.size === 1 ? 'alteração' : 'alterações'}
                </>
              )}
            </Button>
          )}

          {/* Lista de pendências agrupadas */}
          <ScrollArea className="flex-1 min-h-0 overflow-auto -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {renderGrupo('Abertos', abertos, 'bg-green-100 text-green-700 border-green-200')}
              {renderGrupo('Fechados', fechados, 'bg-gray-100 text-gray-600 border-gray-200')}
            </div>
          </ScrollArea>

          {/* Botão continuar (modo obrigatório) */}
          {!podeUsarConfirmacaoRapida && (
            <Button
              onClick={handleConcluir}
              disabled={!todosAtualizados}
              className="w-full"
            >
              Continuar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
