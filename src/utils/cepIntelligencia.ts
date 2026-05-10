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

// ─── Periferias guard ─────────────────────────────────────────────────────────

const CLASSIFICACOES_ORDENADAS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C/D', 'D'];

// Tokens que, quando presentes no nome do bairro normalizado, indicam área periférica
const TOKENS_PERIFERIA_SP = [
  'guaianases', 'brasilandia', 'lajeado', 'cangaiba', 'parelheiros',
  'grajau', 'capao redondo', 'jardim angela', 'jardim helena',
  'sao miguel paulista', 'cidade tiradentes', 'itaquera',
  'jose bonifacio', 'sao mateus', 'ermelino matarazzo',
  'ponte rasa', 'itaim paulista', 'conjunto habitacional',
];

// Cidades satélites periféricas da Grande SP
const CIDADES_SATELITE_PERIFERICAS = new Set([
  'ferraz de vasconcelos', 'itaquaquecetuba', 'suzano', 'poa', 'maua',
  'ribeirao pires', 'franco da rocha', 'francisco morato',
  'biritiba-mirim', 'guararema', 'salesopolis', 'aruja', 'santa isabel', 'jacarei',
]);

function isClassificacaoAcimaDeC(classificacao: string): boolean {
  const idx = CLASSIFICACOES_ORDENADAS.indexOf(classificacao);
  const limiteIdx = CLASSIFICACOES_ORDENADAS.indexOf('C+');
  return idx !== -1 && idx < limiteIdx;
}

// Garante que áreas periféricas não ultrapassem C+ (aplica a todas fontes IA)
function applyPeriferiaGuard(regiao: RegiaoInfo): RegiaoInfo {
  if (regiao.fonte === 'db_bairro' || regiao.fonte === 'db_cidade') return regiao;

  const bairroNorm = normalizeGeo(regiao.bairro);
  const cidadeNorm = normalizeGeo(regiao.cidade);

  const isSatelite   = CIDADES_SATELITE_PERIFERICAS.has(cidadeNorm);
  const hasPerifToken = TOKENS_PERIFERIA_SP.some(t => bairroNorm.includes(t));

  if ((isSatelite || hasPerifToken) && isClassificacaoAcimaDeC(regiao.classificacao)) {
    console.warn(
      '[cepIntelligencia] periferiaGuard:', regiao.bairro, '/', regiao.cidade,
      '→', regiao.classificacao, 'rebaixada para C+',
    );
    return {
      ...regiao,
      classificacao:   'C+',
      potencial:       'médio-baixo',
      status_regiao:   'fora',
      faixa_valor_min: null,
      faixa_valor_max: null,
    };
  }

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
      regiao = applyPeriferiaGuard({
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
        regiao = applyPeriferiaGuard({
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
