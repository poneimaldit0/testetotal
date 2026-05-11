import { supabase } from '@/integrations/supabase/client';

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
  fonte: 'db_bairro' | 'db_cidade' | 'ia_cache' | 'ia_nova' | 'fallback';
  origem_classificacao?: 'cache_manual' | 'cache_ia' | 'ia_online' | 'fallback_conservador';
  tipo_resultado?: 'validado' | 'contextual' | 'fallback' | 'necessita_validacao';
  // Campos adicionais de IA — undefined em entradas manuais
  confianca?: 'alta' | 'media' | 'baixa' | 'insuficiente';
  estimado?: boolean; // true quando confiança baixa/insuficiente → exibir aviso
}

export interface CepResultado {
  viaCep: ViaCepData;
  regiao: RegiaoInfo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeGeo(s: string): string {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function deriveZona(uf: string, classificacao: string): string {
  if (uf === 'SP') return 'metropolitana';
  const EXPANSAO = new Set(['PR', 'GO', 'DF', 'MG', 'RJ', 'SC', 'RS']);
  if (EXPANSAO.has(uf) && ['A+', 'A', 'A-', 'B+', 'Premium A+', 'Premium A'].includes(classificacao)) {
    return 'expansão';
  }
  return 'fora';
}

function deriveStatusRegiao(uf: string, classificacao: string): string {
  if (uf === 'SP') {
    const ATIVAS_SP = new Set(['A+', 'A', 'A-', 'B+', 'B']);
    return ATIVAS_SP.has(classificacao) ? 'ativa' : 'fora';
  }
  const EXPANSAO = new Set(['PR', 'GO', 'DF', 'MG', 'RJ', 'SC', 'RS']);
  if (EXPANSAO.has(uf) && ['A+', 'A', 'A-', 'B+', 'Premium A+', 'Premium A'].includes(classificacao)) {
    return 'expansão';
  }
  return 'fora';
}

// ─── Helpers de tipo/resultado ───────────────────────────────────────────────

type TipoResultado = 'validado' | 'contextual' | 'fallback' | 'necessita_validacao';

function deriveTipoResultado(
  confianca: string | undefined,
  inferencia_conservadora: boolean | undefined,
  fonte: string,
): TipoResultado {
  if (fonte === 'db_bairro' || fonte === 'db_cidade') return 'validado';
  if (fonte === 'fallback') return 'fallback';
  if (confianca === 'insuficiente') return 'necessita_validacao';
  if (confianca === 'baixa') return 'fallback';
  if (inferencia_conservadora || confianca === 'media') return 'contextual';
  return 'validado';
}

// ─── Guard rails nacionais (cliente) ─────────────────────────────────────────
//
// Segunda linha de defesa contra super-classificações vindas do cache da IA.
// Espelha os guard rails da edge function para entradas vindas de ia_cache.
// Entradas manuais (db_bairro, db_cidade) nunca são alteradas.

const CLASSIFICACOES_ORDENADAS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C/D', 'D'];

const TOKENS_POPULAR_UNIVERSAL = [
  'conjunto habitacional', 'cohab', 'cdhu', 'vila popular',
];

const TOKENS_PERIFERIA_SP = [
  'guaianases', 'brasilandia', 'lajeado', 'cangaiba', 'parelheiros',
  'grajau', 'capao redondo', 'jardim angela', 'jardim helena',
  'sao miguel paulista', 'cidade tiradentes', 'itaquera',
  'jose bonifacio', 'sao mateus', 'ermelino matarazzo',
  'ponte rasa', 'itaim paulista',
];

const SATELITES_SP = new Set([
  'ferraz de vasconcelos', 'itaquaquecetuba', 'suzano', 'poa', 'maua',
  'ribeirao pires', 'franco da rocha', 'francisco morato',
  'biritiba-mirim', 'guararema', 'salesopolis', 'aruja', 'santa isabel',
  'jacarei', 'guarulhos',
]);

const BAIXADA_FLUMINENSE = new Set([
  'nova iguacu', 'duque de caxias', 'sao joao de meriti', 'nilopolis',
  'nilópolis', 'mesquita', 'belford roxo', 'queimados', 'japeri',
  'seropedica', 'itaguai',
]);

const SATELITES_BH = new Set([
  'contagem', 'betim', 'ribeirao das neves', 'vespasiano',
  'santa luzia', 'ibirite', 'sabara',
]);

const CIDADES_LITORAL_POPULAR_SP = new Set([
  'mongagua', 'itanhaem', 'peruibe', 'ilha comprida',
  'praia grande', 'sao vicente', 'caraguatatuba', 'bertioga',
]);

function isClassificacaoAcimaDeC(classificacao: string): boolean {
  const idx = CLASSIFICACOES_ORDENADAS.indexOf(classificacao);
  const limiteIdx = CLASSIFICACOES_ORDENADAS.indexOf('C+');
  return idx !== -1 && idx < limiteIdx;
}

// Guard nacional: aplica a entradas ia_cache e ia_nova (nunca a manuais)
function applyGuardNacional(regiao: RegiaoInfo): RegiaoInfo {
  if (regiao.fonte === 'db_bairro' || regiao.fonte === 'db_cidade') return regiao;
  if (!isClassificacaoAcimaDeC(regiao.classificacao)) return regiao;

  const bairroN = normalizeGeo(regiao.bairro);
  const cidadeN = normalizeGeo(regiao.cidade);
  const uf      = (regiao.uf || '').toUpperCase();

  const rebaixar = (motivo: string): RegiaoInfo => {
    console.warn('[cepIntelligencia] guard:', motivo, '→', regiao.bairro, '/', regiao.cidade, regiao.classificacao, '→ C+');
    return { ...regiao, classificacao: 'C+', potencial: 'médio-baixo', status_regiao: 'fora', faixa_valor_min: null, faixa_valor_max: null };
  };

  if (TOKENS_POPULAR_UNIVERSAL.some(t => bairroN.includes(t))) return rebaixar('universal_popular');

  if (uf === 'SP') {
    if (SATELITES_SP.has(cidadeN)) return rebaixar('satelite_sp');
    if (TOKENS_PERIFERIA_SP.some(t => bairroN.includes(t))) return rebaixar('periferia_sp');
    if (CIDADES_LITORAL_POPULAR_SP.has(cidadeN)) return rebaixar('litoral_popular_sp');
  }

  if (uf === 'RJ' && BAIXADA_FLUMINENSE.has(cidadeN)) return rebaixar('baixada_fluminense');

  if (uf === 'MG' && SATELITES_BH.has(cidadeN)) return rebaixar('satelite_bh');

  return regiao;
}

// ─── consultarCep ─────────────────────────────────────────────────────────────

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

  const bairro = (viaCep.bairro     || '').trim();
  const cidade = (viaCep.localidade || '').trim();
  const uf     = (viaCep.uf         || '').trim();
  const ibge   = (viaCep.ibge       || '').trim();

  let regiao: RegiaoInfo | null = null;

  // 2. Match manual: bairro + cidade em regioes_estrategicas (maior autoridade — não sobrescrever)
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
        classificacao:        data.classificacao,
        potencial:            data.potencial,
        zona:                 data.zona,
        status_regiao:        data.status_regiao,
        descricao:            data.descricao || '',
        faixa_valor_min:      data.faixa_valor_min,
        faixa_valor_max:      data.faixa_valor_max,
        fonte:                'db_bairro',
        origem_classificacao: 'cache_manual',
        tipo_resultado:       'validado',
      };
    }
  }

  // 3. Match manual: só cidade (entrada city-level)
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
        classificacao:        data.classificacao,
        potencial:            data.potencial,
        zona:                 data.zona,
        status_regiao:        data.status_regiao,
        descricao:            data.descricao || '',
        faixa_valor_min:      data.faixa_valor_min,
        faixa_valor_max:      data.faixa_valor_max,
        fonte:                'db_cidade',
        origem_classificacao: 'cache_manual',
        tipo_resultado:       'validado',
      };
    }
  }

  // 4. Cache IA: bairro+cidade+UF em cep_classificacoes_ia
  if (!regiao && cidade) {
    const bairroNorm = normalizeGeo(bairro);
    const cidadeNorm = normalizeGeo(cidade);

    const { data: cached } = await (supabase as any)
      .from('cep_classificacoes_ia')
      .select('classificacao, potencial, ticket_min, ticket_max, justificativa, confianca, revisao_manual, inferencia_conservadora')
      .eq('bairro_norm', bairroNorm)
      .eq('cidade_norm', cidadeNorm)
      .eq('uf', uf.toUpperCase())
      .maybeSingle();

    if (cached) {
      const estimado = cached.revisao_manual || cached.inferencia_conservadora ||
        cached.confianca === 'baixa' || cached.confianca === 'insuficiente';
      regiao = applyGuardNacional({
        bairro, cidade, uf, ibge,
        classificacao:        cached.classificacao,
        potencial:            cached.potencial,
        zona:                 deriveZona(uf, cached.classificacao),
        status_regiao:        deriveStatusRegiao(uf, cached.classificacao),
        descricao:            cached.justificativa || '',
        faixa_valor_min:      cached.ticket_min ?? null,
        faixa_valor_max:      cached.ticket_max ?? null,
        fonte:                'ia_cache',
        origem_classificacao: 'cache_ia',
        tipo_resultado:       cached.tipo_resultado ?? deriveTipoResultado(cached.confianca, cached.inferencia_conservadora, 'ia_cache'),
        confianca:            cached.confianca,
        estimado,
      });
    }
  }

  // 5. Cache miss → chamar edge function classificar-cep-ia (com contexto completo)
  if (!regiao && cidade) {
    try {
      const { data: fnData, error: fnErr } = await (supabase as any).functions.invoke(
        'classificar-cep-ia',
        { body: { bairro, cidade, uf, cep: cepClean, logradouro: viaCep.logradouro || '' } },
      );

      if (!fnErr && fnData?.classificacao) {
        const c = fnData.classificacao;
        const estimado = c.revisao_manual || c.inferencia_conservadora ||
          c.confianca === 'baixa' || c.confianca === 'insuficiente';
        regiao = applyGuardNacional({
          bairro, cidade, uf, ibge,
          classificacao:        c.classificacao,
          potencial:            c.potencial,
          zona:                 deriveZona(uf, c.classificacao),
          status_regiao:        deriveStatusRegiao(uf, c.classificacao),
          descricao:            c.justificativa || '',
          faixa_valor_min:      c.ticket_min ?? null,
          faixa_valor_max:      c.ticket_max ?? null,
          fonte:                'ia_nova',
          origem_classificacao: 'ia_online',
          tipo_resultado:       c.tipo_resultado ?? deriveTipoResultado(c.confianca, c.inferencia_conservadora, 'ia_nova'),
          confianca:            c.confianca,
          estimado,
        });
      } else if (fnErr) {
        console.warn('[cepIntelligencia] edge function error:', fnErr);
      }
    } catch (e) {
      console.warn('[cepIntelligencia] edge function exception:', e);
    }
  }

  // 6. Fallback conservador (edge function indisponível)
  if (!regiao) {
    regiao = {
      bairro, cidade, uf, ibge,
      zona:                 'fora',
      classificacao:        'C+',
      potencial:            'médio-baixo',
      status_regiao:        'fora',
      descricao:            'Classificação não disponível. Qualifique o lead manualmente antes de iniciar cadência.',
      faixa_valor_min:      null,
      faixa_valor_max:      null,
      fonte:                'fallback',
      origem_classificacao: 'fallback_conservador',
      tipo_resultado:       'fallback',
      confianca:            'insuficiente',
      estimado:             true,
    };
  }

  // 7. Persistir pesquisa (fire-and-forget)
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
