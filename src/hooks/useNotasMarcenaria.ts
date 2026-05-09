import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotaMarcenaria } from "@/types/crmMarcenaria";

export function useNotasMarcenaria(leadId: string | undefined) {
  const queryClient = useQueryClient();

  // Buscar notas de um lead
  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["crm-marcenaria-notas", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("crm_marcenaria_notas")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NotaMarcenaria[];
    },
    enabled: !!leadId,
  });

  // Adicionar nova nota
  const adicionarNota = useMutation({
    mutationFn: async ({
      leadId,
      conteudo,
      autorNome,
    }: {
      leadId: string;
      conteudo: string;
      autorNome: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_marcenaria_notas")
        .insert({
          lead_id: leadId,
          conteudo,
          criado_por_id: user.id,
          criado_por_nome: autorNome,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotaMarcenaria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-notas", leadId] });
      toast.success("Nota adicionada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao adicionar nota:", error);
      toast.error("Erro ao adicionar nota");
    },
  });

  // Editar nota
  const editarNota = useMutation({
    mutationFn: async ({
      notaId,
      conteudo,
    }: {
      notaId: string;
      conteudo: string;
    }) => {
      const { data, error } = await supabase
        .from("crm_marcenaria_notas")
        .update({ conteudo, editada: true })
        .eq("id", notaId)
        .select()
        .single();

      if (error) throw error;
      return data as NotaMarcenaria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-notas", leadId] });
      toast.success("Nota editada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao editar nota:", error);
      toast.error("Erro ao editar nota");
    },
  });

  // Deletar nota
  const deletarNota = useMutation({
    mutationFn: async (notaId: string) => {
      const { error } = await supabase
        .from("crm_marcenaria_notas")
        .delete()
        .eq("id", notaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-notas", leadId] });
      toast.success("Nota deletada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao deletar nota:", error);
      toast.error("Erro ao deletar nota");
    },
  });

  return {
    notas,
    isLoading,
    adicionarNota: adicionarNota.mutate,
    isAdicionando: adicionarNota.isPending,
    editarNota: editarNota.mutate,
    isEditando: editarNota.isPending,
    deletarNota: deletarNota.mutate,
    isDeletando: deletarNota.isPending,
  };
}
