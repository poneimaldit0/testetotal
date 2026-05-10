/**
 * classificar-cep-ia
 *
 * Classifica socioeconômicamente um bairro/cidade usando Claude Sonnet 4.6.
 * Fluxo: cache-first → IA → upsert cache.
 * Entradas com validado_manualmente = true são protegidas pelo cache-first.
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
        description: "Justificativa em 2-3 frases para a classificação atribuída.",
      },
      confianca: {
        type: "string",
        enum: ["alta", "media", "baixa", "insuficiente"],
        description: "alta = dados sólidos do bairro específico; insuficiente = bairro desconhecido, inferência por cidade/UF.",
      },
      fontes: {
        type: "array",
        items: { type: "string" },
        description: "Evidências ou referências consideradas para a classificação.",
      },
      inferencia_conservadora: {
        type: "boolean",
        description: "true quando a classificação é conservadoramente inferida por ausência de dados específicos do bairro.",
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

5. Sem evidência forte do bairro específico → fallback CONSERVADOR: classifique um patamar abaixo da cidade, confiança "baixa" ou "insuficiente", inferencia_conservadora = true.

6. Cidades satélites periféricas da Grande SP (Ferraz de Vasconcelos, Itaquaquecetuba, Suzano, Poá, Mauá, Ribeirão Pires, Franco da Rocha, Francisco Morato, etc.) → padrão C ou C/D salvo bairro comprovadamente diferente.

7. Periferias extremas de São Paulo capital (Cidade Tiradentes, Lajeado, Iguatemi, Brasilândia, Parelheiros, Jardim Ângela, Capão Redondo profundo, Jardim Helena, Cangaíba) → C/D ou D.

8. Zona Leste de SP (em geral): C+ a B-. Mooca/Belenzinho: B+. Tatuapé: B+/A-. Penha simples: C+. São Miguel Paulista: C.

9. Litoral popular (Mongaguá, Itanhaém, Peruíbe, Caraguatatuba popular) → C+ máximo. Guarujá e Ubatuba têm áreas de B+/A- mas default C+.

REFERÊNCIA DE CLASSES PARA CALIBRAÇÃO:
- A+: Jardins (SP), Itaim Bibi, Alto de Pinheiros, Morumbi (partes altas), Barra da Tijuca (RJ), Leblon (RJ)
- A:  Pinheiros, Vila Nova Conceição, Brooklin, Moema, Perdizes
- A-: Lapa, Aclimação, Vila Mariana, Alphaville, Tatuapé (partes), Bela Vista, Consolação
- B+: Santo André centro, São Bernardo centro, Campinas (partes), Ribeirão Preto (partes), Osasco centro
- B:  Classe média consolidada, subúrbio com infraestrutura razoável
- B-: Classe média-baixa, periferia próxima com alguma infraestrutura
- C+: Classe trabalhadora organizada, periferia com infraestrutura básica
- C:  Periferia consolidada, classe popular
- C/D: Periferia distante, baixa renda, infraestrutura precária
- D:  Alta vulnerabilidade social, risco social elevado

Use sempre a tool fornecida para retornar valores estruturados.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { bairro, cidade, uf } = await req.json() as {
      bairro?: string;
      cidade: string;
      uf: string;
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

    // 1. Cache-first — inclui entradas validadas_manualmente (proteção implícita)
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

    // 2. Chamar Claude Sonnet 4.6
    const userPrompt =
      `Classifique socioeconômicamente a seguinte localidade para qualificação de leads de reforma residencial:\n\n` +
      `Bairro: ${bairro || "(não informado — classifique pela cidade)"}\n` +
      `Cidade: ${cidade}\n` +
      `UF: ${uf}\n\n` +
      `IMPORTANTE: seja conservador. Se o bairro não tiver evidências claras de alto padrão, classifique abaixo, não acima. ` +
      `Prefira errar para baixo a classificar indevidamente como A ou B+ uma região periférica.`;

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

    console.log("[classificar-cep] resultado:", bairro, "/", cidade, "→", r.classificacao, r.confianca);

    // Aplicar guard de periferia antes de persistir no cache
    let classificacaoFinal = r.classificacao;
    let potencialFinal = r.potencial;
    let ticketMinFinal = r.ticket_min_estimado ?? null;
    let ticketMaxFinal = r.ticket_max_estimado ?? null;

    if (isAcimaDeC(r.classificacao)) {
      const isSatelite    = CIDADES_SATELITE_PERIFERICAS.has(normalize(cidade));
      const hasPerifToken = TOKENS_PERIFERIA_SP.some(t => normalize(bairro || "").includes(t));

      if (isSatelite || hasPerifToken) {
        console.warn(
          "[classificar-cep] periferiaGuard:", bairro, "/", cidade,
          "→", r.classificacao, "rebaixada para C+",
        );
        classificacaoFinal = "C+";
        potencialFinal     = "médio-baixo";
        ticketMinFinal     = null;
        ticketMaxFinal     = null;
      }
    }

    const now = new Date().toISOString();
    const revisao = r.confianca === "baixa" || r.confianca === "insuficiente";

    // 3. Upsert no cache (só chega aqui em cache miss)
    const { data: saved, error: saveErr } = await db
      .from("cep_classificacoes_ia")
      .upsert(
        {
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
          updated_at:              now,
        },
        { onConflict: "bairro_norm,cidade_norm,uf" },
      )
      .select()
      .maybeSingle();

    if (saveErr) {
      console.error("[classificar-cep] erro ao salvar cache:", saveErr.message);
    }

    return json({
      ok: true,
      cached: false,
      classificacao: saved ?? {
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
      },
    });
  } catch (err) {
    console.error("[classificar-cep] erro geral:", err);
    return json({ error: String(err) }, 500);
  }
});
