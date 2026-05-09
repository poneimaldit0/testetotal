import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FunilVendasRegistro, FunilVendasMeta, FunilVendasAcumulado, FunilReuniao, FunilCanalOrigem } from '@/types/funilVendas';

export const useFunilVendas = () => {
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState<FunilVendasRegistro[]>([]);
  const [metas, setMetas] = useState<FunilVendasMeta[]>([]);

  const buscarRegistros = useCallback(async (filters?: {
    closerId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('funil_vendas_registros')
        .select('*')
        .order('data', { ascending: false });

      if (filters?.closerId) query = query.eq('closer_id', filters.closerId);
      if (filters?.dataInicio) query = query.gte('data', filters.dataInicio);
      if (filters?.dataFim) query = query.lte('data', filters.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      setRegistros((data || []) as unknown as FunilVendasRegistro[]);
      return (data || []) as unknown as FunilVendasRegistro[];
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
      toast.error('Erro ao carregar registros do funil');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarRegistro = useCallback(async (registro: Omit<FunilVendasRegistro, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('funil_vendas_registros')
        .upsert(
          { ...registro, updated_at: new Date().toISOString() } as any,
          { onConflict: 'data,closer_id' }
        )
        .select();

      if (error) throw error;
      toast.success('Registro salvo com sucesso!');
      return data?.[0] as unknown as FunilVendasRegistro;
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      toast.error('Erro ao salvar registro');
      return null;
    }
  }, []);

  const atualizarRegistro = useCallback(async (id: string, updates: Partial<FunilVendasRegistro>) => {
    try {
      const { error } = await supabase
        .from('funil_vendas_registros')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro atualizado!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar registro:', error);
      toast.error('Erro ao atualizar registro');
      return false;
    }
  }, []);

  const excluirRegistro = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('funil_vendas_registros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro excluído!');
      return true;
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast.error('Erro ao excluir registro');
      return false;
    }
  }, []);

  const excluirReuniao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('funil_reunioes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Reunião excluída!');
      return true;
    } catch (error) {
      console.error('Erro ao excluir reunião:', error);
      toast.error('Erro ao excluir reunião');
      return false;
    }
  }, []);

  const buscarMetas = useCallback(async (mes?: number, ano?: number) => {
    try {
      let query = supabase.from('funil_vendas_metas').select('*');
      if (mes) query = query.eq('mes', mes);
      if (ano) query = query.eq('ano', ano);

      const { data, error } = await query;
      if (error) throw error;
      setMetas((data || []) as unknown as FunilVendasMeta[]);
      return (data || []) as unknown as FunilVendasMeta[];
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      toast.error('Erro ao carregar metas');
      return [];
    }
  }, []);

  const salvarMeta = useCallback(async (meta: Omit<FunilVendasMeta, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('funil_vendas_metas')
        .upsert(
          { ...meta, updated_at: new Date().toISOString() } as any,
          { onConflict: 'mes,ano,closer_id' }
        )
        .select();

      if (error) throw error;
      toast.success('Meta salva com sucesso!');
      return data?.[0] as unknown as FunilVendasMeta;
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
      return null;
    }
  }, []);

  const calcularAcumulado = useCallback((regs: FunilVendasRegistro[]): FunilVendasAcumulado => {
    return regs.reduce((acc, r) => ({
      leads_entrada: acc.leads_entrada + r.leads_entrada,
      mql: acc.mql + r.mql,
      ligacoes_realizadas: acc.ligacoes_realizadas + r.ligacoes_realizadas,
      reunioes_agendadas: acc.reunioes_agendadas + r.reunioes_agendadas,
      reunioes_iniciadas: acc.reunioes_iniciadas + r.reunioes_iniciadas,
      pitchs_realizados: acc.pitchs_realizados + r.pitchs_realizados,
      vendas: acc.vendas + r.vendas,
      caixa_coletado: acc.caixa_coletado + Number(r.caixa_coletado),
      faturamento_gerado: acc.faturamento_gerado + Number(r.faturamento_gerado),
    }), {
      leads_entrada: 0, mql: 0, ligacoes_realizadas: 0,
      reunioes_agendadas: 0, reunioes_iniciadas: 0, pitchs_realizados: 0,
      vendas: 0, caixa_coletado: 0, faturamento_gerado: 0,
    });
  }, []);

  const buscarClosers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('tipo_usuario', 'closer')
        .eq('status', 'ativo');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar closers:', error);
      return [];
    }
  }, []);

  const buscarReunioes = useCallback(async (filters?: {
    closerId?: string;
    preVendasId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) => {
    try {
      let query = supabase
        .from('funil_reunioes')
        .select('*')
        .order('data_agendada', { ascending: false });

      if (filters?.closerId) query = query.eq('closer_id', filters.closerId);
      if (filters?.preVendasId) query = query.eq('pre_vendas_id', filters.preVendasId);
      if (filters?.dataInicio) query = query.gte('data_agendada', filters.dataInicio);
      if (filters?.dataFim) query = query.lte('data_agendada', filters.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as FunilReuniao[];
    } catch (error) {
      console.error('Erro ao buscar reuniões:', error);
      toast.error('Erro ao carregar reuniões');
      return [];
    }
  }, []);

  const criarReuniao = useCallback(async (reuniao: {
    nome: string;
    data_agendada: string;
    closer_id: string;
    pre_vendas_id: string;
    observacoes_pre_vendas?: string;
    canal_origem_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('funil_reunioes')
        .insert(reuniao as any)
        .select();

      if (error) throw error;
      toast.success('Reunião agendada com sucesso!');
      return data?.[0] as unknown as FunilReuniao;
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast.error('Erro ao agendar reunião');
      return null;
    }
  }, []);

  const atualizarReuniao = useCallback(async (id: string, updates: Partial<FunilReuniao>) => {
    try {
      const { error } = await supabase
        .from('funil_reunioes')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Reunião atualizada!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar reunião:', error);
      toast.error('Erro ao atualizar reunião');
      return false;
    }
  }, []);

  const buscarPreVendas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('tipo_usuario', 'pre_vendas')
        .eq('status', 'ativo');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar pre_vendas:', error);
      return [];
    }
  }, []);

  const buscarCanaisOrigem = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('funil_canais_origem')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as unknown as FunilCanalOrigem[];
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
      return [];
    }
  }, []);

  const buscarTodosCanaisOrigem = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('funil_canais_origem')
        .select('*')
        .order('nome');
      if (error) throw error;
      return (data || []) as unknown as FunilCanalOrigem[];
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
      return [];
    }
  }, []);

  const criarCanalOrigem = useCallback(async (nome: string) => {
    try {
      const { data, error } = await supabase
        .from('funil_canais_origem')
        .insert({ nome } as any)
        .select();
      if (error) throw error;
      toast.success('Canal criado!');
      return data?.[0] as unknown as FunilCanalOrigem;
    } catch (error) {
      console.error('Erro ao criar canal:', error);
      toast.error('Erro ao criar canal');
      return null;
    }
  }, []);

  const atualizarCanalOrigem = useCallback(async (id: string, updates: Partial<FunilCanalOrigem>) => {
    try {
      const { error } = await supabase
        .from('funil_canais_origem')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Canal atualizado!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar canal:', error);
      toast.error('Erro ao atualizar canal');
      return false;
    }
  }, []);

  const excluirCanalOrigem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('funil_canais_origem')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Canal excluído!');
      return true;
    } catch (error) {
      console.error('Erro ao excluir canal:', error);
      toast.error('Erro ao excluir canal');
      return false;
    }
  }, []);

  return {
    loading,
    registros,
    metas,
    buscarRegistros,
    salvarRegistro,
    atualizarRegistro,
    excluirRegistro,
    excluirReuniao,
    buscarMetas,
    salvarMeta,
    calcularAcumulado,
    buscarClosers,
    buscarReunioes,
    criarReuniao,
    atualizarReuniao,
    buscarPreVendas,
    buscarCanaisOrigem,
    buscarTodosCanaisOrigem,
    criarCanalOrigem,
    atualizarCanalOrigem,
    excluirCanalOrigem,
  };
};
