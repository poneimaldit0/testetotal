import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeletorGestorMarcenaria } from './SeletorGestorMarcenaria';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ApropriarLeadsMarcenariaMassaProps {
  isOpen: boolean;
  onClose: () => void;
  leadsIds: string[];
}

export const ApropriarLeadsMarcenariaMassa = ({
  isOpen,
  onClose,
  leadsIds
}: ApropriarLeadsMarcenariaMassaProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gestorSelecionado, setGestorSelecionado] = useState<string | null>(null);
  const [isApropriando, setIsApropriando] = useState(false);

  const handleApropriar = async () => {
    if (!gestorSelecionado) {
      toast({
        title: "Selecione um gestor",
        description: "É necessário selecionar um gestor de marcenaria",
        variant: "destructive"
      });
      return;
    }

    setIsApropriando(true);
    
    try {
      // Buscar nome do gestor
      const { data: gestorData, error: gestorError } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', gestorSelecionado)
        .single();

      if (gestorError || !gestorData) {
        throw new Error('Gestor não encontrado');
      }

      let sucessos = 0;
      let erros = 0;

      // Apropriar cada lead
      for (const leadId of leadsIds) {
        const { error } = await supabase
          .from('crm_marcenaria_leads')
          .update({
            consultor_responsavel_id: gestorSelecionado,
            consultor_nome: gestorData.nome,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (error) {
          console.error('Erro ao apropriar lead:', leadId, error);
          erros++;
        } else {
          sucessos++;
        }
      }

      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['crm-marcenaria-leads'] });

      if (erros === 0) {
        toast({
          title: "✅ Apropriação concluída",
          description: `${sucessos} lead(s) apropriado(s) com sucesso para ${gestorData.nome}`,
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
        title: "Erro ao apropriar leads",
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
            Apropriar Leads de Marcenaria
          </DialogTitle>
          <DialogDescription>
            Atribuir {leadsIds.length} lead(s) para um gestor de marcenaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Gestor Responsável
            </label>
            <SeletorGestorMarcenaria
              value={gestorSelecionado}
              onValueChange={setGestorSelecionado}
              placeholder="Selecione o gestor de marcenaria"
              permitirRemover={false}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Os leads selecionados serão atribuídos ao gestor escolhido.
              O gestor poderá visualizar e gerenciar apenas os leads apropriados para ele.
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
            Apropriar {leadsIds.length} lead(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
