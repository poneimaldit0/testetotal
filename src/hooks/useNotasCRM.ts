import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotaCRM } from "@/types/crm";

export function useNotasCRM(orcamentoId: string | undefined) {
  const queryClient = useQueryClient();

  // Buscar notas de um orçamento
  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["crm-notas", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];

      const { data, error } = await supabase
        .from("crm_notas_orcamentos")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notas:", error);
        throw error;
      }

      return data as NotaCRM[];
    },
    enabled: !!orcamentoId,
  });

  // Adicionar nova nota
  const adicionarNota = useMutation({
    mutationFn: async ({
      orcamentoId,
      conteudo,
      autorNome,
    }: {
      orcamentoId: string;
      conteudo: string;
      autorNome: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_notas_orcamentos")
        .insert({
          orcamento_id: orcamentoId,
          conteudo,
          criado_por_id: user.id,
          criado_por_nome: autorNome,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotaCRM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notas", orcamentoId] });
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
        .from("crm_notas_orcamentos")
        .update({ conteudo })
        .eq("id", notaId)
        .select()
        .single();

      if (error) throw error;
      return data as NotaCRM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notas", orcamentoId] });
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
        .from("crm_notas_orcamentos")
        .delete()
        .eq("id", notaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notas", orcamentoId] });
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
