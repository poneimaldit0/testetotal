/**
 * coletar-fontes-preco
 *
 * Coleta mensalmente ~50 valores canônicos de referência de preços para reforma/construção em SP.
 * Cria uma versão `pendente_validacao` que só entra em uso após aprovação de admin/master.
 *
 * POST body: { mes_referencia?: 'YYYY-MM' }   (padrão: mês corrente)
 *
 * Regras:
 *  - IA pode pesquisar e preparar, NÃO pode ativar
 *  - Variação > 15% vs versão anterior é sinalizada como fora_da_curva
 *  - Se versão pendente já existe para o mês, retorna erro 409
 *  - Histórico nunca é sobrescrito
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Itens canônicos (~50 referências de mercado SP) ────────────────────────

interface CanonicalItem {
  codigo: string;
  fonte: string;
  categoria: string;
  descricao: string;
  unidade: string;
  valor_min_base: number;
  valor_max_base: number;
  valor_ref_base: number;
}

const CANONICAL_ITEMS: CanonicalItem[] = [
  // SINAPI-SP — mão de obra (hora sem encargos)
  { codigo: 'sinapi_labor_pedreiro',    fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Pedreiro (hora sem encargos)',            unidade: 'R$/h',   valor_min_base: 28,    valor_max_base: 42,    valor_ref_base: 35    },
  { codigo: 'sinapi_labor_ajudante',    fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Ajudante/Servente (hora sem encargos)',    unidade: 'R$/h',   valor_min_base: 18,    valor_max_base: 26,    valor_ref_base: 22    },
  { codigo: 'sinapi_labor_pintor',      fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Pintor (hora sem encargos)',              unidade: 'R$/h',   valor_min_base: 26,    valor_max_base: 40,    valor_ref_base: 33    },
  { codigo: 'sinapi_labor_eletricista', fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Eletricista (hora sem encargos)',         unidade: 'R$/h',   valor_min_base: 35,    valor_max_base: 55,    valor_ref_base: 45    },
  { codigo: 'sinapi_labor_encanador',   fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Encanador/Bombeiro (hora sem encargos)',  unidade: 'R$/h',   valor_min_base: 35,    valor_max_base: 55,    valor_ref_base: 45    },
  { codigo: 'sinapi_labor_azulejista',  fonte: 'sinapi_sp', categoria: 'mao_obra',    descricao: 'Azulejista (hora sem encargos)',          unidade: 'R$/h',   valor_min_base: 30,    valor_max_base: 48,    valor_ref_base: 39    },
  // SINAPI-SP — serviços (MO composta, sem material)
  { codigo: 'sinapi_svc_ceramica',      fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Aplicação cerâmica parede (sem material)', unidade: 'R$/m²', valor_min_base: 68,    valor_max_base: 125,   valor_ref_base: 96    },
  { codigo: 'sinapi_svc_porcelanato',   fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Aplicação porcelanato 60x60 (sem material)',unidade: 'R$/m²',valor_min_base: 75,    valor_max_base: 130,   valor_ref_base: 102   },
  { codigo: 'sinapi_svc_pintura_latex', fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Pintura látex PVA 2 demãos (m²)',        unidade: 'R$/m²',  valor_min_base: 16,    valor_max_base: 28,    valor_ref_base: 22    },
  { codigo: 'sinapi_svc_pintura_acril', fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Pintura acrílica 2 demãos (m²)',         unidade: 'R$/m²',  valor_min_base: 20,    valor_max_base: 38,    valor_ref_base: 29    },
  { codigo: 'sinapi_ponto_eletrico',    fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Ponto elétrico tomada/interruptor',      unidade: 'R$/un',  valor_min_base: 280,   valor_max_base: 520,   valor_ref_base: 400   },
  { codigo: 'sinapi_ponto_agua',        fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Ponto de água fria',                    unidade: 'R$/un',  valor_min_base: 420,   valor_max_base: 750,   valor_ref_base: 585   },
  { codigo: 'sinapi_ponto_esgoto',      fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Ponto de esgoto',                       unidade: 'R$/un',  valor_min_base: 350,   valor_max_base: 650,   valor_ref_base: 500   },
  { codigo: 'sinapi_drywall',           fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Parede drywall simples (m²)',            unidade: 'R$/m²',  valor_min_base: 95,    valor_max_base: 175,   valor_ref_base: 135   },
  { codigo: 'sinapi_forro_gesso',       fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Forro de gesso acartonado (m²)',        unidade: 'R$/m²',  valor_min_base: 70,    valor_max_base: 130,   valor_ref_base: 100   },
  { codigo: 'sinapi_contrapiso',        fonte: 'sinapi_sp', categoria: 'servico',     descricao: 'Regularização de contrapiso (m²)',      unidade: 'R$/m²',  valor_min_base: 38,    valor_max_base: 65,    valor_ref_base: 51    },
  // CUB-SP — SINDUSCON
  { codigo: 'cub_r1b',                  fonte: 'cub_sp',    categoria: 'benchmark_m2', descricao: 'CUB R-1-B residencial padrão baixo',   unidade: 'R$/m²',  valor_min_base: 1800,  valor_max_base: 2100,  valor_ref_base: 1958  },
  { codigo: 'cub_r1n',                  fonte: 'cub_sp',    categoria: 'benchmark_m2', descricao: 'CUB R-1-N residencial padrão normal',  unidade: 'R$/m²',  valor_min_base: 2400,  valor_max_base: 2780,  valor_ref_base: 2591  },
  { codigo: 'cub_r1a',                  fonte: 'cub_sp',    categoria: 'benchmark_m2', descricao: 'CUB R-1-A residencial padrão alto',   unidade: 'R$/m²',  valor_min_base: 3600,  valor_max_base: 4250,  valor_ref_base: 3924  },
  { codigo: 'cub_pp4n',                 fonte: 'cub_sp',    categoria: 'benchmark_m2', descricao: 'CUB PP-4-N prédio popular normal',    unidade: 'R$/m²',  valor_min_base: 2300,  valor_max_base: 2800,  valor_ref_base: 2543  },
  // CREA-SP
  { codigo: 'crea_art_simples_min',     fonte: 'crea_sp',   categoria: 'honorarios',  descricao: 'ART reforma simples (mínimo)',           unidade: 'R$',     valor_min_base: 200,   valor_max_base: 300,   valor_ref_base: 250   },
  { codigo: 'crea_art_simples_max',     fonte: 'crea_sp',   categoria: 'honorarios',  descricao: 'ART reforma simples (máximo)',           unidade: 'R$',     valor_min_base: 450,   valor_max_base: 650,   valor_ref_base: 550   },
  { codigo: 'crea_art_complexa_max',    fonte: 'crea_sp',   categoria: 'honorarios',  descricao: 'ART reforma complexa/estrutural (máx)', unidade: 'R$',     valor_min_base: 1400,  valor_max_base: 2200,  valor_ref_base: 1800  },
  { codigo: 'crea_rrt_perc_min',        fonte: 'crea_sp',   categoria: 'honorarios',  descricao: 'RRT arquitetura (% mínimo sobre obra)', unidade: '%',      valor_min_base: 0.5,   valor_max_base: 0.5,   valor_ref_base: 0.5   },
  { codigo: 'crea_rrt_perc_max',        fonte: 'crea_sp',   categoria: 'honorarios',  descricao: 'RRT arquitetura (% máximo sobre obra)', unidade: '%',      valor_min_base: 1.0,   valor_max_base: 2.0,   valor_ref_base: 1.5   },
  // SECONCI-SP — encargos
  { codigo: 'seconci_encargos_min',     fonte: 'seconci_sp',categoria: 'encargos',    descricao: 'Encargos sociais s/ salário (mínimo)',  unidade: '%',      valor_min_base: 82,    valor_max_base: 82,    valor_ref_base: 82    },
  { codigo: 'seconci_encargos_max',     fonte: 'seconci_sp',categoria: 'encargos',    descricao: 'Encargos sociais s/ salário (máximo)',  unidade: '%',      valor_min_base: 95,    valor_max_base: 95,    valor_ref_base: 95    },
  { codigo: 'seconci_sat',              fonte: 'seconci_sp',categoria: 'encargos',    descricao: 'SAT Seguro Acidente Trabalho (% folha)',unidade: '%',      valor_min_base: 3,     valor_max_base: 3,     valor_ref_base: 3     },
  { codigo: 'seconci_faepe_min',        fonte: 'seconci_sp',categoria: 'encargos',    descricao: 'FAEPE por trabalhador/mês (mínimo)',    unidade: 'R$',     valor_min_base: 40,    valor_max_base: 50,    valor_ref_base: 45    },
  { codigo: 'seconci_faepe_max',        fonte: 'seconci_sp',categoria: 'encargos',    descricao: 'FAEPE por trabalhador/mês (máximo)',    unidade: 'R$',     valor_min_base: 80,    valor_max_base: 90,    valor_ref_base: 85    },
  // AECWeb — benchmarks por ambiente
  { codigo: 'aec_banheiro_padrao',      fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Banheiro padrão completo (MO+mat)', unidade: 'R$', valor_min_base: 22000, valor_max_base: 48000, valor_ref_base: 35000 },
  { codigo: 'aec_banheiro_medio',       fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Banheiro médio completo (MO+mat)',  unidade: 'R$', valor_min_base: 48000, valor_max_base: 90000, valor_ref_base: 69000 },
  { codigo: 'aec_banheiro_alto',        fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Banheiro alto padrão (MO+mat)',     unidade: 'R$', valor_min_base: 90000, valor_max_base: 250000,valor_ref_base: 170000},
  { codigo: 'aec_cozinha_padrao',       fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Cozinha padrão completa (MO+mat)', unidade: 'R$', valor_min_base: 30000, valor_max_base: 65000, valor_ref_base: 47500 },
  { codigo: 'aec_cozinha_medio',        fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Cozinha médio padrão (MO+mat)',    unidade: 'R$', valor_min_base: 65000, valor_max_base: 130000,valor_ref_base: 97500 },
  { codigo: 'aec_cozinha_alto',         fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Cozinha alto padrão (MO+mat)',     unidade: 'R$', valor_min_base: 130000,valor_max_base: 350000,valor_ref_base: 240000},
  { codigo: 'aec_quarto',               fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Quarto com marcenaria básica',     unidade: 'R$', valor_min_base: 15000, valor_max_base: 40000, valor_ref_base: 27500 },
  { codigo: 'aec_sala',                 fonte: 'aecweb',    categoria: 'benchmark_ambiente', descricao: 'Sala de estar/jantar renovação',   unidade: 'R$', valor_min_base: 20000, valor_max_base: 60000, valor_ref_base: 40000 },
  { codigo: 'aec_ceramica_m2',          fonte: 'aecweb',    categoria: 'materiais',          descricao: 'Cerâmica 40x40 piso (material)',   unidade: 'R$/m²',valor_min_base: 45,   valor_max_base: 90,    valor_ref_base: 67    },
  { codigo: 'aec_porcelanato_m2',       fonte: 'aecweb',    categoria: 'materiais',          descricao: 'Porcelanato 60x60 (material)',     unidade: 'R$/m²',valor_min_base: 80,   valor_max_base: 220,   valor_ref_base: 150   },
  // Andora
  { codigo: 'andora_pintura_70m2',      fonte: 'andora',    categoria: 'ticket',      descricao: 'Pintura completa apartamento 70m²',    unidade: 'R$',     valor_min_base: 6500,  valor_max_base: 14000, valor_ref_base: 10250 },
  { codigo: 'andora_piso_60m2',         fonte: 'andora',    categoria: 'ticket',      descricao: 'Troca de piso + contrapiso 60m²',      unidade: 'R$',     valor_min_base: 12000, valor_max_base: 28000, valor_ref_base: 20000 },
  { codigo: 'andora_banheiro',          fonte: 'andora',    categoria: 'ticket',      descricao: 'Reforma de banheiro completa',          unidade: 'R$',     valor_min_base: 18000, valor_max_base: 55000, valor_ref_base: 36500 },
  { codigo: 'andora_eletrica_60m2',     fonte: 'andora',    categoria: 'ticket',      descricao: 'Instalação elétrica apartamento 60m²', unidade: 'R$',     valor_min_base: 8000,  valor_max_base: 20000, valor_ref_base: 14000 },
  // Chronoshare
  { codigo: 'chronoshare_pequeno',      fonte: 'chronoshare',categoria: 'ticket',     descricao: 'Ticket obra pequena (1-2 cômodos ≤30m²)',unidade: 'R$',   valor_min_base: 15000, valor_max_base: 55000, valor_ref_base: 35000 },
  { codigo: 'chronoshare_medio',        fonte: 'chronoshare',categoria: 'ticket',     descricao: 'Ticket obra média (3-4 cômodos 50-80m²)', unidade: 'R$',  valor_min_base: 55000, valor_max_base: 160000,valor_ref_base: 107500},
  { codigo: 'chronoshare_grande',       fonte: 'chronoshare',categoria: 'ticket',     descricao: 'Ticket obra grande (5+ cômodos 80-150m²)',unidade: 'R$',  valor_min_base: 160000,valor_max_base: 450000,valor_ref_base: 305000},
  { codigo: 'chronoshare_comercial',    fonte: 'chronoshare',categoria: 'benchmark_m2',descricao: 'Comercial leve (m²)',                 unidade: 'R$/m²', valor_min_base: 600,   valor_max_base: 1100,  valor_ref_base: 850   },
  // Catálogos de fornecedores
  { codigo: 'cat_porcelanato_tec',      fonte: 'catalogos', categoria: 'materiais',   descricao: 'Porcelanato técnico (material)',        unidade: 'R$/m²', valor_min_base: 120,   valor_max_base: 380,   valor_ref_base: 250   },
  { codigo: 'cat_tinta_latex_18l',      fonte: 'catalogos', categoria: 'materiais',   descricao: 'Tinta látex 18L',                      unidade: 'R$',    valor_min_base: 180,   valor_max_base: 320,   valor_ref_base: 250   },
  { codigo: 'cat_tinta_acril_18l',      fonte: 'catalogos', categoria: 'materiais',   descricao: 'Tinta acrílica premium 18L',           unidade: 'R$',    valor_min_base: 320,   valor_max_base: 580,   valor_ref_base: 450   },
  { codigo: 'cat_porta_mdf',            fonte: 'catalogos', categoria: 'materiais',   descricao: 'Porta interna MDF montada',            unidade: 'R$',    valor_min_base: 650,   valor_max_base: 2000,  valor_ref_base: 1325  },
  { codigo: 'cat_janela_alu25',         fonte: 'catalogos', categoria: 'materiais',   descricao: 'Janela alumínio linha 25 (m²)',        unidade: 'R$/m²', valor_min_base: 350,   valor_max_base: 900,   valor_ref_base: 625   },
  { codigo: 'cat_bdi_pequeno',          fonte: 'catalogos', categoria: 'bdi',         descricao: 'BDI obras até R$ 150k (%)',            unidade: '%',     valor_min_base: 20,    valor_max_base: 35,    valor_ref_base: 27    },
  { codigo: 'cat_bdi_medio',            fonte: 'catalogos', categoria: 'bdi',         descricao: 'BDI obras R$ 150k–500k (%)',           unidade: '%',     valor_min_base: 16,    valor_max_base: 25,    valor_ref_base: 20    },
  { codigo: 'cat_bdi_grande',           fonte: 'catalogos', categoria: 'bdi',         descricao: 'BDI obras acima de R$ 500k (%)',       unidade: '%',     valor_min_base: 12,    valor_max_base: 20,    valor_ref_base: 16    },
];

// ─── Tool schema ─────────────────────────────────────────────────────────────

const TOOL_FONTES_MENSAIS = {
  name: "submeter_fontes_mensais",
  description: "Submete os valores de mercado atualizados para os itens canônicos de referência de reforma/construção em São Paulo.",
  input_schema: {
    type: "object",
    required: ["itens", "recomendacao"],
    properties: {
      itens: {
        type: "array",
        description: "Array com um objeto por item canônico. Incluir todos os códigos fornecidos.",
        items: {
          type: "object",
          required: ["codigo", "valor_referencia", "status_coleta"],
          properties: {
            codigo:           { type: "string",  description: "Código canônico exato do item (ex: sinapi_labor_pedreiro)" },
            valor_referencia: { type: "number",  description: "Valor médio de mercado atual na unidade especificada" },
            valor_minimo:     { type: "number",  description: "Limite inferior (mercado econômico/básico)" },
            valor_maximo:     { type: "number",  description: "Limite superior (mercado premium/alto padrão)" },
            status_coleta:    { type: "string",  enum: ["coletado","pendente_revisao","nao_encontrado","fora_da_curva"], description: "coletado = confiante; pendente_revisao = incerto; nao_encontrado = sem dados; fora_da_curva = variação > 15% vs anterior" },
            observacoes:      { type: "string",  description: "Justificativa, fonte específica usada ou alerta" },
          },
        },
      },
      recomendacao: { type: "string", enum: ["aprovar","revisar"], description: "aprovar se maioria dos itens foi coletada com confiança; revisar se há muitos itens incertos ou alertas críticos" },
      alertas: {
        type: "array",
        items: { type: "string" },
        description: "Lista de alertas importantes para o revisor humano",
      },
      resumo_mudancas: { type: "string", description: "Parágrafo resumindo as principais mudanças identificadas vs mês anterior" },
    },
  },
  cache_control: { type: "ephemeral" },
};

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey    = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase        = createClient(supabaseUrl, supabaseService);

    // ── Validar caller (admin/master ou service_role implícito) ──────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceRole = authHeader.includes(supabaseService);

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""));
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json401("Token inválido");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tipo_usuario")
        .eq("id", user.id)
        .single();

      if (!profile || !["admin","master"].includes(profile.tipo_usuario)) {
        return json403("Apenas admin e master podem coletar fontes");
      }
    }

    const body = await req.json().catch(() => ({}));
    const today = new Date();
    const mesReferencia: string = body.mes_referencia
      ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // ── Verificar duplicata pendente no mês ──────────────────────────────────
    const { data: existente } = await supabase
      .from("fontes_preco_versoes")
      .select("id, status")
      .eq("mes_referencia", mesReferencia)
      .eq("status", "pendente_validacao")
      .maybeSingle();

    if (existente) {
      return new Response(
        JSON.stringify({ error: `Já existe versão pendente para ${mesReferencia}. Aprove, rejeite ou aguarde.`, versao_id: existente.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Buscar versão ativa anterior (baseline para comparação) ──────────────
    const { data: versaoAtiva } = await supabase
      .from("fontes_preco_versoes")
      .select("id, mes_referencia")
      .eq("status", "ativa")
      .maybeSingle();

    // deno-lint-ignore no-explicit-any
    let itensAnteriores: Record<string, any> = {};
    if (versaoAtiva) {
      const { data: itensAnt } = await supabase
        .from("fontes_preco_itens")
        .select("codigo, valor_referencia, valor_minimo, valor_maximo")
        .eq("versao_id", versaoAtiva.id);

      if (itensAnt) {
        for (const item of itensAnt) {
          itensAnteriores[item.codigo] = item;
        }
      }
    }

    if (!anthropicKey) {
      return jsonOk({ status: "sem_anthropic", message: "ANTHROPIC_API_KEY não configurada. Retornando seed de valores base.", versao_criada: false });
    }

    // ── Montar prompt ────────────────────────────────────────────────────────
    const prompt = buildColetaPrompt(mesReferencia, itensAnteriores);

    // ── Chamar Claude ────────────────────────────────────────────────────────
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "prompt-caching-2024-07-31",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 8192,
        system: [{ type: "text", text:
          "Você é um especialista em precificação da construção civil em São Paulo. " +
          "Forneça estimativas realistas e bem fundamentadas para cada item canônico. " +
          "Baseie-se nos valores anteriores como referência e ajuste conforme seu conhecimento de mercado. " +
          "Nunca invente dados sem base — prefira status pendente_revisao a inventar. " +
          "Use a tool submeter_fontes_mensais para retornar todos os itens.",
          cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
        tools:     [TOOL_FONTES_MENSAIS],
        tool_choice: { type: "tool", name: "submeter_fontes_mensais" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[coletar-fontes] Anthropic error:", aiResp.status, txt);
      return json500("Erro ao chamar Claude API");
    }

    const aiData  = await aiResp.json();
    // deno-lint-ignore no-explicit-any
    const toolUse = aiData.content?.find((b: any) => b.type === "tool_use");

    if (!toolUse?.input) {
      console.error("[coletar-fontes] Resposta sem tool_use:", JSON.stringify(aiData));
      return json500("Claude não retornou dados estruturados");
    }

    const resultado = toolUse.input;

    // ── Calcular stats de comparação ─────────────────────────────────────────
    const codigosAnteriores = new Set(Object.keys(itensAnteriores));
    const codigosNovos      = new Set(CANONICAL_ITEMS.map(i => i.codigo));
    const itensNovos        = [...codigosNovos].filter(c => !codigosAnteriores.has(c)).length;
    const itensRemovidos    = [...codigosAnteriores].filter(c => !codigosNovos.has(c)).length;

    // deno-lint-ignore no-explicit-any
    const itensRetornados: any[] = resultado.itens ?? [];

    let itensAlterados = 0;
    let itensFora      = 0;

    const itensComVariacao = itensRetornados.map((item: {
      codigo: string; valor_referencia: number; valor_minimo?: number;
      valor_maximo?: number; status_coleta: string; observacoes?: string;
    }) => {
      const anterior = itensAnteriores[item.codigo];
      let variacao: number | null = null;

      if (anterior && anterior.valor_referencia) {
        variacao = ((item.valor_referencia - anterior.valor_referencia) / anterior.valor_referencia) * 100;
        if (Math.abs(variacao) > 0.01) itensAlterados++;
        if (Math.abs(variacao) > 15) {
          itensFora++;
          item.status_coleta = "fora_da_curva";
        }
      }

      // Canonical info para os campos obrigatórios
      const canonical = CANONICAL_ITEMS.find(c => c.codigo === item.codigo);
      return {
        ...item,
        fonte:           canonical?.fonte      ?? "catalogos",
        categoria:       canonical?.categoria  ?? "materiais",
        descricao:       canonical?.descricao  ?? item.codigo,
        unidade:         canonical?.unidade    ?? "",
        valor_minimo:    item.valor_minimo  ?? canonical?.valor_min_base ?? null,
        valor_maximo:    item.valor_maximo  ?? canonical?.valor_max_base ?? null,
        variacao_percentual: variacao,
        data_referencia: `${mesReferencia}-01`,
      };
    });

    // ── Salvar versão pendente ───────────────────────────────────────────────
    const { data: novaVersao, error: versaoErr } = await supabase
      .from("fontes_preco_versoes")
      .insert({
        mes_referencia:   mesReferencia,
        status:           "pendente_validacao",
        total_itens:      itensComVariacao.length,
        itens_novos:      itensNovos,
        itens_removidos:  itensRemovidos,
        itens_alterados:  itensAlterados,
        itens_fora_curva: itensFora,
        resumo_mudancas:  { texto: resultado.resumo_mudancas ?? "", gerado_em: new Date().toISOString() },
      })
      .select("id")
      .single();

    if (versaoErr || !novaVersao) {
      console.error("[coletar-fontes] Erro ao criar versão:", versaoErr);
      return json500("Erro ao criar versão no banco");
    }

    // ── Salvar itens ─────────────────────────────────────────────────────────
    const itensParaInserir = itensComVariacao.map(item => ({
      versao_id:           novaVersao.id,
      fonte:               item.fonte,
      categoria:           item.categoria,
      codigo:              item.codigo,
      descricao:           item.descricao,
      unidade:             item.unidade,
      valor_referencia:    item.valor_referencia,
      valor_minimo:        item.valor_minimo,
      valor_maximo:        item.valor_maximo,
      variacao_percentual: item.variacao_percentual,
      data_referencia:     item.data_referencia,
      status_coleta:       item.status_coleta,
      observacoes:         item.observacoes ?? null,
    }));

    if (itensParaInserir.length > 0) {
      const { error: itensErr } = await supabase
        .from("fontes_preco_itens")
        .insert(itensParaInserir);

      if (itensErr) {
        console.error("[coletar-fontes] Erro ao inserir itens:", itensErr);
      }
    }

    // ── Salvar relatório ─────────────────────────────────────────────────────
    const resumoPorFonte: Record<string, { total: number; fora_curva: number; pendente: number }> = {};
    for (const item of itensComVariacao) {
      if (!resumoPorFonte[item.fonte]) {
        resumoPorFonte[item.fonte] = { total: 0, fora_curva: 0, pendente: 0 };
      }
      resumoPorFonte[item.fonte].total++;
      if (item.status_coleta === "fora_da_curva") resumoPorFonte[item.fonte].fora_curva++;
      if (item.status_coleta === "pendente_revisao") resumoPorFonte[item.fonte].pendente++;
    }

    await supabase.from("fontes_preco_relatorios").insert({
      versao_id:       novaVersao.id,
      conteudo:        {
        mes_referencia:  mesReferencia,
        versao_anterior: versaoAtiva?.mes_referencia ?? null,
        total_itens:     itensComVariacao.length,
        itens_alterados: itensAlterados,
        itens_fora_curva: itensFora,
        resumo:          resultado.resumo_mudancas ?? "",
      },
      alertas:         resultado.alertas ?? [],
      recomendacao:    resultado.recomendacao,
      resumo_por_fonte: resumoPorFonte,
    });

    console.log(`[coletar-fontes] Versão ${novaVersao.id} criada. Itens: ${itensComVariacao.length}, fora_curva: ${itensFora}, recomendação: ${resultado.recomendacao}`);

    return jsonOk({
      status:          "pendente_validacao",
      versao_id:       novaVersao.id,
      mes_referencia:  mesReferencia,
      total_itens:     itensComVariacao.length,
      itens_novos:     itensNovos,
      itens_alterados: itensAlterados,
      itens_fora_curva: itensFora,
      recomendacao:    resultado.recomendacao,
      alertas:         resultado.alertas ?? [],
    });

  } catch (err) {
    console.error("[coletar-fontes] Exception:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Prompt builder ───────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function buildColetaPrompt(mesReferencia: string, itensAnteriores: Record<string, any>): string {
  const temBaseline = Object.keys(itensAnteriores).length > 0;

  const baselineSection = temBaseline
    ? `VALORES DA VERSÃO ANTERIOR (use como referência de baseline):
${CANONICAL_ITEMS.map(item => {
  const ant = itensAnteriores[item.codigo];
  if (!ant) return `  ${item.codigo}: SEM DADO ANTERIOR`;
  return `  ${item.codigo}: ref=${ant.valor_referencia} | min=${ant.valor_minimo ?? "?"} | max=${ant.valor_maximo ?? "?"}`;
}).join("\n")}

Variações > 15% em relação a esses valores devem ser marcadas como status_coleta: "fora_da_curva".`
    : "Primeira coleta do sistema — sem baseline anterior. Use os valores de mercado SP atuais.";

  const itensSection = CANONICAL_ITEMS.map(item =>
    `  ${item.codigo} | ${item.fonte} | ${item.descricao} | unidade: ${item.unidade}`
  ).join("\n");

  return `Você é o sistema de coleta de preços de referência da plataforma Reforma100.

Mês de referência: ${mesReferencia}
Data da coleta: ${new Date().toISOString().split("T")[0]}
Mercado alvo: São Paulo, SP, Brasil

${baselineSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ITENS CANÔNICOS A AVALIAR (${CANONICAL_ITEMS.length} itens)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itensSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONTES DE REFERÊNCIA A CRUZAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- SINAPI-SP: tabela CEF de composições e insumos — SP
- SINDUSCON-SP / CUB: Custo Unitário Básico mensal publicado por SINDUSCON-SP
- CREA-SP: tabela de honorários e ARTs da construção civil SP
- SECONCI-SP: encargos trabalhistas e salários convenção coletiva SP
- AECWeb: portal técnico de benchmarks e custos por ambiente
- Andora: marketplace de serviços, preços praticados SP
- Chronoshare: marketplace de serviços, tickets reais SP
- Catálogos: Portobello, Deca/Docol, Eucatex, Tigre, Leroy Merlin SP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Para cada item canônico: forneça valor_referencia (médio), valor_minimo, valor_maximo
2. Baseie-se no seu conhecimento de mercado SP mais recente
3. Se não tiver dado confiável: status_coleta = "pendente_revisao"
4. Se variação > 15% vs baseline: status_coleta = "fora_da_curva" + justificativa em observacoes
5. Inclua em alertas: itens críticos que o revisor deve conferir manualmente
6. recomendacao = "aprovar" se ≥ 80% dos itens foram coletados com confiança
7. recomendacao = "revisar" se há muitos itens incertos ou variações atípicas

Use a tool submeter_fontes_mensais para retornar TODOS os ${CANONICAL_ITEMS.length} itens.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json401(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json403(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json500(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
