/**
 * classificar-cep-ia
 *
 * Classifica socioeconômicamente um bairro usando Claude Sonnet 4.6.
 * Fluxo: cache-first → geocode (opcional) → IA contextual → upsert cache.
 *
 * Regras de persistência:
 *   alta/media  → salva em cache
 *   baixa       → salva com revisao_manual=true (revisão periódica recomendada)
 *   insuficiente → NÃO salva; reavaliado a cada consulta
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// ─── Periferias guard ─────────────────────────────────────────────────────────

const CLASSIFICACOES_ORDENADAS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C/D", "D"];

const TOKENS_PERIFERIA_SP = [
  "guaianases", "brasilandia", "lajeado", "cangaiba", "parelheiros",
  "grajau", "capao redondo", "jardim angela", "jardim helena",
  "sao miguel paulista", "cidade tiradentes", "itaquera",
  "jose bonifacio", "sao mateus", "ermelino matarazzo",
  "ponte rasa", "itaim paulista", "conjunto habitacional",
];

const CIDADES_SATELITE_PERIFERICAS = new Set([
  "ferraz de vasconcelos", "itaquaquecetuba", "suzano", "poa", "maua",
  "ribeirao pires", "franco da rocha", "francisco morato",
  "biritiba-mirim", "guararema", "salesopolis", "aruja", "santa isabel", "jacarei",
]);

function isAcimaDeC(classificacao: string): boolean {
  const idx = CLASSIFICACOES_ORDENADAS.indexOf(classificacao);
  const limiteIdx = CLASSIFICACOES_ORDENADAS.indexOf("C+");
  return idx !== -1 && idx < limiteIdx;
}

// ─── Tool schema ──────────────────────────────────────────────────────────────

const TOOL_CLASSIFICAR = {
  name: "classificar_regiao",
  description: "Classifica socioeconômicamente um bairro/cidade para qualificação de leads de reforma residencial de alto padrão.",
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
        description: "Classe socioeconômica do bairro específico (não da cidade inteira).",
      },
      potencial: {
        type: "string",
        enum: ["alto", "médio", "médio-baixo", "baixo"],
        description: "Potencial de geração de leads de reforma de alto padrão nessa região.",
      },
      ticket_min_estimado: {
        type: ["integer", "null"],
        description: "Ticket mínimo estimado em R$. null se confiança insuficiente.",
      },
      ticket_max_estimado: {
        type: ["integer", "null"],
        description: "Ticket máximo estimado em R$. null se confiança insuficiente.",
      },
      justificativa: {
        type: "string",
        description: "Justificativa citando EXPLICITAMENTE quais dados foram usados (logradouro, CEP, coordenadas, bairros adjacentes). Não use argumentos genéricos como 'cidade de São Paulo'.",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa", "insuficiente"],
        description: "alta = evidências diretas do bairro; media = inferência contextual sólida; baixa = inferência fraca; insuficiente = dados insuficientes mesmo com contexto.",
      },
      fontes: {
        type: "array",
        items: { type: "string" },
        description: "Dados usados: 'logradouro', 'prefixo_cep', 'coordenadas_gps', 'bairros_adjacentes', 'conhecimento_direto', etc.",
      },
      inferencia_conservadora: {
        type: "boolean",
        description: "true quando a classificação é inferida por contexto geográfico sem dados diretos do bairro específico.",
      },
    },
  },
};

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um especialista em análise socioeconômica de bairros brasileiros para qualificação de leads de reforma residencial de alto padrão (empresa Reforma100, São Paulo, Brasil, 2025).

REGRAS OBRIGATÓRIAS — NUNCA VIOLE:

1. NUNCA classifique como A+, A ou A- apenas porque a cidade é São Paulo, Rio de Janeiro ou grande metrópole. O bairro específico deve ter evidências concretas de alto padrão.

2. Bairros com indicadores de classe trabalhadora/popular pelos nomes ou localização (Vila, Jardim, Conjunto Habitacional, Parque, Tiradentes, São Miguel, Brasilândia, Lajeado, Guaianases, Capão Redondo, Grajaú, Cidade *, Jardim Angela, etc.) → classificação padrão C+ ou abaixo, salvo evidência específica e forte em contrário.

3. "Expansão futura", "potencial de valorização", "crescimento imobiliário", "zona em desenvolvimento" NÃO elevam a classe social ATUAL do bairro. Classifique o que é hoje, não o que pode ser.

4. SEMPRE diferencie o bairro específico da cidade inteira. São Paulo capital tem bairros A+ (Jardins) e bairros D (Grajaú). Ferraz de Vasconcelos é uma cidade satélite periférica — não classifique como bairro nobre de SP capital.

5. NUNCA use a cidade inteira como referência de classificação para bairros desconhecidos.
   Use o logradouro, CEP completo e coordenadas GPS para determinar a zona urbana real:

   São Paulo capital — referência por prefixo CEP:
   • 01xxx–02xxx → Centro e Norte próximo: Consolação, República, Santana, Perdizes (A-/B+)
   • 03xxx–04xxx → Sul central: Moema, Vila Mariana, Indianópolis, Jabaquara, Saúde (A-/B+/B)
   • 05xxx → Oeste: Pinheiros, Vila Madalena, Lapa, Alto de Pinheiros (A/A-)
   • 08xxx → Zona Leste (heterogênea): Tatuapé/Mooca (B+), Penha (C+/B-), Itaquera (C+), Guaianazes (C/D)
   • 09xxx → ABC Paulista e Zona Sul extrema (ver Regra 6)

   Se coordenadas GPS estiverem disponíveis, use-as para calcular proximidade com bairros de referência.
   Se o logradouro for uma avenida ou rua conhecida, use para localização precisa.
   Se mesmo com contexto completo a classificação for incerta → declare confiança "insuficiente". NÃO invente classificação.

6. Cidades satélites periféricas da Grande SP (Ferraz de Vasconcelos, Itaquaquecetuba, Suzano, Poá, Mauá, Ribeirão Pires, Franco da Rocha, Francisco Morato, etc.) → padrão C ou C/D salvo bairro comprovadamente diferente.

7. Periferias extremas de São Paulo capital (Cidade Tiradentes, Lajeado, Iguatemi, Brasilândia, Parelheiros, Jardim Ângela, Capão Redondo profundo, Jardim Helena, Cangaíba) → C/D ou D.

8. Zona Leste de SP (em geral): C+ a B-. Mooca/Belenzinho: B+. Tatuapé: B+/A-. Penha simples: C+. São Miguel Paulista: C.

9. Litoral popular (Mongaguá, Itanhaém, Peruíbe, Caraguatatuba popular) → C+ máximo. Guarujá e Ubatuba têm áreas de B+/A- mas default C+.

REFERÊNCIA DE CLASSES PARA CALIBRAÇÃO:
- A+: Jardins (SP), Itaim Bibi, Alto de Pinheiros, Morumbi (partes altas), Barra da Tijuca (RJ), Leblon (RJ)
- A:  Pinheiros, Vila Nova Conceição, Brooklin, Moema, Perdizes
- A-: Lapa, Aclimação, Vila Mariana, Alphaville, Tatuapé (partes), Bela Vista, Consolação, Indianópolis
- B+: Santo André centro, São Bernardo centro, Campinas (partes), Ribeirão Preto (partes), Osasco centro
- B:  Classe média consolidada, subúrbio com infraestrutura razoável
- B-: Classe média-baixa, periferia próxima com alguma infraestrutura
- C+: Classe trabalhadora organizada, periferia com infraestrutura básica
- C:  Periferia consolidada, classe popular
- C/D: Periferia distante, baixa renda, infraestrutura precária
- D:  Alta vulnerabilidade social, risco social elevado

Na justificativa, cite EXPLICITAMENTE quais dados foram usados (logradouro, CEP prefixo, coordenadas GPS, bairros adjacentes).
Use sempre a tool fornecida para retornar valores estruturados.`;

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

    // 1. Cache-first
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
        classif: cached.classificacao, ms: Date.now() - startTime,
      }));
      return json({ ok: true, cached: true, classificacao: cached });
    }

    if (!anthropicKey) {
      return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
    }

    // 2. Geocode via BrasilAPI (opcional — controlado por GEOCODE_DISABLED env var)
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
      `Use TODOS os dados acima — logradouro, CEP, coordenadas — para classificação precisa da localização real.`,
      `NUNCA use a cidade como referência genérica. Determine a zona urbana pelo CEP e logradouro.`,
      `Cite na justificativa quais dados foram determinantes para a classificação.`,
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

    // 5. Guard de periferia
    let classificacaoFinal = r.classificacao;
    let potencialFinal     = r.potencial;
    let ticketMinFinal     = r.ticket_min_estimado ?? null;
    let ticketMaxFinal     = r.ticket_max_estimado ?? null;
    let guardAtivado       = false;

    if (isAcimaDeC(r.classificacao)) {
      const isSatelite    = CIDADES_SATELITE_PERIFERICAS.has(normalize(cidade));
      const hasPerifToken = TOKENS_PERIFERIA_SP.some(t => normalize(bairro || "").includes(t));
      if (isSatelite || hasPerifToken) {
        guardAtivado       = true;
        classificacaoFinal = "C+";
        potencialFinal     = "médio-baixo";
        ticketMinFinal     = null;
        ticketMaxFinal     = null;
      }
    }

    // 6. Derivar tipo_resultado
    const tipoResultado = deriveTipoResultado(r.confianca, r.inferencia_conservadora ?? false);
    const revisao       = r.confianca === "baixa" || r.confianca === "insuficiente";
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
      classif_final:    classificacaoFinal,
      confianca:        r.confianca,
      tipo_resultado:   tipoResultado,
      inf_conservadora: r.inferencia_conservadora,
      guard_ativado:    guardAtivado,
      salvo_em_cache:   tipoResultado !== "necessita_validacao",
      ms:               Date.now() - startTime,
    }));

    // 8. Resultado base
    const resultado: Record<string, unknown> = {
      bairro_norm:             bairroNorm,
      cidade_norm:             cidadeNorm,
      uf:                      ufUpper,
      classificacao:           classificacaoFinal,
      potencial:               potencialFinal,
      ticket_min:              ticketMinFinal,
      ticket_max:              ticketMaxFinal,
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

    // Dados de debug (apenas quando solicitado)
    if (debugMode) {
      resultado._debug = {
        prompt_enviado:       userPrompt,
        classif_ia_original:  r.classificacao,
        guard_ativado:        guardAtivado,
        geocode:              coordenadas,
        tipo_resultado:       tipoResultado,
        ms:                   Date.now() - startTime,
      };
    }

    // 9. Não persistir insuficientes — reavaliados a cada consulta
    if (tipoResultado === "necessita_validacao") {
      return json({ ok: true, cached: false, classificacao: resultado });
    }

    // 10. Upsert para alta/media/baixa
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

    return json({ ok: true, cached: false, classificacao: saved ?? resultado });

  } catch (err) {
    console.error(JSON.stringify({ evt: "erro_geral", msg: String(err), ms: Date.now() - startTime }));
    return json({ error: String(err) }, 500);
  }
});
