import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { buscarOrcamentosOtimizado, processarDadosOrcamento } from './useOrcamentoDB';

interface Arquivo {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho: number;
  url_arquivo: string;
}

export interface OrcamentoGlobal {
  id: string;
  necessidade: string;
  categorias: string[];
  local: string;
  tamanhoImovel: number;
  dataPublicacao: Date;
  dataInicio: Date | string;
  prazoInicioTexto?: string;
  status: 'aberto' | 'fechado';
  quantidadeEmpresas: number;
  dadosContato?: {
    nome: string;
    telefone: string;
    email: string;
  } | null;
  conciergeResponsavel?: {
    nome: string;
    email: string;
  } | null;
  inscricaoId?: string;
  inscritoEm?: Date;
  statusAcompanhamento?: string | null;
  estaInscrito: boolean;
  arquivos?: Arquivo[];
  fotos?: Arquivo[];
  horariosVisita?: Array<{
    id: string;
    data_hora: string;
    fornecedor_id: string | null;
  }>;
}

const DIAS_FECHADOS_INICIAL = 3;
const DIAS_FECHADOS_INCREMENTO = 7;
const DIAS_FECHADOS_MAXIMO = 90;

export const useOrcamentosGlobal = () => {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState<OrcamentoGlobal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMais, setLoadingMais] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diasFechados, setDiasFechados] = useState(DIAS_FECHADOS_INICIAL);

  const carregarOrcamentos = useCallback(async (dias: number, isLoadingMore: boolean = false) => {
    if (!user?.id) {
      setOrcamentos([]);
      setLoading(false);
      return;
    }

    if (isLoadingMore) {
      setLoadingMais(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const orcamentosRaw = await buscarOrcamentosOtimizado(user.id, dias);

      const todosOrcamentos: OrcamentoGlobal[] = orcamentosRaw.map(orc => 
        processarDadosOrcamento(orc, user.id, {})
      );
      
      setOrcamentos(todosOrcamentos);
    } catch (err: any) {
      console.error('❌ useOrcamentosGlobal: Erro:', err);
      setError(err.message || 'Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
      setLoadingMais(false);
    }
  }, [user?.id]);

  // Carregar mais orçamentos fechados
  const carregarMaisFechados = useCallback(async () => {
    const novosDias = Math.min(diasFechados + DIAS_FECHADOS_INCREMENTO, DIAS_FECHADOS_MAXIMO);
    setDiasFechados(novosDias);
    await carregarOrcamentos(novosDias, true);
  }, [diasFechados, carregarOrcamentos]);

  useEffect(() => {
    if (user?.id) {
      carregarOrcamentos(diasFechados);
    }
  }, [user?.id]);

  // Funções auxiliares
  const obterOrcamentosAbertos = useCallback(() => {
    return orcamentos.filter(o => o.status === 'aberto');
  }, [orcamentos]);

  const obterOrcamentosFechados = useCallback(() => {
    return orcamentos.filter(o => o.status === 'fechado');
  }, [orcamentos]);

  const obterMeusOrcamentos = useCallback(() => {
    return orcamentos.filter(o => o.estaInscrito);
  }, [orcamentos]);

  // Verificar se pode carregar mais (não atingiu o máximo)
  const podeCarregarMais = diasFechados < DIAS_FECHADOS_MAXIMO;

  return {
    orcamentos,
    loading,
    loadingMais,
    error,
    diasFechados,
    podeCarregarMais,
    recarregar: () => carregarOrcamentos(diasFechados),
    carregarMaisFechados,
    obterOrcamentosAbertos,
    obterOrcamentosFechados,
    obterMeusOrcamentos,
  };
};
