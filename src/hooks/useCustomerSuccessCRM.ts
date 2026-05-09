import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CSEtapaConfig,
  CSFornecedor,
  CSMicrotreinamento,
  CSOrientacaoIndicador,
  CSRitualSemanal,
  CSPlanoAcao,
  CSHistoricoPipeline,
  CSRitualSemanalFormData,
  CSChecklistSemanaZero,
  StatusAcompanhamento
} from '@/types/customerSuccess';

// =============================================
// ETAPAS DO PIPELINE
// =============================================
export function useCSEtapas() {
  return useQuery({
    queryKey: ['cs-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_etapas_config')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (error) throw error;
      return data as CSEtapaConfig[];
    }
  });
}

// =============================================
// FORNECEDORES NO CS
// =============================================
export function useCSFornecedores() {
  return useQuery({
    queryKey: ['cs-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_fornecedores')
        .select(`
          *,
          fornecedor:profiles!cs_fornecedores_fornecedor_id_fkey(id, nome, email, empresa, telefone, status),
          etapa_atual:cs_etapas_config!cs_fornecedores_etapa_atual_id_fkey(*),
          cs_responsavel:profiles!cs_fornecedores_cs_responsavel_id_fkey(id, nome, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CSFornecedor[];
    }
  });
}

export function useCSFornecedor(id: string | undefined) {
  return useQuery({
    queryKey: ['cs-fornecedor', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('cs_fornecedores')
        .select(`
          *,
          fornecedor:profiles!cs_fornecedores_fornecedor_id_fkey(id, nome, email, empresa, telefone, status),
          etapa_atual:cs_etapas_config!cs_fornecedores_etapa_atual_id_fkey(*),
          cs_responsavel:profiles!cs_fornecedores_cs_responsavel_id_fkey(id, nome, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as CSFornecedor;
    },
    enabled: !!id
  });
}

export function useAdicionarFornecedorCS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      fornecedor_id: string;
      cs_responsavel_id: string;
      etapa_atual_id: string;
    }) => {
      const { data: result, error } = await supabase
        .from('cs_fornecedores')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedores'] });
      toast({ title: 'Fornecedor adicionado ao CS' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar fornecedor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useMoverEtapaCS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      cs_fornecedor_id: string;
      etapa_anterior_id: string | null;
      etapa_nova_id: string;
      movido_por_id: string;
      movido_por_nome: string;
      observacao?: string;
    }) => {
      // Atualizar etapa do fornecedor
      const { error: updateError } = await supabase
        .from('cs_fornecedores')
        .update({ etapa_atual_id: data.etapa_nova_id })
        .eq('id', data.cs_fornecedor_id);
      
      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from('cs_historico_pipeline')
        .insert({
          cs_fornecedor_id: data.cs_fornecedor_id,
          etapa_anterior_id: data.etapa_anterior_id,
          etapa_nova_id: data.etapa_nova_id,
          movido_por_id: data.movido_por_id,
          movido_por_nome: data.movido_por_nome,
          observacao: data.observacao
        });
      
      if (histError) throw histError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedores'] });
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedor'] });
      toast({ title: 'Fornecedor movido de etapa' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao mover fornecedor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useAtualizarStatusFornecedorCS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; status: StatusAcompanhamento }) => {
      const { error } = await supabase
        .from('cs_fornecedores')
        .update({ status: data.status })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedores'] });
      toast({ title: 'Status atualizado' });
    }
  });
}

// =============================================
// MICROTREINAMENTOS
// =============================================
export function useCSMicrotreinamentos() {
  return useQuery({
    queryKey: ['cs-microtreinamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_microtreinamentos')
        .select('*')
        .eq('ativo', true)
        .order('semana');
      
      if (error) throw error;
      return data as CSMicrotreinamento[];
    }
  });
}

export function useCSMicrotreinamento(semana: number) {
  // Semana cíclica: semana 13 usa treinamento da semana 1, etc.
  const semanaCiclica = semana > 12 ? ((semana - 1) % 12) + 1 : semana;
  
  return useQuery({
    queryKey: ['cs-microtreinamento', semanaCiclica],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_microtreinamentos')
        .select('*')
        .eq('semana', semanaCiclica)
        .eq('ativo', true)
        .single();
      
      if (error) throw error;
      return data as CSMicrotreinamento;
    },
    enabled: semana >= 1 && semana <= 52
  });
}

// =============================================
// ORIENTAÇÕES POR INDICADOR
// =============================================
export function useCSOrientacoes() {
  return useQuery({
    queryKey: ['cs-orientacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_orientacoes_indicadores')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (error) throw error;
      return data as CSOrientacaoIndicador[];
    }
  });
}

// =============================================
// RITUAIS SEMANAIS
// =============================================
export function useCSRituaisFornecedor(csFornecedorId: string | undefined) {
  return useQuery({
    queryKey: ['cs-rituais', csFornecedorId],
    queryFn: async () => {
      if (!csFornecedorId) return [];
      
      const { data, error } = await supabase
        .from('cs_rituais_semanais')
        .select('*')
        .eq('cs_fornecedor_id', csFornecedorId)
        .order('semana');
      
      if (error) throw error;
      return data as CSRitualSemanal[];
    },
    enabled: !!csFornecedorId
  });
}

export function useCSRitualSemana(csFornecedorId: string | undefined, semana: number) {
  return useQuery({
    queryKey: ['cs-ritual', csFornecedorId, semana],
    queryFn: async () => {
      if (!csFornecedorId) return null;
      
      const { data, error } = await supabase
        .from('cs_rituais_semanais')
        .select('*')
        .eq('cs_fornecedor_id', csFornecedorId)
        .eq('semana', semana)
        .maybeSingle();
      
      if (error) throw error;
      return data as CSRitualSemanal | null;
    },
    enabled: !!csFornecedorId && semana >= 1 && semana <= 52
  });
}

export function useSalvarRitualSemanal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      cs_fornecedor_id: string;
      semana: number;
      formData: CSRitualSemanalFormData;
      concluir: boolean;
      userId: string;
      userName: string;
    }) => {
      const ritualData = {
        cs_fornecedor_id: data.cs_fornecedor_id,
        semana: data.semana,
        inscricoes_orcamentos: data.formData.inscricoes_orcamentos,
        visitas_realizadas: data.formData.visitas_realizadas,
        orcamentos_enviados: data.formData.orcamentos_enviados,
        contratos_fechados: data.formData.contratos_fechados,
        compareceu_reuniao: data.formData.compareceu_reuniao,
        status_inscricoes: data.formData.status_inscricoes,
        status_visitas: data.formData.status_visitas,
        status_orcamentos: data.formData.status_orcamentos,
        status_contratos: data.formData.status_contratos,
        orientacoes_aplicadas: data.formData.orientacoes_aplicadas,
        feedback_concierge_consultado: data.formData.feedback_concierge_consultado,
        tipo_feedback_concierge: data.formData.tipo_feedback_concierge,
        observacao_feedback_concierge: data.formData.observacao_feedback_concierge,
        microtreinamento_id: data.formData.microtreinamento_id || null,
        treinamento_aplicado: data.formData.treinamento_aplicado,
        observacao_treinamento: data.formData.observacao_treinamento,
        ...(data.concluir && {
          concluido: true,
          concluido_por_id: data.userId,
          concluido_por_nome: data.userName,
          data_conclusao: new Date().toISOString()
        })
      };

      // Upsert ritual
      const { data: ritual, error: ritualError } = await supabase
        .from('cs_rituais_semanais')
        .upsert(ritualData, { onConflict: 'cs_fornecedor_id,semana' })
        .select()
        .single();

      if (ritualError) throw ritualError;

      // Deletar planos antigos e inserir novos
      await supabase
        .from('cs_planos_acao')
        .delete()
        .eq('ritual_semanal_id', ritual.id);

      const planosValidos = data.formData.planos_acao.filter(p => p.trim());
      if (planosValidos.length > 0) {
        const { error: planosError } = await supabase
          .from('cs_planos_acao')
          .insert(
            planosValidos.map((descricao, idx) => ({
              ritual_semanal_id: ritual.id,
              descricao_acao: descricao,
              ordem: idx + 1
            }))
          );

        if (planosError) throw planosError;
      }

      // Se concluiu, avançar semana do fornecedor (até 52)
      if (data.concluir && data.semana < 52) {
        await supabase
          .from('cs_fornecedores')
          .update({ semana_atual: data.semana + 1 })
          .eq('id', data.cs_fornecedor_id);
      }

      return ritual;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-rituais', variables.cs_fornecedor_id] });
      queryClient.invalidateQueries({ queryKey: ['cs-ritual', variables.cs_fornecedor_id, variables.semana] });
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedor', variables.cs_fornecedor_id] });
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedores'] });
      toast({ 
        title: variables.concluir ? 'Semana finalizada!' : 'Ritual salvo',
        description: variables.concluir ? `Semana ${variables.semana} concluída com sucesso.` : undefined
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar ritual', description: error.message, variant: 'destructive' });
    }
  });
}

// =============================================
// PLANOS DE AÇÃO
// =============================================
export function useCSPlanosAcao(ritualSemanalId: string | undefined) {
  return useQuery({
    queryKey: ['cs-planos-acao', ritualSemanalId],
    queryFn: async () => {
      if (!ritualSemanalId) return [];
      
      const { data, error } = await supabase
        .from('cs_planos_acao')
        .select('*')
        .eq('ritual_semanal_id', ritualSemanalId)
        .order('ordem');
      
      if (error) throw error;
      return data as CSPlanoAcao[];
    },
    enabled: !!ritualSemanalId
  });
}

// =============================================
// HISTÓRICO
// =============================================
export function useCSHistorico(csFornecedorId: string | undefined) {
  return useQuery({
    queryKey: ['cs-historico', csFornecedorId],
    queryFn: async () => {
      if (!csFornecedorId) return [];
      
      const { data, error } = await supabase
        .from('cs_historico_pipeline')
        .select(`
          *,
          etapa_anterior:cs_etapas_config!cs_historico_pipeline_etapa_anterior_id_fkey(nome, cor, cor_texto),
          etapa_nova:cs_etapas_config!cs_historico_pipeline_etapa_nova_id_fkey(nome, cor, cor_texto)
        `)
        .eq('cs_fornecedor_id', csFornecedorId)
        .order('data_movimentacao', { ascending: false });
      
      if (error) throw error;
      return data as CSHistoricoPipeline[];
    },
    enabled: !!csFornecedorId
  });
}

// =============================================
// FORNECEDORES DISPONÍVEIS (para adicionar ao CS)
// =============================================
export function useFornecedoresDisponiveis() {
  return useQuery({
    queryKey: ['fornecedores-disponiveis-cs'],
    queryFn: async () => {
      // Buscar fornecedores ativos que não estão no CS
      const { data: jaNoCS } = await supabase
        .from('cs_fornecedores')
        .select('fornecedor_id');

      const idsNoCS = jaNoCS?.map(f => f.fornecedor_id) || [];

      let query = supabase
        .from('profiles')
        .select('id, nome, email, empresa, telefone, status')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo')
        .order('nome');

      if (idsNoCS.length > 0) {
        query = query.not('id', 'in', `(${idsNoCS.join(',')})`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
}

// =============================================
// CS DISPONÍVEIS (responsáveis)
// =============================================
export function useCSResponsaveis() {
  return useQuery({
    queryKey: ['cs-responsaveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('tipo_usuario', ['customer_success', 'admin', 'master'])
        .eq('status', 'ativo')
        .order('nome');
      
      if (error) throw error;
      return data;
    }
  });
}

// =============================================
// CHECKLIST SEMANA ZERO (PRÉ-ONBOARDING)
// =============================================
export function useChecklistSemanaZero(csFornecedorId: string | undefined) {
  return useQuery({
    queryKey: ['cs-checklist-semana-zero', csFornecedorId],
    queryFn: async () => {
      if (!csFornecedorId) return null;
      
      const { data, error } = await supabase
        .from('cs_checklist_semana_zero')
        .select('*')
        .eq('cs_fornecedor_id', csFornecedorId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CSChecklistSemanaZero | null;
    },
    enabled: !!csFornecedorId
  });
}

export function useSalvarChecklistSemanaZero() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      cs_fornecedor_id: string;
      formData: {
        boas_vindas_enviada: boolean;
        grupo_whatsapp_criado: boolean;
        material_educativo_enviado: boolean;
        documentos_solicitados: boolean;
        observacoes: string;
      };
      concluir: boolean;
      userId: string;
      userName: string;
    }) => {
      const checklistData = {
        cs_fornecedor_id: data.cs_fornecedor_id,
        boas_vindas_enviada: data.formData.boas_vindas_enviada,
        grupo_whatsapp_criado: data.formData.grupo_whatsapp_criado,
        material_educativo_enviado: data.formData.material_educativo_enviado,
        documentos_solicitados: data.formData.documentos_solicitados,
        observacoes: data.formData.observacoes || null,
        ...(data.concluir && {
          concluido: true,
          concluido_por_id: data.userId,
          concluido_por_nome: data.userName,
          data_conclusao: new Date().toISOString()
        })
      };

      // Upsert checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('cs_checklist_semana_zero')
        .upsert(checklistData, { onConflict: 'cs_fornecedor_id' })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Se concluiu, avançar fornecedor para semana 1
      if (data.concluir) {
        await supabase
          .from('cs_fornecedores')
          .update({ semana_atual: 1 })
          .eq('id', data.cs_fornecedor_id);
      }

      return checklist;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-checklist-semana-zero', variables.cs_fornecedor_id] });
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedor', variables.cs_fornecedor_id] });
      queryClient.invalidateQueries({ queryKey: ['cs-fornecedores'] });
      toast({ 
        title: variables.concluir ? 'Semana 0 concluída!' : 'Checklist salvo',
        description: variables.concluir ? 'O fornecedor avançou para a Semana 1.' : undefined
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar checklist', description: error.message, variant: 'destructive' });
    }
  });
}
