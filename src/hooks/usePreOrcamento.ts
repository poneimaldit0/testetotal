import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ItemPreOrcamento {
  itemId: string;
  incluido: boolean;
  valorEstimado: number;
  observacoes: string;
  ambientes: string[];
}

interface PreOrcamentoData {
  itens: ItemPreOrcamento[];
  valorTotal: number;
  observacoesGerais: string;
  formaPagamento?: any;
}

export const usePreOrcamento = (candidaturaId: string) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const salvarPreOrcamento = useCallback(async (data: PreOrcamentoData) => {
    if (!candidaturaId) {
      console.error('Candidatura ID é obrigatório');
      return false;
    }

    setLoading(true);
    
    try {
      // Primeiro, criar ou atualizar o checklist_propostas
      const { data: checklistProposta, error: checklistError } = await supabase
        .from('checklist_propostas')
        .upsert({
          candidatura_id: candidaturaId,
          valor_total_estimado: data.valorTotal,
          status: 'pre_orcamento',
          observacoes: data.observacoesGerais,
          forma_pagamento: data.formaPagamento || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'candidatura_id'
        })
        .select()
        .maybeSingle();

      if (checklistError) {
        throw checklistError;
      }

      if (!checklistProposta) {
        throw new Error('Não foi possível criar o pré-orçamento');
      }

      // Remover respostas antigas para esta proposta
      await supabase
        .from('respostas_checklist')
        .delete()
        .eq('checklist_proposta_id', checklistProposta.id);

      // Inserir as novas respostas
      const respostasParaInserir = data.itens.map(item => ({
        checklist_proposta_id: checklistProposta.id,
        item_id: item.itemId,
        incluido: item.incluido,
        valor_estimado: item.valorEstimado,
        observacoes: item.observacoes,
        ambientes: item.ambientes
      }));

      const { error: respostasError } = await supabase
        .from('respostas_checklist')
        .insert(respostasParaInserir);

      if (respostasError) {
        throw respostasError;
      }

      // Atualizar a candidatura para indicar que tem pré-orçamento
      await supabase
        .from('candidaturas_fornecedores')
        .update({
          proposta_enviada: false, // Ainda não é a proposta final
          updated_at: new Date().toISOString()
        })
        .eq('id', candidaturaId);

      console.log('✅ Pré-orçamento salvo com sucesso');
      return true;

    } catch (error: any) {
      console.error('❌ Erro ao salvar pré-orçamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o pré-orçamento",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [candidaturaId, toast]);

  const carregarPreOrcamento = useCallback(async () => {
    if (!candidaturaId) return null;

    try {
      setLoading(true);

      const { data: checklistProposta, error: checklistError } = await supabase
        .from('checklist_propostas')
        .select(`
          *,
          respostas_checklist (
            item_id,
            incluido,
            valor_estimado,
            observacoes,
            ambientes
          )
        `)
        .eq('candidatura_id', candidaturaId)
        .maybeSingle();

      if (checklistError) {
        throw checklistError;
      }

      return checklistProposta;

    } catch (error: any) {
      console.error('Erro ao carregar pré-orçamento:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [candidaturaId]);

  return {
    loading,
    salvarPreOrcamento,
    carregarPreOrcamento
  };
};