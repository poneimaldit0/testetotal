import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Obra {
  id: string;
  contrato_id: string;
  cliente_id: string;
  fornecedor_id: string;
  orcamento_id: string;
  proposta_id: string;
  endereco_obra: any;
  valor_total: number;
  status: 'aguardando_inicio' | 'em_andamento' | 'pausada' | 'finalizada' | 'cancelada';
  data_inicio?: string;
  data_fim_prevista?: string;
  data_fim_real?: string;
  porcentagem_conclusao: number;
  observacoes?: string;
  cronograma_inicial_aprovado?: boolean;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  cliente?: {
    nome: string;
    email: string;
    telefone: string;
  };
  fornecedor?: {
    nome: string;
    empresa: string;
  };
}

export const useObras = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const carregarObras = async () => {
    if (!profile?.id) {
      console.log('🔍 [useObras] Não há profile.id para carregar obras');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 [useObras] Iniciando carregamento de obras para user:', profile.id, 'tipo:', profile.tipo_usuario);
      
      let query = supabase
        .from('obras')
        .select('*');

      console.log('🔍 [useObras] Query simples criada, aplicando filtros...');

      // Filtrar baseado no tipo de usuário
      if (profile.tipo_usuario === 'cliente') {
        console.log('🔍 [useObras] Carregando obras para cliente');
        // Para clientes, buscar através da tabela clientes
        const { data: clienteRecord, error: clienteError } = await supabase
          .from('clientes')
          .select('id')
          .eq('auth_user_id', profile.id)
          .single();
        
        console.log('🔍 [useObras] Cliente record:', clienteRecord, 'error:', clienteError);
        
        if (clienteError) {
          console.error('❌ [useObras] Erro ao buscar cliente:', clienteError);
          throw clienteError;
        }
        
        if (clienteRecord) {
          query = query.eq('cliente_id', clienteRecord.id);
        } else {
          console.log('🔍 [useObras] Nenhum registro de cliente encontrado');
          setObras([]);
          return;
        }
      } else if (profile.tipo_usuario === 'fornecedor') {
        console.log('🔍 [useObras] Carregando obras para fornecedor');
        // Fornecedor vê apenas suas obras
        query = query.eq('fornecedor_id', profile.id);
      } else if (!['admin', 'master'].includes(profile.tipo_usuario)) {
        console.log('🔍 [useObras] Tipo de usuário não autorizado:', profile.tipo_usuario);
        // Outros tipos não veem obras
        setObras([]);
        return;
      } else {
        console.log('🔍 [useObras] Carregando todas as obras (admin/master)');
      }

      console.log('🔍 [useObras] Executando query de obras');
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [useObras] Erro na query de obras:', error);
        throw error;
      }

      console.log('🔍 [useObras] Dados retornados:', data?.length || 0, 'obras');

      const obrasFormatadas = (data || []).map((obra: any) => ({
        ...obra
      }));

      console.log('🔍 [useObras] Obras formatadas:', obrasFormatadas.length);
      setObras(obrasFormatadas);
    } catch (error: any) {
      console.error('❌ [useObras] Erro ao carregar obras:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar obras: " + (error?.message || 'Erro desconhecido'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarObra = async (obraId: string, updates: Partial<Obra>) => {
    try {
      const { error } = await supabase
        .from('obras')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', obraId);

      if (error) throw error;
      
      await carregarObras();
      toast({
        title: "Sucesso",
        description: "Obra atualizada com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar obra:', error);
      toast({
        title: "Erro", 
        description: "Erro ao atualizar obra",
        variant: "destructive",
      });
    }
  };

  const iniciarObra = async (obraId: string, dataInicio: string) => {
    await atualizarObra(obraId, {
      status: 'em_andamento',
      data_inicio: dataInicio
    });
  };

  const finalizarObra = async (obraId: string) => {
    await atualizarObra(obraId, {
      status: 'finalizada',
      data_fim_real: new Date().toISOString().split('T')[0],
      porcentagem_conclusao: 100
    });
  };

  const aprovarCronogramaInicial = async (obraId: string) => {
    try {
      const { error } = await supabase
        .from('obras')
        .update({
          cronograma_inicial_aprovado: true,
          status: 'em_andamento',
          updated_at: new Date().toISOString()
        })
        .eq('id', obraId);

      if (error) throw error;
      
      await carregarObras();
      toast({
        title: "Sucesso",
        description: "Cronograma inicial aprovado com sucesso",
      });
    } catch (error: any) {
      console.error('Erro ao aprovar cronograma inicial:', error);
      toast({
        title: "Erro", 
        description: "Erro ao aprovar cronograma inicial",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    carregarObras();
  }, [profile?.id]);

  return {
    obras,
    loading,
    carregarObras,
    atualizarObra,
    iniciarObra,
    finalizarObra,
    aprovarCronogramaInicial,
  };
};