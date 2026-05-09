import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeletorGestorConta } from './SeletorGestorConta';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ApropriarOrcamentosGestorProps {
  isOpen: boolean;
  onClose: () => void;
  orcamentosIds: string[];
}

export const ApropriarOrcamentosGestor = ({
  isOpen,
  onClose,
  orcamentosIds
}: ApropriarOrcamentosGestorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gestorSelecionado, setGestorSelecionado] = useState<string | null>(null);
  const [isApropriando, setIsApropriando] = useState(false);

  const handleApropriar = async () => {
    if (!gestorSelecionado) {
      toast({
        title: "Selecione um gestor",
        description: "É necessário selecionar um gestor responsável",
        variant: "destructive"
      });
      return;
    }

    setIsApropriando(true);
    
    try {
      let sucessos = 0;
      let erros = 0;

      for (const orcamentoId of orcamentosIds) {
        const { error } = await supabase
          .from('orcamentos_crm_tracking')
          .update({
            concierge_responsavel_id: gestorSelecionado,
            updated_at: new Date().toISOString()
          })
          .eq('orcamento_id', orcamentoId);

        if (error) {
          console.error('Erro ao apropriar orçamento:', orcamentoId, error);
          erros++;
        } else {
          sucessos++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });

      if (erros === 0) {
        toast({
          title: "✅ Apropriação concluída",
          description: `${sucessos} orçamento(s) apropriado(s) com sucesso`,
        });
      } else {
        toast({
          title: "⚠️ Apropriação parcial",
          description: `${sucessos} apropriados, ${erros} com erro`,
          variant: "destructive"
        });
      }

      onClose();
      setGestorSelecionado(null);
    } catch (error) {
      console.error('Erro na apropriação em massa:', error);
      toast({
        title: "Erro ao apropriar orçamentos",
        description: "Ocorreu um erro durante a apropriação",
        variant: "destructive"
      });
    } finally {
      setIsApropriando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Apropriar Orçamentos
          </DialogTitle>
          <DialogDescription>
            Atribuir {orcamentosIds.length} orçamento(s) para um gestor de conta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Gestor Responsável
            </label>
            <SeletorGestorConta
              value={gestorSelecionado}
              onValueChange={setGestorSelecionado}
              placeholder="Selecione o gestor responsável"
              permitirRemover={false}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Os orçamentos selecionados serão atribuídos ao gestor escolhido.
              O gestor poderá visualizar e gerenciar apenas os orçamentos apropriados para ele.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isApropriando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApropriar}
            disabled={!gestorSelecionado || isApropriando}
          >
            {isApropriando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apropriar {orcamentosIds.length} orçamento(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};