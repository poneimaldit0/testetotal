import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { useAuth } from './useAuth';

export interface MetasSaudeEmpresa {
  fat_fornecedores_meta_semanal: number;
  fat_fornecedores_meta_mensal: number;
  reunioes_meta_semanal: number;
  reunioes_meta_mensal: number;
  fat_comissoes_meta_semanal: number;
  fat_comissoes_meta_mensal: number;
  publicacoes_meta_semanal: number;
  publicacoes_meta_mensal: number;
  tarefas_meta_semanal: number;
  tarefas_meta_mensal: number;
}

export interface DadosRealizados {
  fatFornecedoresSemanal: number;
  fatFornecedoresMensal: number;
  reunioesSemanal: number;
  reunioesMensal: number;
  fatComissoesSemanal: number;
  fatComissoesMensal: number;
  publicacoesSemanal: number;
  publicacoesMensal: number;
  tarefasSemanal: number;
  tarefasMensal: number;
}

export const useSaudeEmpresa = () => {
  const { profile } = useAuth();
  const [metas, setMetas] = useState<MetasSaudeEmpresa | null>(null);
  const [realizados, setRealizados] = useState<DadosRealizados | null>(null);
  const [loading, setLoading] = useState(true);

  const buscarMetas = async () => {
    const { data, error } = await supabase
      .from('metas_saude_empresa')
      .select('*')
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao buscar metas:', error);
      return null;
    }

    return data;
  };

  const buscarRealizados = async () => {
    const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 0 });
    const fimSemana = endOfWeek(new Date(), { weekStartsOn: 0 });
    const inicioMes = startOfMonth(new Date());
    const fimMes = endOfMonth(new Date());

    // Buscar faturamentos manuais
    const { data: registros } = await supabase
      .from('registros_saude_empresa')
      .select('*')
      .gte('data_registro', inicioMes.toISOString().split('T')[0]);

    // Calcular faturamentos de fornecedores
    const fatFornecedoresSemanal = registros
      ?.filter(r => r.tipo === 'faturamento_fornecedor' && new Date(r.data_registro) >= inicioSemana)
      .reduce((sum, r) => sum + (r.valor || 0), 0) || 0;

    const fatFornecedoresMensal = registros
      ?.filter(r => r.tipo === 'faturamento_fornecedor')
      .reduce((sum, r) => sum + (r.valor || 0), 0) || 0;

    // Calcular faturamentos de comissões
    const fatComissoesSemanal = registros
      ?.filter(r => r.tipo === 'faturamento_comissao' && new Date(r.data_registro) >= inicioSemana)
      .reduce((sum, r) => sum + (r.valor || 0), 0) || 0;

    const fatComissoesMensal = registros
      ?.filter(r => r.tipo === 'faturamento_comissao')
      .reduce((sum, r) => sum + (r.valor || 0), 0) || 0;

    // Calcular reuniões
    const reunioesSemanal = registros
      ?.filter(r => r.tipo === 'reuniao' && new Date(r.data_registro) >= inicioSemana)
      .reduce((sum, r) => sum + (r.valor || 1), 0) || 0;

    const reunioesMensal = registros
      ?.filter(r => r.tipo === 'reuniao')
      .reduce((sum, r) => sum + (r.valor || 1), 0) || 0;

    // Buscar publicações (orçamentos) do sistema
    const { count: pubSemanal } = await supabase
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioSemana.toISOString());

    const { count: pubMensal } = await supabase
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMes.toISOString());

    // Buscar tarefas do sistema
    const { count: tarefasCRMSemanal } = await supabase
      .from('crm_checklist_progresso')
      .select('*', { count: 'exact', head: true })
      .eq('concluido', true)
      .gte('data_conclusao', inicioSemana.toISOString());

    const { count: tarefasCRMMensal } = await supabase
      .from('crm_checklist_progresso')
      .select('*', { count: 'exact', head: true })
      .eq('concluido', true)
      .gte('data_conclusao', inicioMes.toISOString());

    const { count: tarefasOrcSemanal } = await supabase
      .from('crm_orcamentos_tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('concluida', true)
      .gte('data_conclusao', inicioSemana.toISOString());

    const { count: tarefasOrcMensal } = await supabase
      .from('crm_orcamentos_tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('concluida', true)
      .gte('data_conclusao', inicioMes.toISOString());

    const { count: tarefasMarSemanal } = await supabase
      .from('crm_marcenaria_checklist_progresso')
      .select('*', { count: 'exact', head: true })
      .eq('concluido', true)
      .gte('data_conclusao', inicioSemana.toISOString());

    const { count: tarefasMarMensal } = await supabase
      .from('crm_marcenaria_checklist_progresso')
      .select('*', { count: 'exact', head: true })
      .eq('concluido', true)
      .gte('data_conclusao', inicioMes.toISOString());

    const { count: tarefasMarTarefasSemanal } = await supabase
      .from('crm_marcenaria_tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('concluida', true)
      .gte('data_conclusao', inicioSemana.toISOString());

    const { count: tarefasMarTarefasMensal } = await supabase
      .from('crm_marcenaria_tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('concluida', true)
      .gte('data_conclusao', inicioMes.toISOString());

    const tarefasSemanal = (tarefasCRMSemanal || 0) + (tarefasOrcSemanal || 0) + (tarefasMarSemanal || 0) + (tarefasMarTarefasSemanal || 0);
    const tarefasMensal = (tarefasCRMMensal || 0) + (tarefasOrcMensal || 0) + (tarefasMarMensal || 0) + (tarefasMarTarefasMensal || 0);

    return {
      fatFornecedoresSemanal,
      fatFornecedoresMensal,
      reunioesSemanal,
      reunioesMensal,
      fatComissoesSemanal,
      fatComissoesMensal,
      publicacoesSemanal: pubSemanal || 0,
      publicacoesMensal: pubMensal || 0,
      tarefasSemanal,
      tarefasMensal
    };
  };

  const recarregarDados = async () => {
    setLoading(true);
    const [metasData, realizadosData] = await Promise.all([
      buscarMetas(),
      buscarRealizados()
    ]);
    
    setMetas(metasData);
    setRealizados(realizadosData);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      recarregarDados();
    }
  }, [profile]);

  return {
    metas,
    realizados,
    loading,
    recarregarDados
  };
};
