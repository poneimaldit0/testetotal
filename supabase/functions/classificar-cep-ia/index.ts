/**
 * classificar-cep-ia
 *
 * Classifica socioeconômicamente um bairro usando Claude Sonnet 4.6.
 * Fluxo: cache-first → geocode BrasilAPI → IA contextual → upsert cache.
 * Resultados com confiança "insuficiente" não são salvos em cache.
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
      "classificacao",
      "potencial",
      "ticket_min_estimado",
      "ticket_max_estimado",
      "justificativa",
      "confianca",
      "fontes",
      "inferencia_conservadora",
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
        description: "Ticket mínimo estimado em R$ para reformas nessa região. null se insuficiente.",
      },
      ticket_max_estimado: {
        type: ["integer", "null"],
        description: "Ticket máximo estimado em R$. null se insuficiente.",
      },
      justificativa: {
        type: "string",
        description: "Justificativa em 2-3 frases citando os dados usados (logradouro, CEP, coordenadas, bairros adjacentes).",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa", "insuficiente"],
        description: "alta = dados sólidos do bairro específico; insuficiente = bairro desconhecido mesmo com contexto geográfico.",
      },
      fontes: {
        type: "array",
        items: { type: "string" },
        description: "Dados efetivamente usados: logradouro, CEP, coordenadas GPS, bairros adjacentes conhecidos, etc.",
      },
      inferencia_conservadora: {
        type: "boolean",
        description: "true quando a classificação é inferida por contexto geográfico sem dados diretos do bairro.",
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
   Use o logradouro, CEP completo e coordenadas GPS fornecidos para determinar a zona urbana real:

   São Paulo capital — referência por prefixo CEP:
   • 01xxx–02xxx → Centro histórico e Norte próximo: Consolação, República, Santana, Perdizes (A-/B+)
   • 03xxx–04xxx → Sul central: Moema, Vila Mariana, Indianópolis, Jabaquara, Saúde, Ibirapuera (A-/B+/B)
   • 05xxx → Oeste: Pinheiros, Vila Madalena, Lapa, Alto de Pinheiros (A/A-)
   • 08xxx → Zona Leste (heterogênea): Tatuapé/Mooca (B+), Penha (C+/B-), Itaquera (C+), Guaianazes (C/D)
   • 09xxx → ABC Paulista e Zona Sul extrema (ver Regra 6 — não confundir com SP nobre)

   Se coordenadas GPS estiverem disponíveis, use-as para calcular proximidade com bairros de referência.
   Se o logradouro for uma avenida ou rua conhecida, use para localização precisa.
   Se mesmo com contexto completo a classificação for incerta → confiança "insuficiente". NUNCA retorne B genérico.

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

Na justificativa, cite EXPLICITAMENTE quais dados foram usados (logradouro, CEP, coordenadas, bairros adjacentes).
Use sempre a tool fornecida para retornar valores estruturados.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { bairro, cidade, uf, cep, logradouro } = await req.json() as {
      bairro?: string;
      cidade: string;
      uf: string;
      cep?: string;
      logradouro?: string;
    };

    if (!cidade || !uf) {
      return json({ error: "cidade e uf são obrigatórios" }, 400);
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey    = Deno.env.get("ANTHROPIC_API_KEY");
    const db              = createClient(supabaseUrl, supabaseService);

    const bairroNorm = normalize(bairro || "");
    const cidadeNorm = normalize(cidade);
    const ufUpper    = uf.toUpperCase();
    const cepClean   = (cep || "").replace(/\D/g, "");

    // 1. Cache-first — entradas com validado_manualmente=true são protegidas
    const { data: cached } = await db
      .from("cep_classificacoes_ia")
      .select("*")
      .eq("bairro_norm", bairroNorm)
      .eq("cidade_norm", cidadeNorm)
      .eq("uf", ufUpper)
      .maybeSingle();

    if (cached) {
      console.log("[classificar-cep] cache hit:", bairro, "/", cidade, ufUpper);
      return json({ ok: true, cached: true, classificacao: cached });
    }

    if (!anthropicKey) {
      return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);
    }

    // 2. Geocode via BrasilAPI (opcional — não bloqueia se falhar)
    let coordenadas: { latitude: string; longitude: string } | null = null;
    if (cepClean.length === 8) {
      try {
        const geoResp = await fetch(
          `https://brasilapi.com.br/api/cep/v2/${cepClean}`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          if (geoData?.location?.coordinates?.latitude) {
            coordenadas = geoData.location.coordinates;
            console.log("[classificar-cep] geocode:", coordenadas);
          }
        }
      } catch {
        console.log("[classificar-cep] geocode indisponível, continuando sem coordenadas");
      }
    }

    // 3. Construir prompt contextual completo
    const cepPrefix = cepClean.slice(0, 3);
    const linhasPrompt: string[] = [
      `Classifique socioeconômicamente para qualificação de leads de reforma residencial:`,
      ``,
      `Bairro: ${bairro || "(não informado)"}`,
      `Logradouro: ${logradouro || "(não informado)"}`,
      `CEP: ${cepClean ? `${cepClean.slice(0,5)}-${cepClean.slice(5)}` : "(não informado)"}${cepPrefix ? ` — prefixo ${cepPrefix}` : ""}`,
      `Cidade: ${cidade}`,
      `UF: ${uf}`,
    ];

    if (coordenadas) {
      linhasPrompt.push(`Coordenadas GPS: lat ${coordenadas.latitude}, lng ${coordenadas.longitude}`);
    }

    linhasPrompt.push(
      ``,
      `Use TODOS os dados acima — logradouro, CEP, coordenadas — para classificação precisa.`,
      `NUNCA use "São Paulo" como referência genérica. Identifique a zona urbana específica pelo CEP e logradouro.`,
      `Se a confiança for insuficiente após análise contextual, declare isso — NÃO invente B genérico.`,
    );

    const userPrompt = linhasPrompt.join("\n");

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
      console.error("[classificar-cep] Anthropic error:", aiResp.status, errBody);
      return json({ error: "Erro ao chamar IA", status: aiResp.status }, 502);
    }

    const aiData = await aiResp.json();
    // deno-lint-ignore no-explicit-any
    const toolUse = (aiData.content as any[])?.find((b) => b.type === "tool_use");

    if (!toolUse?.input) {
      console.error("[classificar-cep] resposta sem tool_use:", JSON.stringify(aiData).slice(0, 500));
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

    console.log("[classificar-cep] resultado:", bairro, "/", cidade, "→", r.classificacao, r.confianca, coordenadas ? "(geocode)" : "(sem coords)");

    // 5. Guard de periferia antes de persistir
    let classificacaoFinal = r.classificacao;
    let potencialFinal     = r.potencial;
    let ticketMinFinal     = r.ticket_min_estimado ?? null;
    let ticketMaxFinal     = r.ticket_max_estimado ?? null;

    if (isAcimaDeC(r.classificacao)) {
      const isSatelite    = CIDADES_SATELITE_PERIFERICAS.has(normalize(cidade));
      const hasPerifToken = TOKENS_PERIFERIA_SP.some(t => normalize(bairro || "").includes(t));

      if (isSatelite || hasPerifToken) {
        console.warn("[classificar-cep] periferiaGuard:", bairro, "/", cidade, "→", r.classificacao, "rebaixada para C+");
        classificacaoFinal = "C+";
        potencialFinal     = "médio-baixo";
        ticketMinFinal     = null;
        ticketMaxFinal     = null;
      }
    }

    const now    = new Date().toISOString();
    const revisao = r.confianca === "baixa" || r.confianca === "insuficiente";

    // 6. Resultado base (sem salvar ainda)
    const resultado = {
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
      tem_coordenadas:         coordenadas !== null,
    };

    // Não persistir resultados insuficientes — serão reavaliados na próxima consulta
    if (r.confianca === "insuficiente") {
      console.log("[classificar-cep] confiança insuficiente — não salvo em cache:", bairro, "/", cidade);
      return json({ ok: true, cached: false, classificacao: resultado });
    }

    // 7. Upsert no cache
    const { data: saved, error: saveErr } = await db
      .from("cep_classificacoes_ia")
      .upsert(
        { ...resultado, updated_at: now },
        { onConflict: "bairro_norm,cidade_norm,uf" },
      )
      .select()
      .maybeSingle();

    if (saveErr) {
      console.error("[classificar-cep] erro ao salvar cache:", saveErr.message);
    }

    return json({ ok: true, cached: false, classificacao: saved ?? resultado });

  } catch (err) {
    console.error("[classificar-cep] erro geral:", err);
    return json({ error: String(err) }, 500);
  }
});
