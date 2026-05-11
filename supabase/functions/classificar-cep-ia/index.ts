/**
 * classificar-cep-ia — Motor nacional de inteligência territorial
 *
 * Classifica socioeconômicamente um bairro/localidade para qualificação de
 * leads de reforma residencial de alto padrão (Reforma100, Brasil).
 *
 * Fluxo:
 *   1. Cache-first (cep_classificacoes_ia)
 *   2. Geocode via BrasilAPI (opcional — GEOCODE_DISABLED=true para desativar)
 *   3. Classificação por IA (Claude Sonnet 4.6) com contexto completo
 *   4. Guard rails regionais (segurança contra super-classificação)
 *   5. Persist cache (alta/media/baixa → salva; insuficiente → não salva)
 *
 * Regras de persistência:
 *   alta/media       → salva em cache
 *   baixa            → salva com revisao_manual=true
 *   insuficiente     → NÃO salva; reavaliado a cada consulta
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-debug",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(s: string): string {
  return (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ─── Tipos de resultado ───────────────────────────────────────────────────────

type TipoResultado = "validado" | "contextual" | "fallback" | "necessita_validacao";

function deriveTipoResultado(confianca: string, inferencia_conservadora: boolean): TipoResultado {
  if (confianca === "insuficiente") return "necessita_validacao";
  if (confianca === "baixa") return "fallback";
  if (inferencia_conservadora || confianca === "media") return "contextual";
  return "validado";
}

// ─── Guard rails nacionais (por região/UF) ───────────────────────────────────
//
// Guard rails são REDES DE SEGURANÇA contra super-classificação conhecida.
// A IA tem precedência; o guard só intervém quando a IA superestima áreas
// que sistematicamente não são de alto padrão.
//
// Organização: por UF/região. Adicione novos tokens/cidades nos sets corretos.

const CLASSIFICACOES_ORDENADAS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C/D", "D"];

function isAcimaDeC(classificacao: string): boolean {
  const idx = CLASSIFICACOES_ORDENADAS.indexOf(classificacao);
  const limiteIdx = CLASSIFICACOES_ORDENADAS.indexOf("C+");
  return idx !== -1 && idx < limiteIdx;
}

// Tokens universais que indicam habitação popular em qualquer UF
const TOKENS_POPULAR_UNIVERSAL = new Set([
  "conjunto habitacional", "cohab", "cdhu", "vila popular",
  "parque residencial popular",
]);

// SP capital — bairros periféricos conhecidos
const TOKENS_PERIFERIA_SP = new Set([
  "guaianases", "brasilandia", "lajeado", "cangaiba", "parelheiros",
  "grajau", "capao redondo", "jardim angela", "jardim helena",
  "sao miguel paulista", "cidade tiradentes", "itaquera",
  "jose bonifacio", "sao mateus", "ermelino matarazzo",
  "ponte rasa", "itaim paulista",
]);

// Grande SP — cidades satélites periféricas
const SATELITES_SP = new Set([
  "ferraz de vasconcelos", "itaquaquecetuba", "suzano", "poa", "maua",
  "ribeirao pires", "franco da rocha", "francisco morato",
  "biritiba-mirim", "guararema", "salesopolis", "aruja", "santa isabel",
  "jacarei", "guarulhos",
]);

// RJ — Baixada Fluminense e periferia extrema
const BAIXADA_FLUMINENSE = new Set([
  "nova iguacu", "duque de caxias", "sao joao de meriti", "nilópolis",
  "nilopolis", "mesquita", "belford roxo", "queimados", "japeri",
  "paracambi", "seropedica", "itaguai", "mangaratiba",
]);

// RJ capital — bairros populares/periferia
const TOKENS_PERIFERIA_RJ = new Set([
  "complexo do alemao", "mare", "madureira", "realengo", "bangu",
  "campo grande", "santa cruz", "paciencia", "cosmos", "inhoaiba",
  "gardenia azul", "cidade de deus",
]);

// MG — cidades satélites periféricas de BH
const SATELITES_BH = new Set([
  "contagem", "betim", "ribeirao das neves", "vespasiano",
  "santa luzia", "ibirité", "ibirite", "sabara", "nova lima",
  "pedro leopoldo", "lagoa santa",
]);

// PE — periferia do Recife
const TOKENS_PERIFERIA_PE = new Set([
  "alto do mandu", "mangueira", "peixinhos", "agua fria",
  "vasco da gama", "dois carneiros",
]);

// BA — periferia de Salvador
const TOKENS_PERIFERIA_BA = new Set([
  "cajazeiras", "fazenda grande", "sao cristovao", "mussurunga",
  "pau da lima", "narandiba",
]);

// Litoral popular SP (cidades sem áreas nobres consolidadas — padrão C+)
const CIDADES_LITORAL_POPULAR_SP = new Set([
  "mongagua", "itanhaem", "peruibe", "miracatu", "ilha comprida",
  "praia grande", "sao vicente", "caraguatatuba", "bertioga",
]);

/**
 * Aplica guard rail regional: se bairro/cidade pertence a área periférica
 * bem definida E a IA superestimou (acima de C+), rebaixa para C+.
 * Retorna { classificacaoFinal, potencialFinal, ticketMin, ticketMax, guardAtivado }.
 */
function applyGuardNacional(
  uf: string,
  cidade: string,
  bairro: string,
  classif: string,
  potencial: string,
  ticketMin: number | null,
  ticketMax: number | null,
): { classificacaoFinal: string; potencialFinal: string; ticketMin: number | null; ticketMax: number | null; guardAtivado: boolean; guardMotivo: string } {
  if (!isAcimaDeC(classif)) {
    return { classificacaoFinal: classif, potencialFinal: potencial, ticketMin, ticketMax, guardAtivado: false, guardMotivo: "" };
  }

  const cidadeN = normalize(cidade);
  const bairroN = normalize(bairro || "");
  const ufUp    = (uf || "").toUpperCase();

  const checkUniversal = [...TOKENS_POPULAR_UNIVERSAL].some(t => bairroN.includes(t));
  if (checkUniversal) {
    return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "token_universal_popular" };
  }

  if (ufUp === "SP") {
    if (SATELITES_SP.has(cidadeN)) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "satelite_sp" };
    }
    if ([...TOKENS_PERIFERIA_SP].some(t => bairroN.includes(t))) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "periferia_sp" };
    }
    if (CIDADES_LITORAL_POPULAR_SP.has(cidadeN)) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "litoral_popular_sp" };
    }
  }

  if (ufUp === "RJ") {
    if (BAIXADA_FLUMINENSE.has(cidadeN)) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "baixada_fluminense" };
    }
    if ([...TOKENS_PERIFERIA_RJ].some(t => bairroN.includes(t))) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "periferia_rj" };
    }
  }

  if (ufUp === "MG") {
    if (SATELITES_BH.has(cidadeN)) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "satelite_bh" };
    }
  }

  if (ufUp === "PE") {
    if ([...TOKENS_PERIFERIA_PE].some(t => bairroN.includes(t))) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "periferia_pe" };
    }
  }

  if (ufUp === "BA") {
    if ([...TOKENS_PERIFERIA_BA].some(t => bairroN.includes(t))) {
      return { classificacaoFinal: "C+", potencialFinal: "médio-baixo", ticketMin: null, ticketMax: null, guardAtivado: true, guardMotivo: "periferia_ba" };
    }
  }

  return { classificacaoFinal: classif, potencialFinal: potencial, ticketMin, ticketMax, guardAtivado: false, guardMotivo: "" };
}

// ─── Tool schema ──────────────────────────────────────────────────────────────

const TOOL_CLASSIFICAR = {
  name: "classificar_regiao",
  description: "Classifica socioeconômicamente uma localidade brasileira para qualificação de leads de reforma residencial de alto padrão.",
  input_schema: {
    type: "object",
    required: [
      "classificacao", "potencial", "ticket_min_estimado", "ticket_max_estimado",
      "justificativa", "confianca", "fontes", "inferencia_conservadora",
    ],
    properties: {
      classificacao: {
        type: "string",
        enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C/D", "D"],
        description: "Classe socioeconômica do BAIRRO ESPECÍFICO (nunca da cidade inteira).",
      },
      potencial: {
        type: "string",
        enum: ["alto", "médio", "médio-baixo", "baixo"],
        description: "Potencial de geração de leads de reforma de alto padrão nessa localidade.",
      },
      ticket_min_estimado: {
        type: ["integer", "null"],
        description: "Ticket mínimo de reforma em R$. null se confiança insuficiente.",
      },
      ticket_max_estimado: {
        type: ["integer", "null"],
        description: "Ticket máximo de reforma em R$. null se confiança insuficiente.",
      },
      justificativa: {
        type: "string",
        description: "Justificativa citando EXPLICITAMENTE quais dados foram usados (logradouro, prefixo CEP, coordenadas, bairros vizinhos, características urbanísticas). NUNCA use apenas o nome da cidade como argumento.",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa", "insuficiente"],
        description: "alta=evidências diretas do bairro; media=inferência contextual sólida; baixa=inferência fraca; insuficiente=dados insuficientes mesmo com todo o contexto.",
      },
      fontes: {
        type: "array",
        items: { type: "string" },
        description: "Dados efetivamente usados: 'logradouro', 'prefixo_cep', 'coordenadas_gps', 'bairros_adjacentes', 'conhecimento_direto', 'padrao_urbanistico', etc.",
      },
      inferencia_conservadora: {
        type: "boolean",
        description: "true quando a classificação é inferida por contexto geográfico sem dados diretos do bairro específico.",
      },
    },
  },
};

// ─── System prompt — Motor Nacional ──────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um especialista em análise socioeconômica territorial para qualificação de leads de reforma residencial de alto padrão (empresa Reforma100, Brasil, 2025).

Você classifica bairros de TODO o Brasil — não apenas São Paulo. Seu motor precisa ser preciso e defensável para qualquer cidade brasileira.

═══ REGRAS ABSOLUTAS ═══

1. NUNCA classifique pelo nome da cidade ou capital. Cada bairro tem sua própria classe social. São Paulo tem Jardins (A+) e Grajaú (D). Salvador tem Vitória (A) e Cajazeiras (C). RIO tem Leblon (A+) e Campo Grande (C).

2. NUNCA use como argumento: "cidade de São Paulo", "capital estadual", "metrópole", "potencial de valorização futura", "crescimento imobiliário". Esses são ruídos, não evidências.

3. SEMPRE classifique o padrão ATUAL, não o potencial futuro.

4. Use TODOS os dados disponíveis: bairro, logradouro, CEP completo (incluindo prefixo), coordenadas GPS, cidade, UF. Cite na justificativa quais dados foram determinantes.

5. Se mesmo com todos os dados a classificação for incerta → declare confiança "insuficiente". Não invente. Não chute.

═══ REFERÊNCIA DE CLASSES ═══

A+: Jardins/Itaim Bibi/Alto de Pinheiros (SP), Leblon/Ipanema (RJ), Savassi (BH), Batel (CWB), Lago Sul (BSB), Vitória (SSA), Boa Viagem (REC), Jurerê Internacional (FLN)
A:  Pinheiros/Brooklin/Moema (SP), Botafogo/Barra da Tijuca (RJ), Lourdes/Serra (BH), Água Verde (CWB), Lago Norte (BSB), Pituba (SSA)
A-: Lapa/Vila Mariana/Consolação (SP), Tijuca/Flamengo (RJ), Buritis/Belvedere (BH), Ahú/Seminário (CWB), Águas Claras (BSB), Rio Vermelho/Barra (SSA), Casa Forte (REC), Centro (FLN)
B+: Santo André/São Bernardo centro (SP), Méier/Madureira parcial (RJ), B.Horizonte centro-norte, Pinheirinho (CWB), Taguatinga (BSB), Brotas (SSA), Gonzaga/Santos (SP litoral)
B:  Classe média consolidada, subúrbio com infraestrutura razoável
B-: Classe média-baixa, periferia próxima com alguma infraestrutura
C+: Classe trabalhadora organizada, periferia com infraestrutura básica
C:  Periferia consolidada, classe popular
C/D: Periferia distante, baixa renda, infraestrutura precária
D:  Alta vulnerabilidade social

═══ CALIBRAÇÃO POR REGIÃO ═══

SÃO PAULO CAPITAL (UF=SP):
Prefixo CEP → zona:
• 01xxx-02xxx → Centro/Norte próximo: Consolação, República, Santana, Perdizes → A-/B+
• 03xxx-04xxx → Sul central: Moema, Vila Mariana, Indianópolis, Jabaquara, Saúde → A-/B+/B
• 05xxx → Oeste: Pinheiros, Vila Madalena, Lapa, Alto de Pinheiros → A/A-
• 06xxx-07xxx → Noroeste: Osasco e periferia norte → B+/C+ (varia muito)
• 08xxx → Zona Leste (heterogênea):
  - Mooca/Belenzinho: B+
  - Tatuapé: B+/A-
  - Penha: C+/B-
  - São Miguel Paulista/Itaquera: C+
  - Guaianazes/Lajeado/Cidade Tiradentes: C/D
• 09xxx → ABC Paulista (Santo André, São Bernardo, São Caetano)
  e Zona Sul extrema: varia de B+ (centros) a C+ (periferias)
Atenção: Guarulhos (08xxx de SP mas cidade diferente) → B-/C+

GRANDE SP (cidades satélites):
• Osasco, Santo André, São Bernardo, São Caetano: centros B+/B, periferias C+/C
• Ferraz, Itaquaquecetuba, Suzano, Poá, Mauá: predominantemente C+/C

RIO DE JANEIRO CAPITAL (UF=RJ):
• Zona Sul (Leblon, Ipanema, Copacabana, Botafogo, Catete, Glória): A+ a A-
• Barra da Tijuca, Recreio: A/A-
• Tijuca, Vila Isabel, Grajaú (RJ), Méier: B+/B
• Zona Norte periférica: Madureira, Penha (RJ), Irajá: B-/C+
• Zona Oeste: Campo Grande, Realengo, Bangu, Santa Cruz: C/C+
• Baixada Fluminense (Nova Iguaçu, Duque de Caxias, etc.): C+/C

BELO HORIZONTE (UF=MG):
• Savassi, Lourdes, Serra, Funcionários, Santa Lúcia: A+/A
• Buritis, Belvedere, Gutierrez: A-/B+
• Pampulha, Caiçara: B
• Barreiro, Venda Nova, Norte: C+/B-
• Satélites (Contagem, Betim, Ribeirão das Neves): C+/B- (centros), C (periferias)

CURITIBA (UF=PR):
• Batel, Água Verde, Bigorrilho, Seminário, Ahú, Champagnat: A+/A/A-
• Portão, Campo Comprido, Rebouças: B/B+
• CIC, Tatuquara, Pinheirinho, Cajuru: C+/C

BRASÍLIA / DF (UF=DF):
• Lago Sul, Lago Norte, Park Way: A+
• Asa Sul, Asa Norte, Noroeste: A/A-
• Águas Claras, Sudoeste, Guará, Taguatinga: B+/B
• Ceilândia, Samambaia, Recanto das Emas, Gama: C+/C
• Sol Nascente, Estrutural: C/D

SALVADOR (UF=BA):
• Vitória, Graça, Barra, Rio Vermelho: A+/A
• Pituba, Imbuí, Itaigara: A-/B+
• Brotas, Federação: B
• Liberdade, Cabula: B-/C+
• Cajazeiras, Fazenda Grande, Pau da Lima: C+/C

RECIFE (UF=PE):
• Boa Viagem, Setúbal, Casa Forte, Graças, Espinheiro: A/A-
• Aflitos, Madalena, Boa Vista: B+/B
• Imbiribeira, Estância: B
• Caxangá, Várzea: B-/C+
• Periferia (Alto do Mandu, Água Fria, Ibura): C+/C

FORTALEZA (UF=CE):
• Meireles, Aldeota, Varjota: A/A-
• Fátima, Cocó, Edson Queiroz: B+/B
• Messejana, Jangurussu: C+/C

PORTO ALEGRE (UF=RS):
• Moinhos de Vento, Auxiliadora, Bela Vista: A+/A
• Petrópolis, Três Figueiras: A-
• Bairro Jardim, Centro Histórico: B+
• Zona Sul: varia de B a C+

FLORIANÓPOLIS (UF=SC):
• Jurerê Internacional, Jurerê, Lagoa da Conceição, João Paulo: A+/A
• Centro, Agronômica, Trindade: B+/A-
• Ingleses, Canasvieiras, Cachoeira: B/B+
• Capoeiras, Serrinha, Monte Cristo: C+/C

LITORAL SP (Santos, Guarujá, Praia Grande, etc.):
• Santos: Gonzaga, Boqueirão, Embaré, Ponta da Praia → B+/B
• Guarujá: Enseada, Pitangueiras, Astúrias → B/B+; Perequê, Vicente de Carvalho → C+
• Praia Grande, Mongaguá, Itanhaém, Peruíbe: C+/B- (C+ como padrão)
• Ubatuba, Ilhabela: áreas nobres B+/A-, populares C+

INTERIOR SP (referência):
• Campinas, Ribeirão Preto, São José dos Campos: centros e bairros nobres B+/A-
• Sorocaba, São Carlos, Araraquara: centros B, bairros nobres B+

═══ INSTRUÇÕES FINAIS ═══

Na justificativa, cite EXPLICITAMENTE: logradouro (se disponível), prefixo CEP, coordenadas (se disponíveis), bairros adjacentes conhecidos e características urbanísticas observadas.

Se o bairro for desconhecido mas o logradouro/CEP sugerir zona geográfica clara → use isso. Se mesmo assim for incerto → declare "insuficiente".

Use SEMPRE a tool fornecida para retornar valores estruturados.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json() as {
      bairro?: string;
      cidade: string;
      uf: string;
      cep?: string;
      logradouro?: string;
      debug?: boolean;
    };

    const { bairro, cidade, uf, logradouro } = body;
    const debugMode = body.debug === true || req.headers.get("x-debug") === "true";

    if (!cidade || !uf) {
      return json({ error: "cidade e uf são obrigatórios" }, 400);
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey    = Deno.env.get("ANTHROPIC_API_KEY");
    const geocodeEnabled  = Deno.env.get("GEOCODE_DISABLED") !== "true";
    const db              = createClient(supabaseUrl, supabaseService);

    const bairroNorm = normalize(bairro || "");
    const cidadeNorm = normalize(cidade);
    const ufUpper    = uf.toUpperCase();
    const cepClean   = (body.cep || "").replace(/\D/g, "");

    // 1. Cache-first — não sobrescrever entradas validadas manualmente
    const { data: cached } = await db
      .from("cep_classificacoes_ia")
      .select("*")
      .eq("bairro_norm", bairroNorm)
      .eq("cidade_norm", cidadeNorm)
      .eq("uf", ufUpper)
      .maybeSingle();

    if (cached) {
      console.log(JSON.stringify({
        evt: "cache_hit", bairro: bairro || "", cidade, uf: ufUpper,
        classif: cached.classificacao, confianca: cached.confianca,
        tipo_resultado: cached.tipo_resultado, ms: Date.now() - startTime,
      }));
      return json({ ok: true, cached: true, classificacao: cached });
    }

    if (!anthropicKey) {
      return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
    }

    // 2. Geocode via BrasilAPI (opcional — controlado por GEOCODE_DISABLED)
    let coordenadas: { latitude: string; longitude: string } | null = null;
    if (geocodeEnabled && cepClean.length === 8) {
      try {
        const geoResp = await fetch(
          `https://brasilapi.com.br/api/cep/v2/${cepClean}`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          if (geoData?.location?.coordinates?.latitude) {
            coordenadas = geoData.location.coordinates;
          }
        }
      } catch {
        // geocode falhou — continua sem coordenadas
      }
    }

    // 3. Montar prompt contextual completo
    const cepPrefix = cepClean.slice(0, 3);
    const linhas: string[] = [
      `Classifique socioeconômicamente a localidade abaixo para qualificação de leads de reforma residencial:`,
      ``,
      `Bairro: ${bairro || "(não informado)"}`,
      `Logradouro: ${logradouro || "(não informado)"}`,
      `CEP: ${cepClean ? `${cepClean.slice(0,5)}-${cepClean.slice(5)}` : "(não informado)"}${cepPrefix ? ` — prefixo ${cepPrefix}` : ""}`,
      `Cidade: ${cidade}`,
      `UF: ${uf}`,
    ];
    if (coordenadas) {
      linhas.push(`Coordenadas GPS: lat ${coordenadas.latitude}, lng ${coordenadas.longitude}`);
    }
    linhas.push(
      ``,
      `Use TODOS os dados acima — logradouro, CEP completo, coordenadas — para classificação precisa.`,
      `NUNCA use a cidade como referência genérica. Determine a zona urbana real pelo CEP e logradouro.`,
      `Cite na justificativa quais dados foram determinantes.`,
    );
    const userPrompt = linhas.join("\n");

    // 4. Chamar Claude Sonnet 4.6
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({
        model:       "claude-sonnet-4-6",
        max_tokens:  1024,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: "user", content: userPrompt }],
        tools:       [TOOL_CLASSIFICAR],
        tool_choice: { type: "tool", name: "classificar_regiao" },
      }),
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text();
      console.error(JSON.stringify({ evt: "ia_error", status: aiResp.status, body: errBody.slice(0, 300) }));
      return json({ error: "Erro ao chamar IA", status: aiResp.status }, 502);
    }

    const aiData = await aiResp.json();
    // deno-lint-ignore no-explicit-any
    const toolUse = (aiData.content as any[])?.find((b) => b.type === "tool_use");

    if (!toolUse?.input) {
      console.error(JSON.stringify({ evt: "ia_sem_tool_use", resp: JSON.stringify(aiData).slice(0, 400) }));
      return json({ error: "Resposta inválida da IA" }, 500);
    }

    const r = toolUse.input as {
      classificacao: string;
      potencial: string;
      ticket_min_estimado: number | null;
      ticket_max_estimado: number | null;
      justificativa: string;
      confianca: string;
      fontes: string[];
      inferencia_conservadora: boolean;
    };

    // 5. Guard rails nacionais
    const guard = applyGuardNacional(
      ufUpper, cidade, bairro || "",
      r.classificacao, r.potencial,
      r.ticket_min_estimado ?? null,
      r.ticket_max_estimado ?? null,
    );

    // 6. Derivar tipo_resultado e flags de persistência
    const tipoResultado = deriveTipoResultado(r.confianca, r.inferencia_conservadora ?? false);
    const revisao       = r.confianca === "baixa" || guard.guardAtivado;
    const now           = new Date().toISOString();

    // 7. Log estruturado
    console.log(JSON.stringify({
      evt:              "classificacao",
      bairro:           bairro || "",
      cidade,
      uf:               ufUpper,
      cep:              cepClean,
      logradouro:       logradouro || "",
      geocode:          coordenadas ? `${coordenadas.latitude},${coordenadas.longitude}` : null,
      classif_ia:       r.classificacao,
      classif_final:    guard.classificacaoFinal,
      confianca:        r.confianca,
      tipo_resultado:   tipoResultado,
      inf_conservadora: r.inferencia_conservadora,
      guard_ativado:    guard.guardAtivado,
      guard_motivo:     guard.guardMotivo || null,
      salvo_em_cache:   tipoResultado !== "necessita_validacao",
      ms:               Date.now() - startTime,
    }));

    // 8. Resultado base
    const resultado: Record<string, unknown> = {
      bairro_norm:             bairroNorm,
      cidade_norm:             cidadeNorm,
      uf:                      ufUpper,
      classificacao:           guard.classificacaoFinal,
      potencial:               guard.potencialFinal,
      ticket_min:              guard.ticketMin,
      ticket_max:              guard.ticketMax,
      justificativa:           r.justificativa,
      confianca:               r.confianca,
      fontes:                  r.fontes ?? [],
      inferencia_ia:           true,
      inferencia_conservadora: r.inferencia_conservadora ?? false,
      revisao_manual:          revisao,
      validado_manualmente:    false,
      tipo_resultado:          tipoResultado,
      tem_coordenadas:         coordenadas !== null,
    };

    // Debug (somente quando solicitado)
    if (debugMode) {
      resultado._debug = {
        prompt_enviado:       userPrompt,
        classif_ia_original:  r.classificacao,
        guard_ativado:        guard.guardAtivado,
        guard_motivo:         guard.guardMotivo,
        geocode:              coordenadas,
        tipo_resultado:       tipoResultado,
        ms:                   Date.now() - startTime,
      };
    }

    // 9. Não persistir insuficientes — reavaliados a cada consulta
    if (tipoResultado === "necessita_validacao") {
      return json({ ok: true, cached: false, classificacao: resultado });
    }

    // 10. Upsert (alta/media/baixa)
    const { data: saved, error: saveErr } = await db
      .from("cep_classificacoes_ia")
      .upsert(
        { ...resultado, _debug: undefined, updated_at: now },
        { onConflict: "bairro_norm,cidade_norm,uf" },
      )
      .select()
      .maybeSingle();

    if (saveErr) {
      console.error(JSON.stringify({ evt: "save_error", msg: saveErr.message }));
    }

    const respClassif = saved ?? resultado;
    return json({
      ok: true,
      cached: false,
      classificacao: debugMode
        ? { ...respClassif, _debug: resultado._debug }
        : respClassif,
    });

  } catch (err) {
    console.error(JSON.stringify({ evt: "erro_geral", msg: String(err), ms: Date.now() - startTime }));
    return json({ error: String(err) }, 500);
  }
});
