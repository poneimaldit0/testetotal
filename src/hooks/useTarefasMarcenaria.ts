import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TarefaMarcenaria } from "@/types/crmMarcenaria";

export function useTarefasMarcenaria(leadId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar tarefas do lead
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas-marcenaria", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_marcenaria_tarefas")
        .select("*")
        .eq("lead_id", leadId)
        .order("data_vencimento", { ascending: true });
      
      if (error) throw error;
      return data as TarefaMarcenaria[];
    },
    enabled: !!leadId
  });
  
  // Adicionar tarefa
  const adicionarTarefa = useMutation({
    mutationFn: async (dados: {
      leadId: string;
      titulo: string;
      descricao?: string;
      dataVencimento: string;
      autorNome: string;
    }) => {
      console.log("🔍 [useTarefasMarcenaria] Dados recebidos:", dados);
      
      const user = await supabase.auth.getUser();
      console.log("🔍 [useTarefasMarcenaria] User ID atual:", user.data.user?.id);
      console.log("🔍 [useTarefasMarcenaria] User email:", user.data.user?.email);
      
      // Verificar se o lead pertence ao usuário
      const { data: leadData, error: leadError } = await supabase
        .from("crm_marcenaria_leads")
        .select("id, consultor_responsavel_id, cliente_nome")
        .eq("id", dados.leadId)
        .single();
      
      console.log("🔍 [useTarefasMarcenaria] Lead data:", leadData);
      console.log("🔍 [useTarefasMarcenaria] Lead error:", leadError);
      
      const payload = {
        lead_id: dados.leadId,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        data_vencimento: dados.dataVencimento,
        criado_por_id: user.data.user?.id,
        criado_por_nome: dados.autorNome
      };
      
      console.log("🔍 [useTarefasMarcenaria] Payload para insert:", payload);
      
      const { data, error } = await supabase
        .from("crm_marcenaria_tarefas")
        .insert(payload)
        .select();
      
      if (error) {
        console.error("❌ [useTarefasMarcenaria] Erro detalhado:", error);
        console.error("❌ [useTarefasMarcenaria] Error code:", error.code);
        console.error("❌ [useTarefasMarcenaria] Error message:", error.message);
        console.error("❌ [useTarefasMarcenaria] Error details:", error.details);
        console.error("❌ [useTarefasMarcenaria] Error hint:", error.hint);
        throw error;
      }
      
      console.log("✅ [useTarefasMarcenaria] Tarefa criada:", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-marcenaria", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads-marcenaria"] });
      toast({ title: "Tarefa criada com sucesso!" });
    },
    onError: (error) => {
      console.error("Erro ao criar tarefa:", error);
      toast({ 
        title: "Erro ao criar tarefa", 
        description: "Tente novamente",
        variant: "destructive" 
      });
    }
  });
  
  // Concluir/reabrir tarefa
  const toggleTarefa = useMutation({
    mutationFn: async (dados: {
      tarefaId: string;
      concluida: boolean;
      autorNome: string;
    }) => {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from("crm_marcenaria_tarefas")
        .update({
          concluida: dados.concluida,
          data_conclusao: dados.concluida ? new Date().toISOString() : null,
          concluida_por_id: dados.concluida ? user.data.user?.id : null,
          concluida_por_nome: dados.concluida ? dados.autorNome : null
        })
        .eq("id", dados.tarefaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-marcenaria", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads-marcenaria"] });
      queryClient.invalidateQueries({ queryKey: ["produtividade-checklist"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar tarefa:", error);
      toast({ 
        title: "Erro ao atualizar tarefa", 
        variant: "destructive" 
      });
    }
  });
  
  // Editar tarefa
  const editarTarefa = useMutation({
    mutationFn: async (dados: {
      tarefaId: string;
      titulo: string;
      descricao?: string;
      dataVencimento: string;
    }) => {
      const { error } = await supabase
        .from("crm_marcenaria_tarefas")
        .update({
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          data_vencimento: dados.dataVencimento
        })
        .eq("id", dados.tarefaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-marcenaria", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads-marcenaria"] });
      toast({ title: "Tarefa atualizada!" });
    },
    onError: (error) => {
      console.error("Erro ao editar tarefa:", error);
      toast({ 
        title: "Erro ao editar tarefa", 
        variant: "destructive" 
      });
    }
  });
  
  // Deletar tarefa
  const deletarTarefa = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from("crm_marcenaria_tarefas")
        .delete()
        .eq("id", tarefaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-marcenaria", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads-marcenaria"] });
      toast({ title: "Tarefa excluída!" });
    },
    onError: (error) => {
      console.error("Erro ao deletar tarefa:", error);
      toast({ 
        title: "Erro ao deletar tarefa", 
        variant: "destructive" 
      });
    }
  });
  
  return {
    tarefas,
    isLoading,
    adicionarTarefa: adicionarTarefa.mutateAsync,
    isAdicionando: adicionarTarefa.isPending,
    toggleTarefa: toggleTarefa.mutateAsync,
    editarTarefa: editarTarefa.mutateAsync,
    isEditando: editarTarefa.isPending,
    deletarTarefa: deletarTarefa.mutateAsync,
    isDeletando: deletarTarefa.isPending
  };
}
