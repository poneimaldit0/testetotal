import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PropostaResumo {
  id: string;
  candidatura_id: string;
  valor_total_estimado: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Dados da candidatura
  candidatura: {
    nome: string;
    email: string;
    empresa: string;
    orcamento_id: string;
    fornecedor_id: string;
    data_candidatura: string;
  };
  // Dados do orçamento
  orcamento: {
    necessidade: string;
    local: string;
    codigo_orcamento: string;
  };
}

export interface PropostaDetalhada {
  id: string;
  candidatura_id: string;
  valor_total_estimado: number;
  status: string;
  observacoes: string;
  forma_pagamento?: string;
  created_at: string;
  updated_at: string;
  // Dados da candidatura
  candidatura: {
    nome: string;
    email: string;
    empresa: string;
    telefone: string;
    orcamento_id: string;
    fornecedor_id: string;
    data_candidatura: string;
  };
  // Dados do orçamento
  orcamento: {
    necessidade: string;
    local: string;
    codigo_orcamento: string;
    tamanho_imovel: number;
    dados_contato: any;
  };
  // Respostas do checklist
  respostas: Array<{
    id: string;
    item_id: string;
    incluido: boolean;
    valor_estimado: number;
    ambientes: string[];
    observacoes: string;
    item: {
      nome: string;
      categoria: string;
      descricao: string;
      ordem: number;
    };
  }>;
}

export interface FiltrosPropostas {
  orcamento_id?: string;
  fornecedor_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export const usePropostas = () => {
  const [propostas, setPropostas] = useState<PropostaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  const carregarPropostas = async (filtros?: FiltrosPropostas) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          status,
          created_at,
          updated_at,
          candidatura:candidaturas_fornecedores!candidatura_id (
            nome,
            email,
            empresa,
            orcamento_id,
            fornecedor_id,
            data_candidatura
          ),
          orcamento:candidaturas_fornecedores!candidatura_id (
            orcamento:orcamentos!orcamento_id (
              necessidade,
              local,
              codigo_orcamento
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros se fornecidos
      if (filtros) {
        if (filtros.orcamento_id) {
          query = query.eq('candidatura.orcamento_id', filtros.orcamento_id);
        }
        if (filtros.status) {
          query = query.eq('status', filtros.status);
        }
        if (filtros.data_inicio) {
          query = query.gte('created_at', filtros.data_inicio);
        }
        if (filtros.data_fim) {
          query = query.lte('created_at', filtros.data_fim);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar os dados para o formato esperado
      const propostasFormatadas = data.map((proposta: any) => ({
        id: proposta.id,
        candidatura_id: proposta.candidatura_id,
        valor_total_estimado: proposta.valor_total_estimado || 0,
        status: proposta.status || 'rascunho',
        created_at: proposta.created_at,
        updated_at: proposta.updated_at,
        candidatura: proposta.candidatura,
        orcamento: proposta.orcamento?.orcamento || {
          necessidade: '',
          local: '',
          codigo_orcamento: ''
        }
      }));

      setPropostas(propostasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as propostas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarPropostaDetalhada = async (propostaId: string): Promise<PropostaDetalhada | null> => {
    try {
      const { data, error } = await supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          status,
          observacoes,
          forma_pagamento,
          created_at,
          updated_at,
          candidatura:candidaturas_fornecedores!candidatura_id (
            nome,
            email,
            empresa,
            telefone,
            orcamento_id,
            fornecedor_id,
            data_candidatura
          ),
          orcamento:candidaturas_fornecedores!candidatura_id (
            orcamento:orcamentos!orcamento_id (
              necessidade,
              local,
              codigo_orcamento,
              tamanho_imovel,
              dados_contato
            )
          ),
          respostas:respostas_checklist (
            id,
            item_id,
            incluido,
            valor_estimado,
            ambientes,
            observacoes,
            item:checklist_itens!item_id (
              nome,
              categoria,
              descricao,
              ordem
            )
          )
        `)
        .eq('id', propostaId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        candidatura_id: data.candidatura_id,
        valor_total_estimado: data.valor_total_estimado || 0,
        status: data.status || 'rascunho',
        observacoes: data.observacoes || '',
        forma_pagamento: data.forma_pagamento as any || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
        candidatura: data.candidatura,
        orcamento: data.orcamento?.orcamento || {
          necessidade: '',
          local: '',
          codigo_orcamento: '',
          tamanho_imovel: 0,
          dados_contato: null
        },
        respostas: data.respostas || []
      };
    } catch (error) {
      console.error('Erro ao carregar proposta detalhada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da proposta',
        variant: 'destructive'
      });
      return null;
    }
  };

  const carregarPropostasFornecedor = async (fornecedorId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          status,
          created_at,
          updated_at,
          candidatura:candidaturas_fornecedores!candidatura_id (
            nome,
            email,
            empresa,
            orcamento_id,
            fornecedor_id,
            data_candidatura
          ),
          orcamento:candidaturas_fornecedores!candidatura_id (
            orcamento:orcamentos!orcamento_id (
              necessidade,
              local,
              codigo_orcamento
            )
          )
        `)
        .eq('candidatura.fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const propostasFormatadas = data.map((proposta: any) => ({
        id: proposta.id,
        candidatura_id: proposta.candidatura_id,
        valor_total_estimado: proposta.valor_total_estimado || 0,
        status: proposta.status || 'rascunho',
        created_at: proposta.created_at,
        updated_at: proposta.updated_at,
        candidatura: proposta.candidatura,
        orcamento: proposta.orcamento?.orcamento || {
          necessidade: '',
          local: '',
          codigo_orcamento: ''
        }
      }));

      setPropostas(propostasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar propostas do fornecedor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas propostas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPropostas();
  }, []);

  return {
    propostas,
    loading,
    exportando,
    setExportando,
    carregarPropostas,
    carregarPropostaDetalhada,
    carregarPropostasFornecedor
  };
};