import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TarefaCRM } from "@/types/crm";

export function useTarefasCRM(orcamentoId: string) {
  const queryClient = useQueryClient();

  // Buscar tarefas do orçamento
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas-crm", orcamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_orcamentos_tarefas")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .order("data_vencimento", { ascending: true })
        .order("concluida", { ascending: true });

      if (error) throw error;
      return data as TarefaCRM[];
    },
    enabled: !!orcamentoId,
  });

  // Adicionar nova tarefa
  const adicionarTarefa = useMutation({
    mutationFn: async ({
      titulo,
      descricao,
      dataVencimento,
    }: {
      titulo: string;
      descricao: string;
      dataVencimento: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user?.id)
        .single();

      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_orcamentos_tarefas")
        .insert({
          orcamento_id: orcamentoId,
          titulo,
          descricao,
          data_vencimento: dataVencimento,
          criado_por_id: user.id,
          criado_por_nome: profile?.nome || user.email || "Usuário",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-crm", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["crm-orcamentos"] });
      toast.success("Tarefa adicionada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar tarefa");
    },
  });

  // Alternar conclusão da tarefa
  const toggleTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const tarefa = tarefas.find((t) => t.id === tarefaId);
      if (!tarefa) throw new Error("Tarefa não encontrada");

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar perfil do usuário de forma segura
      let nomeUsuario = user.email || "Usuário";
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", user.id)
          .single();

        if (!profileError && profile?.nome) {
          nomeUsuario = profile.nome;
        }
      } catch (err) {
        console.warn("Erro ao buscar perfil do usuário, usando email como fallback:", err);
      }

      const novaConcluida = !tarefa.concluida;

      const { data, error } = await supabase
        .from("crm_orcamentos_tarefas")
        .update({
          concluida: novaConcluida,
          data_conclusao: novaConcluida ? new Date().toISOString() : null,
          concluida_por_id: novaConcluida ? user.id : null,
          concluida_por_nome: novaConcluida ? nomeUsuario : null,
        })
        .eq("id", tarefaId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar tarefa no banco:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-crm", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["crm-orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["produtividade-checklist"] });
      toast.success("Tarefa atualizada com sucesso");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error(`Erro ao atualizar tarefa: ${error.message || "Erro desconhecido"}`);
    },
  });

  // Editar tarefa
  const editarTarefa = useMutation({
    mutationFn: async ({
      tarefaId,
      titulo,
      descricao,
      dataVencimento,
    }: {
      tarefaId: string;
      titulo: string;
      descricao: string;
      dataVencimento: string;
    }) => {
      const { data, error } = await supabase
        .from("crm_orcamentos_tarefas")
        .update({
          titulo,
          descricao,
          data_vencimento: dataVencimento,
        })
        .eq("id", tarefaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-crm", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["crm-orcamentos"] });
      toast.success("Tarefa atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao editar tarefa:", error);
      toast.error("Erro ao editar tarefa");
    },
  });

  // Deletar tarefa
  const deletarTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from("crm_orcamentos_tarefas")
        .delete()
        .eq("id", tarefaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-crm", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["crm-orcamentos"] });
      toast.success("Tarefa removida com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao deletar tarefa:", error);
      toast.error("Erro ao deletar tarefa");
    },
  });

  return {
    tarefas,
    isLoading,
    adicionarTarefa: adicionarTarefa.mutate,
    isAdicionando: adicionarTarefa.isPending,
    toggleTarefa: toggleTarefa.mutate,
    isTogglando: toggleTarefa.isPending,
    editarTarefa: editarTarefa.mutate,
    isEditando: editarTarefa.isPending,
    deletarTarefa: deletarTarefa.mutate,
    isDeletando: deletarTarefa.isPending,
  };
}
