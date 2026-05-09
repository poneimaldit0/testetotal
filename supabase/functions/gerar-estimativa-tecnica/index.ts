/**
 * gerar-estimativa-tecnica v2
 *
 * Gera estimativa de custo de reforma com base em 9 fontes de referência:
 * SINAPI-SP, SINDUSCON-SP/CUB-SP, CREA-SP, SECONCI-SP, AECWeb,
 * Andora, Chronoshare, Catálogos de Fornecedores, Histórico Interno Reforma100
 *
 * Salva em dois níveis:
 *   A) estimativas_tecnicas   — histórico técnico completo
 *   B) orcamentos_crm_tracking — uso operacional (carteira, metas, comissão, dashboard)
 *
 * valor_lead_estimado é mantido igual a valor_estimado_ia_medio após cada geração.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tool schema v2 ──────────────────────────────────────────────────────────

const TOOL_ESTIMATIVA_V2 = {
  name: "estimativa_tecnica_v2",
  description: "Estimativa de custo de reforma — padrão Reforma100. Cruza SINAPI-SP, CUB-SP, CREA-SP, SECONCI-SP, AECWeb, Andora, Chronoshare, catálogos e histórico interno.",
  input_schema: {
    type: "object",
    required: [
      "faixa_min",
      "faixa_media",
      "faixa_alta",
      "custo_m2_estimado",
      "nivel_reforma_detectado",
      "tipo_imovel_detectado",
      "confianca",
      "fontes",
      "justificativa",
      "premissas",
      "perc_mao_obra",
      "perc_materiais",
      "perc_gestao",
      "observacoes",
    ],
    properties: {
      faixa_min:                { type: "number",              description: "Custo mínimo total em R$ (execução econômica, materiais entry-level)" },
      faixa_media:              { type: "number",              description: "Custo médio de mercado em R$ (padrão Reforma100, materiais médio-alto)" },
      faixa_alta:               { type: "number",              description: "Custo alto em R$ (materiais premium, imprevistos, acabamentos diferenciados)" },
      custo_m2_estimado:        { type: ["number", "null"],    description: "Custo por m² de referência (faixa_media/area). null se área não informada" },
      nivel_reforma_detectado:  { type: "string", enum: ["basico", "intermediario", "alto_padrao", "luxo"], description: "Tipologia inferida do escopo declarado" },
      tipo_imovel_detectado:    { type: "string", enum: ["apartamento", "casa", "cobertura", "comercial", "sala_comercial", "galpao", "outro"], description: "Tipo de imóvel inferido" },
      confianca:                { type: "string", enum: ["baixa", "media", "alta"], description: "Nível de confiança baseado na completude dos dados de entrada" },
      fontes: {
        type: "array",
        items: { type: "string" },
        description: "Lista das fontes efetivamente usadas nesta estimativa",
      },
      justificativa:  { type: "string", description: "Fundamentação técnica da faixa: como chegou nos valores, quais referências pesaram mais" },
      premissas: {
        type: "array",
        items: { type: "string" },
        description: "Premissas assumidas e limitações desta estimativa",
      },
      perc_mao_obra:  { type: "number", description: "% estimado de mão de obra sobre o total (0–100)" },
      perc_materiais: { type: "number", description: "% estimado de materiais sobre o total (0–100)" },
      perc_gestao:    { type: "number", description: "% estimado de gestão/BDI/imprevistos (0–100)" },
      observacoes:    { type: "string", description: "Alertas técnicos, riscos de escopo e limitações da estimativa" },
    },
  },
  cache_control: { type: "ephemeral" },
};

// ─── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orcamento_id } = await req.json();
    if (!orcamento_id) {
      return json400("orcamento_id é obrigatório");
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey    = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase        = createClient(supabaseUrl, supabaseService);

    // ── 1. Buscar orçamento ──────────────────────────────────────────────────
    const { data: orc, error: orcErr } = await supabase
      .from("orcamentos")
      .select("id, necessidade, categorias, tamanho_imovel, local, budget_informado, prazo_inicio_texto, nivel_reforma, tipo_imovel, qtd_ambientes")
      .eq("id", orcamento_id)
      .single();

    if (orcErr || !orc) {
      console.error("[estimativa-v2] Orçamento não encontrado:", orcErr);
      return json404("Orçamento não encontrado");
    }

    // ── 2. Criar registro pendente ───────────────────────────────────────────
    const { data: est, error: insertErr } = await supabase
      .from("estimativas_tecnicas")
      .insert({ orcamento_id, status: "pending" })
      .select("id")
      .single();

    if (insertErr || !est) {
      console.error("[estimativa-v2] Erro ao criar estimativa:", insertErr);
      return json500("Erro ao criar estimativa");
    }

    if (!anthropicKey) {
      await supabase.from("estimativas_tecnicas").update({ status: "failed", updated_at: now() }).eq("id", est.id);
      return jsonOk({ status: "failed", estimativa_id: est.id, reason: "ANTHROPIC_API_KEY não configurada" });
    }

    // ── 3. Buscar histórico interno Reforma100 ───────────────────────────────
    const historico = await buscarHistoricoInterno(supabase, orc);

    // ── 3b. Buscar fontes de preço ativas no banco ────────────────────────────
    const fontesAtivas = await buscarFontesAtivas(supabase);

    // ── 4. Montar snapshot de inputs ─────────────────────────────────────────
    const inputsSnapshot = {
      necessidade:      orc.necessidade,
      categorias:       orc.categorias,
      tamanho_imovel:   orc.tamanho_imovel,
      local:            orc.local,
      budget_informado: orc.budget_informado,
      prazo_inicio_texto: orc.prazo_inicio_texto,
      nivel_reforma:    orc.nivel_reforma,
      tipo_imovel:      orc.tipo_imovel,
      qtd_ambientes:    orc.qtd_ambientes,
      historico_count:  historico.length,
    };

    // ── 5. Montar prompt ─────────────────────────────────────────────────────
    const prompt = buildPrompt(orc, historico, fontesAtivas);

    // ── 6. Chamar Claude API ──────────────────────────────────────────────────
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":          anthropicKey,
        "anthropic-version":  "2023-06-01",
        "anthropic-beta":     "prompt-caching-2024-07-31",
        "Content-Type":       "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        system: [{ type: "text", text:
          "Você é um estimador técnico sênior da plataforma Reforma100. " +
          "Sempre use a tool fornecida para retornar valores estruturados. " +
          "Nunca invente valores — se dados forem insuficientes, retorne confiança 'baixa' com premissas explícitas. " +
          "Todos os valores são em R$ (Reais). Contexto: São Paulo, SP, Brasil, 2025.",
          cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
        tools:      [TOOL_ESTIMATIVA_V2],
        tool_choice: { type: "tool", name: "estimativa_tecnica_v2" },
      }),
    });

    if (!aiResp.ok) {
      const body = await aiResp.text();
      console.error("[estimativa-v2] Anthropic error:", aiResp.status, body);
      await supabase.from("estimativas_tecnicas").update({ status: "failed", updated_at: now() }).eq("id", est.id);
      return jsonOk({ status: "failed", estimativa_id: est.id });
    }

    const aiData  = await aiResp.json();
    // deno-lint-ignore no-explicit-any
    const toolUse = aiData.content?.find((b: any) => b.type === "tool_use");

    if (!toolUse?.input) {
      console.error("[estimativa-v2] Resposta sem tool_use:", JSON.stringify(aiData));
      await supabase.from("estimativas_tecnicas").update({ status: "failed", updated_at: now() }).eq("id", est.id);
      return jsonOk({ status: "failed", estimativa_id: est.id });
    }

    const r = toolUse.input;
    console.log("[estimativa-v2] Resultado:", JSON.stringify({ faixa_min: r.faixa_min, faixa_media: r.faixa_media, faixa_alta: r.faixa_alta, confianca: r.confianca }));

    // ── 7. Salvar em estimativas_tecnicas (histórico completo) ────────────────
    await supabase
      .from("estimativas_tecnicas")
      .update({
        status:                  "completed",
        faixa_min:               r.faixa_min,
        faixa_media:             r.faixa_media,
        faixa_alta:              r.faixa_alta,
        custo_m2_estimado:       r.custo_m2_estimado ?? null,
        tipologia:               r.nivel_reforma_detectado,
        perc_mao_obra:           r.perc_mao_obra,
        perc_materiais:          r.perc_materiais,
        perc_gestao:             r.perc_gestao,
        observacoes:             r.observacoes,
        // v2 fields
        confianca:               r.confianca,
        fontes:                  r.fontes,
        justificativa:           r.justificativa,
        nivel_reforma_detectado: r.nivel_reforma_detectado,
        tipo_imovel_detectado:   r.tipo_imovel_detectado,
        inputs_snapshot:         inputsSnapshot,
        historico_interno_count: historico.length,
        updated_at:              now(),
      })
      .eq("id", est.id);

    // ── 8. Write-back em orcamentos_crm_tracking (uso operacional) ────────────
    // Upsert garante criação do tracking record se ainda não existir
    const { error: trackErr } = await supabase
      .from("orcamentos_crm_tracking")
      .upsert(
        {
          orcamento_id:                   orcamento_id,
          // valor_lead_estimado = faixa_media (fonte única de verdade para dashboards)
          valor_lead_estimado:             r.faixa_media,
          valor_estimado_ia_min:           r.faixa_min,
          valor_estimado_ia_medio:         r.faixa_media,
          valor_estimado_ia_max:           r.faixa_alta,
          valor_estimado_ia_confianca:     r.confianca,
          valor_estimado_ia_justificativa: r.justificativa,
          updated_at:                      now(),
        },
        { onConflict: "orcamento_id", ignoreDuplicates: false }
      );

    if (trackErr) {
      console.error("[estimativa-v2] Erro no write-back tracking:", trackErr);
      // Não falha a requisição — histórico já foi salvo
    }

    return jsonOk({
      status:         "completed",
      estimativa_id:  est.id,
      faixa_min:      r.faixa_min,
      faixa_media:    r.faixa_media,
      faixa_alta:     r.faixa_alta,
      confianca:      r.confianca,
      nivel_reforma:  r.nivel_reforma_detectado,
      tipo_imovel:    r.tipo_imovel_detectado,
      fontes:         r.fontes,
      justificativa:  r.justificativa,
      premissas:      r.premissas,
    });

  } catch (err) {
    console.error("[estimativa-v2] Exception:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Fontes de preço ativas ───────────────────────────────────────────────────

interface FonteItem {
  valor_referencia: number;
  valor_minimo: number | null;
  valor_maximo: number | null;
  fonte: string;
  descricao: string;
  unidade: string;
}

interface FontesAtivas {
  versaoId: string;
  mesReferencia: string;
  ativadaEm: string;
  itens: Record<string, FonteItem>;
}

// deno-lint-ignore no-explicit-any
async function buscarFontesAtivas(supabase: any): Promise<FontesAtivas | null> {
  try {
    const { data: versao } = await supabase
      .from("fontes_preco_versoes")
      .select("id, mes_referencia, ativada_at")
      .eq("status", "ativa")
      .maybeSingle();

    if (!versao) return null;

    const { data: itens } = await supabase
      .from("fontes_preco_itens")
      .select("codigo, valor_referencia, valor_minimo, valor_maximo, fonte, descricao, unidade")
      .eq("versao_id", versao.id);

    if (!itens || itens.length === 0) return null;

    const mapaItens: Record<string, FonteItem> = {};
    for (const item of itens) {
      mapaItens[item.codigo] = {
        valor_referencia: Number(item.valor_referencia),
        valor_minimo:     item.valor_minimo  != null ? Number(item.valor_minimo)  : null,
        valor_maximo:     item.valor_maximo  != null ? Number(item.valor_maximo)  : null,
        fonte:            item.fonte,
        descricao:        item.descricao,
        unidade:          item.unidade ?? "",
      };
    }

    return { versaoId: versao.id, mesReferencia: versao.mes_referencia, ativadaEm: versao.ativada_at, itens: mapaItens };
  } catch (e) {
    console.error("[estimativa-v2] buscarFontesAtivas error:", e);
    return null;
  }
}

// ─── Histórico interno ───────────────────────────────────────────────────────

interface HistoricoItem {
  categorias: string[];
  tamanho_imovel: number | null;
  local: string;
  valor_lead_estimado: number;
  etapa_crm: string;
}

// deno-lint-ignore no-explicit-any
async function buscarHistoricoInterno(supabase: any, orc: any): Promise<HistoricoItem[]> {
  try {
    const categorias = Array.isArray(orc.categorias) ? orc.categorias : [];
    // Extrair cidade (primeira parte antes de vírgula ou hífen)
    const cidade = (orc.local || "São Paulo").split(/[,\-]/)[0].trim();

    // Busca leads similares com valor estimado definido
    const { data } = await supabase
      .from("view_orcamentos_crm_com_checklist")
      .select("categorias, tamanho_imovel, local, valor_lead_estimado, etapa_crm")
      .neq("id", orc.id)
      .not("valor_lead_estimado", "is", null)
      .gt("valor_lead_estimado", 0)
      .not("etapa_crm", "eq", "perdido")
      .ilike("local", `%${cidade}%`)
      .order("ultima_atualizacao", { ascending: false })
      .limit(30);

    if (!data || data.length === 0) return [];

    // Priorizar leads com categorias sobrepostas
    const comCategoria = (data as HistoricoItem[]).filter((d) => {
      if (!Array.isArray(d.categorias) || categorias.length === 0) return true;
      return d.categorias.some((c: string) => categorias.includes(c));
    });

    return (comCategoria.length >= 3 ? comCategoria : data as HistoricoItem[]).slice(0, 15);
  } catch (e) {
    console.error("[estimativa-v2] buscarHistoricoInterno error:", e);
    return [];
  }
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildFontesAtivasSection(fontes: FontesAtivas | null): string {
  if (!fontes) {
    return "⚠️  Sem versão aprovada de fontes no banco. Use os valores de referência das seções abaixo como baseline.";
  }
  const grupos: Record<string, string[]> = {};
  for (const [codigo, item] of Object.entries(fontes.itens)) {
    const f = item.fonte;
    if (!grupos[f]) grupos[f] = [];
    const min = item.valor_minimo  != null ? item.valor_minimo.toLocaleString("pt-BR")  : "?";
    const max = item.valor_maximo  != null ? item.valor_maximo.toLocaleString("pt-BR")  : "?";
    const ref = item.valor_referencia.toLocaleString("pt-BR");
    grupos[f].push(`  ${codigo} | ${item.descricao} | ref:${ref} min:${min} max:${max} ${item.unidade}`);
  }
  const linhas = [`✅ Versão ativa: ${fontes.mesReferencia} — aprovada em ${fontes.ativadaEm?.substring(0, 10) ?? "n/d"}\n`];
  for (const [fonte, items] of Object.entries(grupos)) {
    linhas.push(`${fonte.toUpperCase()}:\n${items.join("\n")}`);
  }
  return linhas.join("\n\n");
}

// deno-lint-ignore no-explicit-any
function buildPrompt(orc: any, historico: HistoricoItem[], fontesAtivas: FontesAtivas | null): string {
  const area    = orc.tamanho_imovel ? `${orc.tamanho_imovel} m²` : "Não informada";
  const cats    = Array.isArray(orc.categorias) && orc.categorias.length > 0
    ? orc.categorias.join(", ")
    : "Não informadas";
  const prazo   = orc.prazo_inicio_texto || "Não informado";
  const nivelInformado = orc.nivel_reforma || "Não informado (inferir)";
  const tipoInformado  = orc.tipo_imovel   || "Não informado (inferir)";
  const ambientes      = orc.qtd_ambientes  ? `${orc.qtd_ambientes} ambientes` : "Não informado";
  const budgetLabel    = orc.budget_informado
    ? `R$ ${Number(orc.budget_informado).toLocaleString("pt-BR")} ⚠️ APENAS PARA COMPARAÇÃO FINAL — NUNCA USE COMO BASE DE CÁLCULO`
    : "Não informado";

  const historicoText = historico.length === 0
    ? "Nenhum lead similar encontrado no banco Reforma100 para esta combinação de categorias/região."
    : [
        `${historico.length} leads similares encontrados no Reforma100 (mesma região/categorias):`,
        ...historico.map((h, i) =>
          `  ${i + 1}. Categorias: ${(h.categorias || []).join(", ") || "não informado"} | ` +
          `Área: ${h.tamanho_imovel ? h.tamanho_imovel + "m²" : "não inf."} | ` +
          `Local: ${h.local} | ` +
          `Valor estimado: R$ ${h.valor_lead_estimado.toLocaleString("pt-BR")} | ` +
          `Etapa: ${h.etapa_crm}`
        ),
      ].join("\n");

  const fontesSection = buildFontesAtivasSection(fontesAtivas);

  return `Você é um estimador técnico sênior da plataforma Reforma100.
Gere uma estimativa de custo realista e fundamentada para o projeto abaixo.
Cruze TODAS as fontes de referência listadas. Não use médias genéricas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALORES CANÔNICOS APROVADOS — BASE DE PREÇOS REFORMA100
(Priorize estes valores sobre os das seções de referência abaixo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${fontesSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DO PROJETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Necessidade / Escopo declarado:  ${orc.necessidade || "Não informado"}
Localização:                     ${orc.local || "São Paulo, SP"}
Área:                            ${area}
Categorias de serviço:           ${cats}
Ambientes:                       ${ambientes}
Prazo desejado:                  ${prazo}
Nível de reforma informado:      ${nivelInformado}
Tipo de imóvel informado:        ${tipoInformado}
Budget declarado pelo cliente:   ${budgetLabel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HISTÓRICO INTERNO REFORMA100 (use como âncora principal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${historicoText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SINAPI-SP (Jan/2025 — mão de obra + encargos INSS/FGTS/férias/13º)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMOLIÇÃO E PREPARAÇÃO:
  Demolição de alvenaria:              R$ 42–70/m²
  Remoção de revestimento cerâmico:    R$ 25–45/m²
  Chapisco + emboço:                   R$ 35–55/m²

ALVENARIA:
  Alvenaria de tijolo furado 9cm:      R$ 95–155/m²
  Alvenaria de tijolo maciço:          R$ 140–210/m²

REVESTIMENTOS (aplicação, sem material):
  Cerâmica parede:                     R$ 68–125/m²
  Porcelanato piso 60×60:              R$ 75–130/m²
  Reboco interno:                      R$ 40–65/m²
  Gesso projete:                       R$ 32–55/m²

PINTURA (mão de obra):
  Látex PVA 2 demãos:                  R$ 16–28/m²
  Acrílica 2 demãos:                   R$ 20–38/m²
  Massa corrida + pintura (pacote):    R$ 30–55/m²

INSTALAÇÕES ELÉTRICAS:
  Ponto tomada/interruptor:            R$ 280–520/ponto
  Ponto de iluminação:                 R$ 220–420/ponto
  Quadro de distribuição (troca):      R$ 1.800–4.500
  Fiação geral apartamento 60m²:       R$ 5.500–12.000

INSTALAÇÕES HIDRÁULICAS:
  Ponto de água fria:                  R$ 420–750/ponto
  Ponto de água quente:                R$ 580–950/ponto
  Ponto de esgoto:                     R$ 350–650/ponto
  Substituição de tubulação:           R$ 180–350/m linear

DRYWALL E FORROS:
  Parede drywall simples:              R$ 95–175/m²
  Forro de gesso acartonado:           R$ 70–130/m²
  Forro de gesso liso:                 R$ 50–95/m²

PISOS (aplicação, sem material):
  Piso laminado:                       R$ 28–52/m²
  Porcelanato:                         R$ 65–115/m²
  Regularização contrapiso:            R$ 38–65/m²

MARCENARIA E ESQUADRIAS:
  Porta interna pré-moldada:           R$ 450–850/un
  Janela alumínio linha 25:            R$ 280–600/m²
  Bancada granito (instalação):        R$ 350–700/m²

IMPERMEABILIZAÇÃO:
  Manta asfáltica (sacada/banheiro):   R$ 120–220/m²
  Cristalizante interno:               R$ 75–140/m²

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. SINDUSCON-SP / CUB-SP (Abril/2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUB R-1-B (residencial padrão baixo):       R$ 1.958/m²
CUB R-1-N (residencial padrão normal):      R$ 2.591/m²
CUB R-1-A (residencial padrão alto):        R$ 3.924/m²
CUB PP-4-N (prédio popular normal):         R$ 2.543/m²
CUB CSL-8-N (salas e lojas normal):         R$ 2.178/m²

Fator de reforma vs. construção nova:
  Reforma básica:     20–35% do CUB correspondente
  Reforma média:      40–60% do CUB correspondente
  Reforma completa:   60–80% do CUB correspondente
  Alto padrão:        80–120% do CUB alto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. CREA-SP (Responsabilidade Técnica e Custos Legais)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ART obra — reforma simples:                  R$ 250–550 (taxa CONFEA)
ART obra — reforma complexa/estrutural:      R$ 550–1.800
RRT arquitetura (reforma residencial):       0,5–1,5% do valor total
Laudo técnico estrutural:                    R$ 2.500–8.000
Regularização PMSP (alvará reforma):         R$ 2.000–15.000 (porte-dependente)
Nota: obras acima de R$ 50k em SP geralmente exigem ART ou RRT.
Considerar no BDI/gestão quando aplicável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SECONCI-SP (Encargos Trabalhistas e Parâmetros de Execução)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Encargos sociais sobre salário base:          82–95% (INSS 20%, FGTS 8%, férias, 13º, etc.)
Seguro Acidente de Trabalho (SAT):            3% da folha
FAEPE (apoio ao empregado):                   R$ 45–85/trabalhador/mês
EPI e segurança:                              2–4% do custo total de mão de obra
PCMAT (>20 trabalhadores):                    R$ 3.000–8.000

Salários referenciais SP (hora trabalhada, sem encargos):
  Oficial de construção:                      R$ 28–42/h
  Ajudante:                                   R$ 18–26/h
  Pintor:                                     R$ 26–40/h
  Eletricista:                                R$ 35–55/h
  Encanador:                                  R$ 35–55/h
  Azulejista:                                 R$ 30–48/h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. AECWeb (Benchmarks Técnicos SP — 2024/2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Por ambiente completo (mão de obra + materiais médios):
  Banheiro padrão completo:                   R$ 22.000–48.000
  Banheiro médio completo:                    R$ 48.000–90.000
  Banheiro alto padrão:                       R$ 90.000–250.000+
  Lavabo:                                     R$ 12.000–35.000
  Cozinha padrão completa:                    R$ 30.000–65.000
  Cozinha médio padrão:                       R$ 65.000–130.000
  Cozinha alto padrão:                        R$ 130.000–350.000+
  Quarto (com marcenaria básica):             R$ 15.000–40.000
  Sala de estar/jantar (renovação):           R$ 20.000–60.000
  Área de serviço:                            R$ 8.000–22.000

Materiais de acabamento:
  Cerâmica 40×40 (piso):                      R$ 45–90/m²
  Porcelanato 60×60:                          R$ 80–220/m²
  Porcelanato 120×60 (médio):                 R$ 160–380/m²
  Tinta látex (18L):                          R$ 180–320
  Tinta acrílica premium (18L):               R$ 320–580

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. Andora (Benchmark preços praticados — SP 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pintura completa apartamento 70m²:            R$ 6.500–14.000
Troca de piso + contrapiso 60m²:              R$ 12.000–28.000
Reforma de banheiro completa:                 R$ 18.000–55.000
Instalação elétrica apartamento 60m²:         R$ 8.000–20.000
Substituição de tubulação hidráulica:         R$ 6.000–18.000
Drywall + forro gesso sala:                   R$ 5.000–15.000
Marcenaria cozinha planejada (instalação):    R$ 4.000–12.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. Chronoshare (Benchmark mercado real — SP 2024/2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket médio por porte de obra:
  Pequeno (1–2 cômodos, até 30m²):            R$ 15.000–55.000
  Médio (3–4 cômodos, 50–80m²):               R$ 55.000–160.000
  Grande (5+ cômodos, 80–150m²):              R$ 160.000–450.000
Comercial leve:                               R$ 600–1.100/m²
Comercial completo:                           R$ 1.100–2.200/m²

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. Catálogos de Fornecedores Nacionais (2024/2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
METAIS E LOUÇAS SANITÁRIAS:
  Kit louças + metais padrão (por banheiro):  R$ 1.400–5.000
  Kit médio padrão (Deca, Docol):             R$ 5.000–16.000
  Kit alto padrão (Duravit, Hansgrohe):       R$ 16.000–80.000+

REVESTIMENTOS:
  Porcelanato técnico:                        R$ 120–380/m²
  Mármore (Carrara, Calacatta):               R$ 450–2.500/m²
  Piso laminado (material):                   R$ 60–250/m²
  Vinyl SPC:                                  R$ 80–180/m²

ESQUADRIAS:
  Porta interna MDF montada:                  R$ 650–2.000/un
  Porta madeira maciça:                       R$ 2.500–12.000/un
  Janela alumínio linha 25:                   R$ 350–900/m²
  Janela alumínio linha 40:                   R$ 650–1.800/m²

BDI (Bonificação e Despesas Indiretas):
  Obras até R$ 150k:                          20–35%
  Obras R$ 150k–500k:                         16–25%
  Obras acima R$ 500k:                        12–20%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
METODOLOGIA OBRIGATÓRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 1 — INFERÊNCIA:
  Detecte tipo_imovel_detectado e nivel_reforma_detectado com base no escopo.

PASSO 2 — CRUZAMENTO:
  a) Calcule custo de mão de obra por categoria usando SINAPI-SP.
  b) Calcule custo de materiais usando catálogos + AECWeb.
  c) Some e aplique BDI usando faixa SECONCI-SP/mercado.
  d) Cross-check com CUB-SP (% do CUB para o padrão detectado).
  e) Cross-check com Andora + Chronoshare.
  f) Se houver histórico interno Reforma100, use como âncora: a faixa_media não deve
     se desviar mais de 40% da média do histórico sem justificativa explícita.

PASSO 3 — FAIXAS:
  faixa_min:   execução econômica, materiais entry-level, produtividade alta, BDI 20%.
  faixa_media: execução padrão Reforma100, materiais médio-alto, BDI 25%, imprevistos 5%.
  faixa_alta:  materiais premium, acabamentos diferenciados, BDI 30%, imprevistos 10%.

PASSO 4 — CONFIANÇA:
  "alta":   área informada + categorias detalhadas + histórico disponível.
  "media":  área informada OU categorias claras, mas outros dados faltam; pouco histórico.
  "baixa":  escopo vago, área desconhecida, sem histórico.

PASSO 5 — FONTES:
  Liste em "fontes" apenas as que efetivamente embasaram os valores calculados.
  Possíveis: "SINAPI-SP", "CUB-SP/SINDUSCON-SP", "CREA-SP", "SECONCI-SP",
             "AECWeb", "Andora", "Chronoshare", "Catálogos Fornecedores", "Histórico Reforma100".

PASSO 6 — PREMISSAS:
  Liste explicitamente o que foi assumido para chegar nos valores.
  Exemplos: "Área estimada em 70m² por ausência de dado", "Escopo hidráulico considerado parcial por falta de detalhamento".

REGRAS ABSOLUTAS:
  - Não retornar faixas sem justificativa técnica.
  - Não usar médias genéricas sem cruzamento de fontes.
  - Se dados forem insuficientes, confiança = "baixa" com premissas explícitas.
  - perc_mao_obra + perc_materiais + perc_gestao deve somar ~100.
  - PROIBIDO usar budget_informado como base ou âncora de cálculo.
    O budget é informado pelo cliente leigo — pode estar errado, subestimado ou superestimado.
    Use-o APENAS para comparação final após calcular as faixas tecnicamente.
    A estimativa deve ser independente e técnica; compare com o budget no campo observacoes.

Use a tool estimativa_tecnica_v2 para retornar.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }

function jsonOk(body: unknown): Response {
  return new Response(
    JSON.stringify(body),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function json400(msg: string): Response {
  return new Response(
    JSON.stringify({ error: msg }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function json404(msg: string): Response {
  return new Response(
    JSON.stringify({ error: msg }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function json500(msg: string): Response {
  return new Response(
    JSON.stringify({ error: msg }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
