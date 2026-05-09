import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Medicao {
  id: string;
  contrato_id: string;
  fornecedor_id: string;
  numero_medicao: number;
  descricao: string;
  data_medicao: string;
  valor_medicao: number;
  status: string;
  data_aprovacao: string | null;
  data_pagamento: string | null;
  observacoes_cliente: string | null;
  observacoes_fornecedor: string | null;
  arquivos_comprobatorios: any;
  baseado_em_itens?: boolean;
  proposta_base_id?: string;
}

interface ItemContrato {
  item_id: string;
  categoria: string;
  nome: string;
  descricao: string;
  valor_estimado: number;
  ambientes: string[];
}

interface MedicaoItem {
  id: string;
  medicao_id: string;
  item_checklist_id: string;
  percentual_executado: number;
  percentual_acumulado: number;
  valor_item_original: number;
  valor_item_medicao: number;
  observacoes?: string;
  checklist_itens?: any;
}

interface MedicaoCompleta extends Medicao {
  itens?: MedicaoItem[];
}

export const useMedicoes = (contratoId?: string) => {
  const [medicoes, setMedicoes] = useState<MedicaoCompleta[]>([]);
  const [itensContrato, setItensContrato] = useState<ItemContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const carregarMedicoes = async () => {
    if (!contratoId) return;
    
    try {
      setLoading(true);
      
      // Carregar medições
      const { data: medicoesData, error: medicoesError } = await supabase
        .from('medicoes_obra')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('numero_medicao', { ascending: true });

      if (medicoesError) throw medicoesError;

      // Para cada medição baseada em itens, carregar seus itens
      const medicoesCompletas: MedicaoCompleta[] = [];
      
      for (const medicao of medicoesData || []) {
        if (medicao.baseado_em_itens) {
          const { data: itensData, error: itensError } = await supabase
            .from('medicoes_itens')
            .select('*')
            .eq('medicao_id', medicao.id)
            .order('item_checklist_id');

          if (itensError) throw itensError;

          medicoesCompletas.push({
            ...medicao,
            itens: itensData || []
          });
        } else {
          medicoesCompletas.push(medicao);
        }
      }

      setMedicoes(medicoesCompletas);
    } catch (error: any) {
      console.error('Erro ao carregar medições:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar medições da obra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarItensContrato = async () => {
    if (!contratoId) return;
    
    try {
      setLoadingItens(true);
      const { data, error } = await supabase
        .rpc('buscar_itens_contrato', { p_contrato_id: contratoId });

      if (error) throw error;
      setItensContrato(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar itens do contrato:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar itens do contrato",
        variant: "destructive",
      });
    } finally {
      setLoadingItens(false);
    }
  };

  // Nova função para carregar todas as medições de um fornecedor
  const carregarMedicoesFornecedor = async (fornecedorId: string) => {
    try {
      setLoading(true);
      
      // Carregar medições do fornecedor
      const { data: medicoesData, error: medicoesError } = await supabase
        .from('medicoes_obra')
        .select(`
          *,
          contratos!inner (
            id,
            valor_contrato,
            clientes (nome)
          )
        `)
        .eq('fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false });

      if (medicoesError) throw medicoesError;

      // Para cada medição baseada em itens, carregar seus itens com detalhes do checklist
      const medicoesCompletas: MedicaoCompleta[] = [];
      
      for (const medicao of medicoesData || []) {
        if (medicao.baseado_em_itens) {
          const { data: itensData, error: itensError } = await supabase
            .from('medicoes_itens')
            .select(`
              *,
              checklist_itens!inner (
                nome,
                categoria,
                descricao
              )
            `)
            .eq('medicao_id', medicao.id)
            .order('item_checklist_id');

          if (itensError) throw itensError;

          medicoesCompletas.push({
            ...medicao,
            itens: itensData as any || []
          });
        } else {
          medicoesCompletas.push(medicao);
        }
      }

      setMedicoes(medicoesCompletas);
    } catch (error: any) {
      console.error('Erro ao carregar medições do fornecedor:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar medições do fornecedor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aprovarMedicao = async (medicaoId: string, observacoes?: string) => {
    try {
      const { error } = await supabase
        .from('medicoes_obra')
        .update({
          status: 'aprovada',
          data_aprovacao: new Date().toISOString(),
          observacoes_cliente: observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', medicaoId);

      if (error) throw error;
      
      await carregarMedicoes();
      toast({
        title: "Sucesso",
        description: "Medição aprovada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao aprovar medição:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar medição",
        variant: "destructive",
      });
    }
  };

  const reprovarMedicao = async (medicaoId: string, observacoes: string) => {
    try {
      const { error } = await supabase
        .from('medicoes_obra')
        .update({
          status: 'reprovada',
          observacoes_cliente: observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', medicaoId);

      if (error) throw error;
      
      await carregarMedicoes();
      toast({
        title: "Sucesso",
        description: "Medição reprovada",
      });
    } catch (error: any) {
      console.error('Erro ao reprovar medição:', error);
      toast({
        title: "Erro", 
        description: "Erro ao reprovar medição",
        variant: "destructive",
      });
    }
  };

  const criarMedicao = async (novaMedicao: Omit<Medicao, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('medicoes_obra')
        .insert([novaMedicao]);

      if (error) throw error;
      
      await carregarMedicoes();
      toast({
        title: "Sucesso",
        description: "Medição criada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao criar medição:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar medição",
        variant: "destructive",
      });
    }
  };

  const criarMedicaoComItens = async (
    dadosMedicao: {
      numero_medicao: number;
      descricao: string;
      data_medicao: string;
      observacoes_fornecedor?: string;
    },
    itensMedicao: Array<{
      item_checklist_id: string;
      percentual_executado: number;
      valor_item_original: number;
      observacoes?: string;
    }>
  ) => {
    if (!contratoId) return;

    try {
      // Buscar fornecedor_id do contrato
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select('fornecedor_id')
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;

      // Calcular valor total da medição
      const valorTotal = itensMedicao.reduce((total, item) => {
        return total + (item.valor_item_original * item.percentual_executado / 100);
      }, 0);

      // Criar a medição
      const { data: medicaoData, error: medicaoError } = await supabase
        .from('medicoes_obra')
        .insert([{
          ...dadosMedicao,
          contrato_id: contratoId,
          fornecedor_id: contrato.fornecedor_id,
          valor_medicao: valorTotal,
          status: 'enviada',
          baseado_em_itens: true,
          arquivos_comprobatorios: null,
          data_aprovacao: null,
          data_pagamento: null,
          observacoes_cliente: null,
        }])
        .select()
        .single();

      if (medicaoError) throw medicaoError;

      // Criar os itens da medição
      const itensParaInserir = itensMedicao.map(item => ({
        medicao_id: medicaoData.id,
        item_checklist_id: item.item_checklist_id,
        percentual_executado: item.percentual_executado,
        valor_item_original: item.valor_item_original,
        valor_item_medicao: item.valor_item_original * item.percentual_executado / 100,
        observacoes: item.observacoes || null,
      }));

      const { error: itensError } = await supabase
        .from('medicoes_itens')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      await carregarMedicoes();
      toast({
        title: "Sucesso",
        description: "Medição criada com sucesso",
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao criar medição com itens:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar medição",
        variant: "destructive",
      });
      return false;
    }
  };

  const obterProximoNumeroMedicao = async (contratoId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('obter_proximo_numero_medicao', {
        p_contrato_id: contratoId
      });

      if (error) {
        console.error('Erro ao obter próximo número de medição:', error);
        return 1; // Fallback para primeira medição
      }

      return data || 1;
    } catch (error) {
      console.error('Erro ao obter próximo número de medição:', error);
      return 1;
    }
  };

  const calcularPercentualAcumulado = async (itemChecklistId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calcular_percentual_acumulado_item', {
        p_item_checklist_id: itemChecklistId,
        p_medicao_atual_id: null
      });
      
      if (error) {
        console.error('Erro ao calcular percentual acumulado:', error);
        throw error;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular percentual acumulado:', error);
      return 0;
    }
  };

  useEffect(() => {
    if (contratoId) {
      carregarMedicoes();
      carregarItensContrato();
    }
  }, [contratoId]);

  return {
    medicoes,
    itensContrato,
    loading,
    loadingItens,
    carregarMedicoes,
    carregarMedicoesFornecedor,
    carregarItensContrato,
    aprovarMedicao,
    reprovarMedicao,
    criarMedicao,
    criarMedicaoComItens,
    calcularPercentualAcumulado,
    obterProximoNumeroMedicao,
  };
};