import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AvaliacaoLead } from '@/types/crm';

export const useAvaliacaoLead = (orcamentoId: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: avaliacao, isLoading } = useQuery({
    queryKey: ['avaliacao-lead', orcamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_avaliacoes_leads')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .maybeSingle();

      if (error) throw error;
      return data as AvaliacaoLead | null;
    },
    enabled: !!orcamentoId,
  });

  const salvarAvaliacaoMutation = useMutation({
    mutationFn: async (dados: Partial<AvaliacaoLead>) => {
      if (!profile) throw new Error('Usuário não autenticado');

      const payload = {
        orcamento_id: orcamentoId,
        perfil_ideal: dados.perfil_ideal ?? false,
        orcamento_compativel: dados.orcamento_compativel ?? false,
        decisor_direto: dados.decisor_direto ?? false,
        prazo_curto: dados.prazo_curto ?? false,
        engajamento_alto: dados.engajamento_alto ?? false,
        fornecedor_consegue_orcar: dados.fornecedor_consegue_orcar ?? false,
        avaliado_por_id: profile.id,
        avaliado_por_nome: profile.nome,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('crm_avaliacoes_leads')
        .upsert(payload, { onConflict: 'orcamento_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacao-lead', orcamentoId] });
      toast({
        title: 'Avaliação salva',
        description: 'A avaliação do lead foi salva com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a avaliação.',
        variant: 'destructive',
      });
    },
  });

  return {
    avaliacao,
    isLoading,
    salvarAvaliacao: salvarAvaliacaoMutation.mutate,
    isSaving: salvarAvaliacaoMutation.isPending,
  };
};
