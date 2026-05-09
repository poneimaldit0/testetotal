import { supabase } from '@/integrations/supabase/client';
import dadosNacionais from '../data/dadosNacionaisReforma100.json';

export interface ViaCepData {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

export interface RegiaoInfo {
  bairro: string;
  cidade: string;
  uf: string;
  ibge: string;
  zona: string;
  classificacao: string;
  potencial: string;
  status_regiao: string;
  descricao: string;
  faixa_valor_min: number | null;
  faixa_valor_max: number | null;
  fonte: 'db_bairro' | 'db_cidade' | 'json_nacional' | 'desconhecida';
}

export interface CepResultado {
  viaCep: ViaCepData;
  regiao: RegiaoInfo;
}

// Mapeamento dos tiers do JSON nacional para as classificações do sistema
// ATENÇÃO: o JSON classifica algumas cidades da Grande SP como "litoral" (erro de metodologia).
// Essas cidades são resolvidas pelo seed do banco (db_bairro / db_cidade) antes de chegar aqui.
type JsonTier = 'prime' | 'alta' | 'media-a' | 'media-b' | 'opp' | 'litoral-prime' | 'litoral-alta' | 'litoral-b';

const JSON_TIER: Record<JsonTier, { classificacao: string; potencial: string; litoral: boolean }> = {
  'prime':         { classificacao: 'Premium A+',            potencial: 'alto',  litoral: false },
  'alta':          { classificacao: 'Premium A',             potencial: 'alto',  litoral: false },
  'media-a':       { classificacao: 'A-',                    potencial: 'médio', litoral: false },
  'media-b':       { classificacao: 'B+',                    potencial: 'médio', litoral: false },
  'opp':           { classificacao: 'Oportunidade',          potencial: 'médio', litoral: false },
  'litoral-prime': { classificacao: 'Premium A+',            potencial: 'alto',  litoral: true  },
  'litoral-alta':  { classificacao: 'Premium A',             potencial: 'alto',  litoral: true  },
  'litoral-b':     { classificacao: 'B+',                    potencial: 'médio', litoral: true  },
};

// Capitais de expansão confirmadas (prime/alta fora de SP)
const EXPANSAO_UFS = new Set(['PR', 'GO', 'DF', 'MG', 'RJ', 'SC', 'RS']);

const DESCRICOES: Record<string, string> = {
  'Premium A+':               'Região de altíssimo padrão, com forte presença de imóveis de luxo, alto poder aquisitivo e alta propensão a reformas completas. Ticket médio acima de R$300k.',
  'Premium A':                'Região de alta renda consolidada com demanda consistente por reformas de alto padrão. Ticket entre R$150k e R$300k. Boa taxa de conversão com abordagem consultiva.',
  'A-':                       'Região de média-alta renda com boa propensão a reformas de qualidade. Ticket entre R$80k e R$150k. Clientes exigentes que priorizam qualidade e referências.',
  'B+':                       'Região de classe média consolidada com demanda crescente por reformas. Ticket entre R$50k e R$80k. Volume bom com abordagem adequada ao perfil.',
  'B':                        'Região em monitoramento com potencial emergente. Ticket entre R$30k e R$50k. Qualificação cuidadosa recomendada antes de iniciar cadência.',
  'Oportunidade':             'Região com oportunidades pontuais — alta variação de perfil. Priorizar leads com projeto definido e orçamento acima de R$40k antes de iniciar cadência.',
  'Periférico com potencial': 'Região em crescimento e valorização recente. Pode gerar oportunidades, mas requer qualificação criteriosa do perfil e orçamento disponível.',
};

const tierMap = dadosNacionais.municipioTierMap as Record<string, string>;

function resolverPorIbge(ibge: string, uf: string): Pick<RegiaoInfo, 'classificacao' | 'potencial' | 'zona' | 'status_regiao'> | null {
  const tier = tierMap[ibge] as JsonTier | undefined;
  if (!tier || !JSON_TIER[tier]) return null;

  const { classificacao, potencial, litoral } = JSON_TIER[tier];

  let zona: string;
  let status_regiao: string;

  if (litoral) {
    // O JSON diz litoral — aceitamos para cidades que não estão no banco.
    // Cidades da Grande SP que o JSON classifica erroneamente como litoral
    // já foram resolvidas pelo banco antes de chegar aqui.
    zona          = 'litoral';
    status_regiao = 'expansão';
  } else if (uf === 'SP') {
    zona          = 'metropolitana';
    status_regiao = 'ativa';
  } else if (EXPANSAO_UFS.has(uf) && (tier === 'prime' || tier === 'alta')) {
    zona          = 'expansão';
    status_regiao = 'expansão';
  } else {
    zona          = 'fora';
    status_regiao = 'fora';
  }

  return { classificacao, potencial, zona, status_regiao };
}

export async function consultarCep(
  cep: string,
  sdrId?: string,
  leadId?: string,
): Promise<CepResultado | null> {
  const cepClean = cep.replace(/\D/g, '');
  if (cepClean.length !== 8) return null;

  // 1. ViaCEP
  let viaCep: ViaCepData;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
    if (!resp.ok) return null;
    viaCep = await resp.json();
    if (viaCep.erro) return null;
  } catch {
    return null;
  }

  const bairro = (viaCep.bairro    || '').trim();
  const cidade = (viaCep.localidade || '').trim();
  const uf     = (viaCep.uf         || '').trim();
  const ibge   = (viaCep.ibge       || '').trim();

  let regiao: RegiaoInfo | null = null;

  // 2. Match exato: bairro + cidade na tabela
  if (bairro && cidade) {
    const { data } = await (supabase as any)
      .from('regioes_estrategicas')
      .select('classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max')
      .eq('ativo', true)
      .ilike('cidade', cidade)
      .ilike('bairro', bairro)
      .limit(1)
      .maybeSingle();

    if (data) {
      regiao = {
        bairro, cidade, uf, ibge,
        classificacao:   data.classificacao,
        potencial:       data.potencial,
        zona:            data.zona,
        status_regiao:   data.status_regiao,
        descricao:       data.descricao || DESCRICOES[data.classificacao] || '',
        faixa_valor_min: data.faixa_valor_min,
        faixa_valor_max: data.faixa_valor_max,
        fonte: 'db_bairro',
      };
    }
  }

  // 3. Fallback: só cidade (entrada city-level sem bairro no banco)
  if (!regiao && cidade) {
    const { data } = await (supabase as any)
      .from('regioes_estrategicas')
      .select('classificacao, potencial, zona, status_regiao, descricao, faixa_valor_min, faixa_valor_max')
      .eq('ativo', true)
      .ilike('cidade', cidade)
      .is('bairro', null)
      .limit(1)
      .maybeSingle();

    if (data) {
      regiao = {
        bairro, cidade, uf, ibge,
        classificacao:   data.classificacao,
        potencial:       data.potencial,
        zona:            data.zona,
        status_regiao:   data.status_regiao,
        descricao:       data.descricao || DESCRICOES[data.classificacao] || '',
        faixa_valor_min: data.faixa_valor_min,
        faixa_valor_max: data.faixa_valor_max,
        fonte: 'db_cidade',
      };
    }
  }

  // 4. Fallback: JSON nacional por código IBGE
  // Safety cap: sem match exato de bairro no banco, nunca classificar acima de A-.
  // Premium A+ e Premium A exigem confirmação explícita via seed (db_bairro / db_cidade).
  if (!regiao && ibge) {
    const tier = resolverPorIbge(ibge, uf);
    if (tier) {
      const CAP: Record<string, string> = { 'Premium A+': 'A-', 'Premium A': 'A-' };
      const classificacaoFinal = CAP[tier.classificacao] ?? tier.classificacao;
      const potencialFinal     = classificacaoFinal === 'A-' ? 'médio' : tier.potencial;
      regiao = {
        bairro, cidade, uf, ibge,
        classificacao:   classificacaoFinal,
        potencial:       potencialFinal,
        zona:            tier.zona,
        status_regiao:   tier.status_regiao,
        descricao:       DESCRICOES[classificacaoFinal] || '',
        faixa_valor_min: null,
        faixa_valor_max: null,
        fonte: 'json_nacional',
      };
    }
  }

  // 5. Fora de área (nenhum match)
  if (!regiao) {
    regiao = {
      bairro, cidade, uf, ibge,
      zona:            'fora',
      classificacao:   'B',
      potencial:       'baixo',
      status_regiao:   'fora',
      descricao:       'Região fora das áreas de atuação mapeadas. Avalie caso a caso se vale iniciar cadência.',
      faixa_valor_min: null,
      faixa_valor_max: null,
      fonte:           'desconhecida',
    };
  }

  // 6. Persistir pesquisa (fire-and-forget)
  (supabase as any)
    .from('cep_pesquisas')
    .insert({
      cep:           cepClean,
      bairro:        regiao.bairro  || null,
      cidade:        regiao.cidade,
      uf:            regiao.uf,
      ibge:          regiao.ibge    || null,
      zona:          regiao.zona,
      classificacao: regiao.classificacao,
      potencial:     regiao.potencial,
      status_regiao: regiao.status_regiao,
      lead_id:       leadId || null,
      sdr_id:        sdrId  || null,
    })
    .then(() => {});

  return { viaCep, regiao };
}
