import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeadMarcenariaComChecklist, HistoricoMarcenaria, EtapaMarcenaria, MotivoPerda_Marcenaria } from "@/types/crmMarcenaria";
import { Profile } from "@/types/supabase";

export function useCRMMarcenaria(profile: Profile | null) {
  const queryClient = useQueryClient();

  // Buscar leads
  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-marcenaria-leads"],
    queryFn: async () => {
      let query = supabase
        .from("view_crm_marcenaria_leads")
        .select("*")
        .order("created_at", { ascending: false });

    // Consultores de marcenaria veem apenas seus leads apropriados
    // Gestores de marcenaria, customer success e admins veem todos
    const isAdmin = profile?.tipo_usuario === 'master' || profile?.tipo_usuario === 'admin';
    const isGestorMarcenaria = profile?.tipo_usuario === 'gestor_marcenaria';
    const isCustomerSuccess = profile?.tipo_usuario === 'customer_success';
    const isConsultorMarcenaria = profile?.tipo_usuario === 'consultor_marcenaria';

    // Apenas consultor_marcenaria vê leads filtrados por apropriação
    if (isConsultorMarcenaria && !isAdmin) {
      query = query.eq("consultor_responsavel_id", profile.id);
    }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as LeadMarcenariaComChecklist[];
    },
    enabled: !!profile
  });

  // Buscar histórico de um lead
  const buscarHistorico = async (leadId: string): Promise<HistoricoMarcenaria[]> => {
    const { data, error } = await supabase
      .from("crm_marcenaria_historico")
      .select("*")
      .eq("lead_id", leadId)
      .order("data_movimentacao", { ascending: false });

    if (error) throw error;
    return data as HistoricoMarcenaria[];
  };

  // Buscar motivos de perda
  const { data: motivosPerda = [] } = useQuery({
    queryKey: ["motivos-perda-marcenaria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motivos_perda_marcenaria")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as MotivoPerda_Marcenaria[];
    }
  });

  // Mover lead para nova etapa
  const moverEtapa = useMutation({
    mutationFn: async ({
      leadId,
      novaEtapa,
      observacao
    }: {
      leadId: string;
      novaEtapa: EtapaMarcenaria;
      observacao?: string;
    }) => {
      const { error } = await supabase.rpc("mover_lead_marcenaria_etapa", {
        p_lead_id: leadId,
        p_nova_etapa: novaEtapa,
        p_observacao: observacao || null
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Lead movido com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao mover lead:", error);
      toast.error("Erro ao mover lead");
    }
  });

  // Atualizar briefing
  const atualizarBriefing = useMutation({
    mutationFn: async ({
      leadId,
      ambientes,
      temPlanta,
      temMedidas,
      temFotos,
      estilo
    }: {
      leadId: string;
      ambientes: string[];
      temPlanta: boolean;
      temMedidas: boolean;
      temFotos: boolean;
      estilo: string;
    }) => {
      const { error } = await supabase
        .from("crm_marcenaria_leads")
        .update({
          ambientes_mobiliar: ambientes,
          tem_planta: temPlanta,
          tem_medidas: temMedidas,
          tem_fotos: temFotos,
          estilo_preferido: estilo
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Briefing atualizado");
    },
    onError: (error) => {
      console.error("Erro ao atualizar briefing:", error);
      toast.error("Erro ao atualizar briefing");
    }
  });

  // Apropriar lead
  const apropriarLead = useMutation({
    mutationFn: async ({ leadId, consultorId }: { leadId: string; consultorId: string | null }) => {
      const { error } = await supabase.rpc("apropriar_lead_marcenaria", {
        p_lead_id: leadId,
        p_consultor_id: consultorId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Lead apropriado com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao apropriar lead:", error);
      toast.error("Erro ao apropriar lead");
    }
  });

  // Marcar como ganho
  const marcarComoGanho = useMutation({
    mutationFn: async ({ leadId, valorContrato }: { leadId: string; valorContrato: number }) => {
      const { error } = await supabase
        .from("crm_marcenaria_leads")
        .update({
          etapa_marcenaria: 'ganho',
          contratado: true,
          valor_contrato: valorContrato,
          data_contratacao: new Date().toISOString()
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Marcenaria contratada! 🎉");
    },
    onError: (error) => {
      console.error("Erro ao marcar como ganho:", error);
      toast.error("Erro ao marcar como ganho");
    }
  });

  // Marcar como perdido
  const marcarComoPerdido = useMutation({
    mutationFn: async ({
      leadId,
      motivoId,
      justificativa
    }: {
      leadId: string;
      motivoId: string;
      justificativa?: string;
    }) => {
      const { error } = await supabase
        .from("crm_marcenaria_leads")
        .update({
          etapa_marcenaria: 'perdido',
          motivo_perda_id: motivoId,
          justificativa_perda: justificativa,
          data_perda: new Date().toISOString()
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Lead marcado como perdido");
    },
    onError: (error) => {
      console.error("Erro ao marcar como perdido:", error);
      toast.error("Erro ao marcar como perdido");
    }
  });

  // Atualizar observações internas
  const atualizarObservacoes = useMutation({
    mutationFn: async ({ leadId, observacoes }: { leadId: string; observacoes: string }) => {
      const { error } = await supabase
        .from("crm_marcenaria_leads")
        .update({ observacoes_internas: observacoes })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
      toast.success("Observações atualizadas");
    }
  });

  // Registrar envio de mensagem
  const registrarMensagemEnviada = useMutation({
    mutationFn: async ({ leadId, numeroMensagem }: { leadId: string; numeroMensagem: 1 | 2 | 3 }) => {
      const updateData: any = {};
      updateData[`mensagem_${numeroMensagem}_enviada`] = true;
      updateData[`mensagem_${numeroMensagem}_enviada_em`] = new Date().toISOString();

      const { error } = await supabase
        .from("crm_marcenaria_leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-marcenaria-leads"] });
    }
  });

  return {
    leads,
    isLoading,
    refetch,
    buscarHistorico,
    motivosPerda,
    moverEtapa: moverEtapa.mutate,
    isMovendo: moverEtapa.isPending,
    atualizarBriefing: atualizarBriefing.mutate,
    apropriarLead: apropriarLead.mutate,
    isApropriando: apropriarLead.isPending,
    marcarComoGanho: marcarComoGanho.mutate,
    isMarcangoGanho: marcarComoGanho.isPending,
    marcarComoPerdido: marcarComoPerdido.mutate,
    isMarcandoPerdido: marcarComoPerdido.isPending,
    atualizarObservacoes: atualizarObservacoes.mutate,
    isAtualizandoObservacoes: atualizarObservacoes.isPending,
    registrarMensagemEnviada: registrarMensagemEnviada.mutate
  };
}
