import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TipoProposta = 'projeto_arquitetonico' | 'execucao_obra' | 'proposta_completa';
export type NivelRisco  = 'baixo' | 'medio' | 'alto';
export type NivelDetalhe = 'baixo' | 'medio' | 'alto';
export type BadgeMercado = 'verde' | 'ambar' | 'vermelho';

// ── Etapa 0 ──────────────────────────────────────────────────────────────────
export interface ClassificacaoProposta {
  tipo_proposta:       TipoProposta;
  justificativa_tipo:  string;
}

// ── Etapa 1 — Escopo ─────────────────────────────────────────────────────────
export interface AnaliseEscopo {
  clareza_tecnica:               string;
  termos_vagos:                  string[];
  itens_ausentes:                string[];
  nivel_detalhamento:            NivelDetalhe;
  separacao_materiais_mo:        boolean;
  definicao_responsabilidades:   string;
  // Execução
  cobertura_servicos?:           string[];
  // Projeto
  entregaveis?:                  string[];
  numero_revisoes?:              string;
}

// ── Etapa 2 — Preço ──────────────────────────────────────────────────────────
export interface ComparativoMercado {
  valor_fornecedor:              number;
  media_mercado:                 number;
  alto_padrao:                   number;
  diferenca_percentual_mercado:  number;
  classificacao_preco:           'abaixo_mercado' | 'dentro_mercado' | 'acima_mercado';
  valor_por_m2_fornecedor?:      number;
  valor_por_m2_mercado?:         number;
  faixa_referencia_min?:         number;
  faixa_referencia_max?:         number;
}

export interface DetalheCategoria {
  categoria:     string;
  mao_obra:      number;
  material:      number;
  total:         number;
  percentual_mo?: number;
}

export interface Composicao {
  total_mao_obra:               number;
  total_materiais:              number;
  total_gestao_bdi?:            number;
  percentual_mao_obra?:         number;
  percentual_materiais?:        number;
  percentual_gestao?:           number;
  detalhamento_categorias:      DetalheCategoria[];
}

// ── Etapa 3 — Risco ──────────────────────────────────────────────────────────
export interface AnaliseRisco {
  risco_tecnico:        string;
  risco_financeiro:     string;
  risco_operacional:    string;
  risco_contratual:     string;
  nivel_risco_geral:    NivelRisco;
}

// ── Etapa 4 — Competitividade ─────────────────────────────────────────────────
export interface Competitividade {
  pontos_perda:              string[];
  pontos_destaque:           string[];
  qualidade_apresentacao:    string;
  melhorias_comerciais:      string[];
  impacto_competitivo:       string;
}

// ── Etapa 5 — Análise específica por tipo ─────────────────────────────────────
export interface AnaliseEspecifica {
  descricao: string;
  pontos:    string[];
}

// ── Seções legacy (mantidas para compatibilidade) ────────────────────────────
export interface TabelaTecnica {
  empresa:                string;
  valor_total:            number;
  composicao_resumo:      string;
  vs_mercado:             string;
  vs_alto_padrao?:        string;
  escopo_resumo?:         string;
  pontos_fortes_tecnicos?: string[];
  pontos_fracos_tecnicos?: string[];
  prazo_informado?:       string;
  condicoes_pagamento?:   string;
}

export interface ComparacaoCategoria {
  categoria:                  string;
  valor_fornecedor:           number;
  valor_referencia_sinapi:    number;
  diferenca_percentual:       number;
  badge:                      BadgeMercado;
}

export interface ReferenciaMercado {
  indice_utilizado:           string;
  calculo_passo_a_passo:      string;
  itens_especiais_separados?: string[];
  comparacao_por_categoria:   ComparacaoCategoria[];
  fontes?:                    string[];
  citacao_referencia:         string;
}

export interface AnaliseTecnica {
  posicionamento_geral:        string;
  justificativas_valores:      string;
  itens_atencao_negociacao:    string;
  pontos_esclarecimento:       string;
}

export interface EscopoProjeto {
  sintese_tecnica:         string;
  tipologia_identificada:  string;
  servicos_inclusos:       string[];
  area_total?:             string;
  observacoes_escopo?:     string;
}

export interface Conclusao {
  pontos_positivos:    string[];
  pontos_negativos:    string[];
  recomendacao_final:  string;
}

// ── Output principal ──────────────────────────────────────────────────────────
export interface AnaliseCompleta {
  // Etapa 0
  tipo_proposta:       TipoProposta;
  justificativa_tipo:  string;
  // Compatibilidade com o orçamento principal (opcional — propostas antigas não têm)
  compatibilidade_escopo?:    'compativel' | 'parcial' | 'incompativel';
  motivo_incompatibilidade?:  string | null;
  // Score e risco
  score:               number;
  nivel_risco:         NivelRisco;
  // Etapas
  analise_escopo:      AnaliseEscopo;
  comparativo_mercado: ComparativoMercado;
  composicao:          Composicao;
  analise_risco:       AnaliseRisco;
  competitividade:     Competitividade;
  analise_especifica:  AnaliseEspecifica;
  recomendacoes:       string[];
  // Legacy (compatibilidade)
  escopo_projeto:      EscopoProjeto;
  tabela_tecnica:      TabelaTecnica;
  referencia_mercado:  ReferenciaMercado;
  analise_tecnica:     AnaliseTecnica;
  conclusao:           Conclusao;
}

export interface AnaliseIA {
  id:                       string;
  candidatura_id:           string;
  posicionamento:           string | null;
  valor_proposta:           number | null;
  valor_referencia_mercado: number | null;
  pontos_fortes:            string[];
  pontos_atencao:           string[];
  status:                   string;
  qualidade_leitura:        'completa' | 'parcial' | 'proposta_incompleta' | null;
  created_at:               string;
  analise_completa:         AnaliseCompleta | null;
}

type StatusAnalise = 'idle' | 'processing' | 'completed' | 'failed' | 'invalid';

export const useAnalisePropostaIA = (candidaturaId: string) => {
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [statusAnalise, setStatusAnalise] = useState<StatusAnalise>('idle');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarAnalise = useCallback(async () => {
    if (!candidaturaId) return;

    const { data, error } = await supabase
      .from('propostas_analises_ia')
      .select('*')
      .eq('candidatura_id', candidaturaId)
      .neq('status', 'cancelada')
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar análise:', error);
      return;
    }

    if (data) {
      const analiseCompleta = data.analise_completa as unknown as AnaliseCompleta | null;
      
      setAnalise({
        ...data,
        pontos_fortes:     (data.pontos_fortes as string[]) || [],
        pontos_atencao:    (data.pontos_atencao as string[]) || [],
        analise_completa:  analiseCompleta || null,
        qualidade_leitura: (data.qualidade_leitura as AnaliseIA['qualidade_leitura']) ?? null,
      });

      if (data.status === 'completed') {
        setStatusAnalise('completed');
        stopPolling();
      } else if (data.status === 'invalid') {
        setStatusAnalise('invalid');
        stopPolling();
      } else if (data.status === 'failed' || data.status === 'cancelada') {
        setStatusAnalise('failed');
        stopPolling();
      } else if (data.status === 'pending') {
        setStatusAnalise('processing');
      }
    }
  }, [candidaturaId]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      carregarAnalise();
    }, 3000);
  }, [carregarAnalise, stopPolling]);

  const solicitarAnalise = useCallback(async (arquivoId: string) => {
    if (!candidaturaId) return;

    setStatusAnalise('processing');

    try {
      const { data, error } = await supabase.functions.invoke('analisar-proposta', {
        body: { candidatura_id: candidaturaId, arquivo_id: arquivoId },
      });

      if (error) {
        console.error('Erro ao solicitar análise:', error);
        setStatusAnalise('failed');
        return;
      }

      if (data?.status === 'completed') {
        await carregarAnalise();
      } else if (data?.status === 'invalida' || data?.status === 'invalid') {
        // Edge function abortou por proposta inválida — carregar registro 'invalid' do banco
        await carregarAnalise();
      } else if (data?.status === 'failed') {
        setStatusAnalise('failed');
        await carregarAnalise();
      } else {
        startPolling();
      }
    } catch (err) {
      console.error('Erro na chamada:', err);
      setStatusAnalise('failed');
    }
  }, [candidaturaId, carregarAnalise, startPolling]);

  useEffect(() => {
    carregarAnalise();
    return () => stopPolling();
  }, [carregarAnalise, stopPolling]);

  const resetAnalise = useCallback(() => {
    stopPolling();
    setAnalise(null);
    setStatusAnalise('idle');
  }, [stopPolling]);

  return {
    analise,
    statusAnalise,
    solicitarAnalise,
    resetAnalise,
  };
};
