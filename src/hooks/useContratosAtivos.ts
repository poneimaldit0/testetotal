import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ContratoAtivo {
  id: string;
  cliente_id: string;
  fornecedor_id: string;
  orcamento_id: string;
  proposta_id: string;
  valor_contrato: number;
  status_assinatura: string;
  data_assinatura_fornecedor: string | null;
  data_assinatura_cliente: string | null;
  created_at: string;
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    endereco_atual: any;
    endereco_reforma: any;
    status: string;
  };
  obra?: {
    id: string;
    status: string;
    porcentagem_conclusao: number;
    data_inicio: string | null;
    data_fim_prevista: string | null;
  } | null;
  checklist_proposta?: {
    valor_total_estimado: number;
    status: string;
    observacoes: string;
    respostas: any;
  } | null;
}

export const useContratosAtivos = () => {
  const [contratos, setContratos] = useState<ContratoAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const lastLoadTime = useRef<number>(0);
  const cacheTimeout = 30000; // 30 segundos de cache

  const carregarContratos = async (forceReload = false) => {
    if (!profile?.id) return;

    // Verificar cache - só recarregar se forçado ou se passou do timeout
    const now = Date.now();
    if (!forceReload && contratos.length > 0 && (now - lastLoadTime.current) < cacheTimeout) {
      console.log('📋 useContratosAtivos - Usando dados do cache');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 useContratosAtivos - Carregando contratos para fornecedor:', profile.id);
      
      // Buscar contratos onde o fornecedor é o usuário logado
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id,
          cliente_id,
          fornecedor_id,
          orcamento_id,
          proposta_id,
          valor_contrato,
          status_assinatura,
          data_assinatura_fornecedor,
          data_assinatura_cliente,
          created_at,
          clientes(
            nome,
            email,
            telefone,
            cpf,
            endereco_atual,
            endereco_reforma,
            status
          ),
          obras(
            id,
            status,
            porcentagem_conclusao,
            data_inicio,
            data_fim_prevista
          ),
          checklist_propostas(
            valor_total_estimado,
            status,
            observacoes
          )
        `)
        .eq('fornecedor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro na query de contratos:', error);
        throw error;
      }

      console.log('Dados retornados da query:', data);

      const contratosFormatados: ContratoAtivo[] = data?.map((contrato: any) => {
        // Normalizar status - mapear valores inconsistentes
        let statusNormalizado = contrato.status_assinatura || 'aguardando_assinatura';
        if (statusNormalizado === 'aguardando_emissao' || statusNormalizado === 'aguardando') {
          statusNormalizado = 'aguardando_assinatura';
        }
        
        return {
          id: contrato.id,
          cliente_id: contrato.cliente_id,
          fornecedor_id: contrato.fornecedor_id,
          orcamento_id: contrato.orcamento_id,
          proposta_id: contrato.proposta_id,
          valor_contrato: contrato.valor_contrato,
          status_assinatura: statusNormalizado,
          data_assinatura_fornecedor: contrato.data_assinatura_fornecedor,
          data_assinatura_cliente: contrato.data_assinatura_cliente,
          created_at: contrato.created_at,
          cliente: contrato.clientes,
          obra: contrato.obras?.[0] || null,
          checklist_proposta: contrato.checklist_propostas?.[0] || null
        };
      }) || [];

      console.log('✅ useContratosAtivos - Contratos formatados:', contratosFormatados);
      setContratos(contratosFormatados);
      lastLoadTime.current = now;
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contratos ativos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusAssinatura = async (contratoId: string, status: 'aguardando_assinatura' | 'assinado') => {
    console.log('🔄 useContratosAtivos - Iniciando atualização:', { contratoId, status });
    
    // Update otimista primeiro - manter estado visual consistente
    setContratos(prevContratos => 
      prevContratos.map(contrato => 
        contrato.id === contratoId 
          ? { 
              ...contrato, 
              status_assinatura: status,
              data_assinatura_fornecedor: status === 'assinado' ? new Date().toISOString() : contrato.data_assinatura_fornecedor 
            }
          : contrato
      )
    );
    
    try {
      const updateData: any = { 
        status_assinatura: status 
      };

      if (status === 'assinado') {
        updateData.data_assinatura_fornecedor = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contratos')
        .update(updateData)
        .eq('id', contratoId);

      if (error) {
        console.error('❌ Erro ao atualizar status do contrato:', error);
        // Reverter update otimista em caso de erro
        await carregarContratos(true);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do contrato",
          variant: "destructive",
        });
        throw error;
      }

      console.log('✅ useContratosAtivos - Status atualizado com sucesso no banco');
      
      // Invalidar cache para próximo carregamento ser fresh
      lastLoadTime.current = 0;
      
      toast({
        title: "Status Atualizado",
        description: `Status do contrato alterado para: ${status === 'assinado' ? 'Aprovado para Início' : 'Aguardando Assinatura'}`,
      });
      
    } catch (error) {
      console.error('❌ useContratosAtivos - Erro na atualização:', error);
      throw error;
    }
  };

  const buscarContratoPorId = (contratoId: string): ContratoAtivo | undefined => {
    return contratos.find(contrato => contrato.id === contratoId);
  };

  // Estatísticas dos contratos
  const estatisticas = {
    total: contratos.length,
    aguardando_assinatura: contratos.filter(c => c.status_assinatura === 'aguardando_assinatura').length,
    aprovados_inicio: contratos.filter(c => c.status_assinatura === 'assinado').length,
    obras_em_andamento: contratos.filter(c => c.obra?.status === 'em_andamento').length,
    valor_total: contratos.reduce((acc, c) => acc + (c.valor_contrato || 0), 0)
  };

  useEffect(() => {
    carregarContratos();
  }, [profile?.id]);

  return {
    contratos,
    loading,
    carregarContratos,
    atualizarStatusAssinatura,
    buscarContratoPorId,
    estatisticas
  };
};