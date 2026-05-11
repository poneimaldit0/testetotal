import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: atualiza registro para 'erro' com detalhe e garante que nunca fica travado
async function marcarErro(
  supabase: ReturnType<typeof createClient>,
  id: string,
  detalhe: string,
): Promise<void> {
  await supabase
    .from("compatibilizacoes_analises_ia")
    .update({ status: "erro", erro_detalhe: detalhe })
    .eq("id", id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { orcamento_id, candidaturas_ids, correcoes_consultor } = body;

    console.log("[compat] body recebido:", JSON.stringify(body));
    console.log("[compat] orcamento_id:", orcamento_id);
    console.log("[compat] candidaturas_ids:", candidaturas_ids, "| qty:", candidaturas_ids?.length);

    if (!orcamento_id || !candidaturas_ids || candidaturas_ids.length < 2) {
      const motivo = !orcamento_id
        ? "orcamento_id ausente"
        : !candidaturas_ids
        ? "candidaturas_ids ausente"
        : `candidaturas_ids tem ${candidaturas_ids.length} item(s), mínimo 2`;
      console.error("[compat] validação inicial falhou:", motivo);
      return new Response(
        JSON.stringify({ error: "Payload inválido", motivo }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase        = createClient(supabaseUrl, supabaseKey);

    console.log("[compat] SUPABASE_URL:", supabaseUrl);
    console.log("[compat] service_role key presente:", !!supabaseKey);
    console.log("[compat] ANTHROPIC_API_KEY presente:", !!anthropicApiKey);

    // ── 1. Buscar dados do orçamento ──────────────────────────────────────
    const { data: orcamento, error: orcError } = await supabase
      .from("orcamentos")
      .select("*")
      .eq("id", orcamento_id)
      .single();

    console.log("[compat] orcamento encontrado:", !!orcamento, "| erro:", JSON.stringify(orcError));

    if (orcError || !orcamento) {
      return new Response(
        JSON.stringify({ error: "Orçamento não encontrado", detalhes: JSON.stringify(orcError) }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Buscar candidaturas em batch ───────────────────────────────────
    const { data: candidaturasBatch, error: candBatchErr } = await supabase
      .from("candidaturas_fornecedores")
      .select("id, empresa, nome")
      .in("id", candidaturas_ids as string[]);

    console.log("[compat] candidaturas batch — encontradas:", candidaturasBatch?.length ?? 0, "de", candidaturas_ids.length);
    console.log("[compat] candidaturas batch — erro:", JSON.stringify(candBatchErr));
    console.log("[compat] candidaturas batch — data:", JSON.stringify(candidaturasBatch));

    if (candBatchErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar candidaturas", detalhes: JSON.stringify(candBatchErr) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidaturasEncontradas = candidaturasBatch ?? [];

    if (candidaturasEncontradas.length < 2) {
      const naoEncontradas = (candidaturas_ids as string[]).filter(
        id => !candidaturasEncontradas.find((c: { id: string }) => c.id === id)
      );
      const detalhes = `Encontradas ${candidaturasEncontradas.length} de ${candidaturas_ids.length} candidaturas. IDs não encontrados: [${naoEncontradas.join(", ")}]`;
      console.error("[compat] 422 —", detalhes);
      return new Response(
        JSON.stringify({ error: "Mínimo 2 candidaturas localizadas são necessárias", detalhes }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Buscar análises individuais ────────────────────────────────────
    const propostas: Array<{
      candidatura_id: string;
      empresa:        string;
      analise:        Record<string, unknown> | null;
    }> = [];

    for (const cand of candidaturasEncontradas as Array<{ id: string; empresa: string; nome: string }>) {
      const { data: analiseRow, error: analiseErr } = await supabase
        .from("propostas_analises_ia")
        .select("analise_completa, valor_proposta, posicionamento, pontos_fortes, pontos_atencao")
        .eq("candidatura_id", cand.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log(`[compat] analise de ${cand.empresa} (${cand.id}): encontrada=${!!analiseRow} | erro=${JSON.stringify(analiseErr)}`);

      propostas.push({
        candidatura_id: cand.id,
        empresa:        cand.empresa,
        analise:        analiseRow ?? null,
      });
    }

    console.log(`[compat] propostas montadas: ${propostas.length} | com analise: ${propostas.filter(p => !!p.analise).length}`);

    // ── 3b. Separar propostas válidas das incompatíveis ───────────────────
    const propostasValidas = propostas.filter(p => {
      const ac          = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
      const compatEscopo = ac?.compatibilidade_escopo as string | null;
      const tipoProposta = ac?.tipo_proposta as string | null;
      const valorProposta = p.analise?.valor_proposta as number | null;
      if (!valorProposta)                              return false;
      if (compatEscopo === "incompativel")             return false;
      if (tipoProposta === "projeto_arquitetonico")    return false;
      return true;
    });

    const propostasIncompativeis = propostas.filter(p => {
      const ac           = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
      const compatEscopo = ac?.compatibilidade_escopo as string | null;
      const tipoProposta = ac?.tipo_proposta as string | null;
      return compatEscopo === "incompativel" || tipoProposta === "projeto_arquitetonico";
    });

    console.log(`[compat] válidas para análise: ${propostasValidas.length} | incompatíveis excluídas: ${propostasIncompativeis.length}`);

    // ── 3c. Montar proposta_filtros_log ───────────────────────────────────
    // Registro estruturado de TODAS as decisões de filtragem por proposta.
    // Permite rastreabilidade futura no frontend sem depender de logs de console.
    const idsNaoEncontrados = (candidaturas_ids as string[]).filter(
      id => !candidaturasEncontradas.find((c: { id: string }) => c.id === id)
    );

    const proposta_filtros_log = {
      gerado_em:                      new Date().toISOString(),
      candidaturas_ids_recebidos:     (candidaturas_ids as string[]).length,
      candidaturas_encontradas_banco:  candidaturasEncontradas.length,
      nao_encontradas_no_banco:        idsNaoEncontrados,
      incluidas: propostasValidas.map(p => ({
        candidatura_id: p.candidatura_id,
        empresa:        p.empresa,
        motivo:         "passou_todos_os_filtros",
      })),
      excluidas: propostas
        .filter(p => !propostasValidas.find(v => v.candidatura_id === p.candidatura_id))
        .map(p => {
          if (!p.analise) {
            return {
              candidatura_id: p.candidatura_id,
              empresa:        p.empresa,
              motivo:         "sem_analise_ia_individual",
              detalhe:        "Nenhuma análise IA com status=completed encontrada em propostas_analises_ia",
            };
          }
          const ac           = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
          const compatEscopo = ac?.compatibilidade_escopo as string | null;
          const tipoProposta = ac?.tipo_proposta as string | null;
          const valorProposta = p.analise?.valor_proposta as number | null;
          if (!valorProposta) {
            return {
              candidatura_id: p.candidatura_id,
              empresa:        p.empresa,
              motivo:         "valor_proposta_ausente_ou_zero",
              detalhe:        "valor_proposta é null ou 0 em propostas_analises_ia",
            };
          }
          if (compatEscopo === "incompativel") {
            return {
              candidatura_id: p.candidatura_id,
              empresa:        p.empresa,
              motivo:         "escopo_incompativel",
              detalhe:        (ac?.motivo_incompatibilidade as string) ?? "compatibilidade_escopo=incompativel",
            };
          }
          if (tipoProposta === "projeto_arquitetonico") {
            return {
              candidatura_id: p.candidatura_id,
              empresa:        p.empresa,
              motivo:         "proposta_arquitetonica",
              detalhe:        "tipo_proposta=projeto_arquitetonico — não comparável com execução de obra",
            };
          }
          return {
            candidatura_id: p.candidatura_id,
            empresa:        p.empresa,
            motivo:         "razao_desconhecida",
            detalhe:        `compatibilidade_escopo=${compatEscopo} | tipo_proposta=${tipoProposta} | valor=${valorProposta}`,
          };
        }),
    };

    // ── 4. Criar registro 'processando' ───────────────────────────────────
    // Partial unique index (idx_compat_orcamento_ativo) previne 2 ativos simultâneos.
    // Conflito 23505 → retorna 409 em vez de criar duplicata.
    const { data: registro, error: insertError } = await supabase
      .from("compatibilizacoes_analises_ia")
      .insert({
        orcamento_id,
        candidaturas_ids,
        status:               "processando",
        proposta_filtros_log,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[compat] Insert error:", JSON.stringify(insertError));
      // Código 23505 = unique_violation → análise já em andamento
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Compatibilização já em andamento para este orçamento. Aguarde a conclusão antes de solicitar nova análise." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar registro de compatibilização", detalhes: JSON.stringify(insertError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!anthropicApiKey) {
      await marcarErro(supabase, registro.id, "ANTHROPIC_API_KEY não configurada no ambiente da edge function");
      return new Response(
        JSON.stringify({ compat_id: registro.id, status: "erro", motivo: "configuracao_api_ausente" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (propostasValidas.length < 2) {
      const motivo = `Apenas ${propostasValidas.length} proposta(s) compatível(is) após filtro. Mínimo 2 para compatibilização.`;
      console.error("[compat]", motivo);
      await marcarErro(supabase, registro.id, motivo);
      return new Response(
        JSON.stringify({ compat_id: registro.id, status: "erro", motivo }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Montar blocos de dados brutos por empresa ─────────────────────────
    const blocoEmpresas = propostasValidas.map((p, i) => {
      const ac  = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
      const cm  = ac?.comparativo_mercado as Record<string, unknown> | null ?? null;
      const ae  = ac?.analise_escopo      as Record<string, unknown> | null ?? null;
      const ar  = ac?.analise_risco       as Record<string, unknown> | null ?? null;
      const tab = ac?.tabela_tecnica      as Record<string, unknown> | null ?? null;
      const conc = ac?.conclusao          as Record<string, unknown> | null ?? null;
      const comp = ac?.composicao         as Record<string, unknown> | null ?? null;
      const ep  = ac?.escopo_projeto      as Record<string, unknown> | null ?? null;
      const rm  = ac?.referencia_mercado  as Record<string, unknown> | null ?? null;
      const at  = ac?.analise_tecnica     as Record<string, unknown> | null ?? null;
      const cv  = ac?.competitividade     as Record<string, unknown> | null ?? null;

      const servicosInclusos = (ep?.servicos_inclusos as string[] ?? []);
      const itensAusentes    = (ae?.itens_ausentes    as string[] ?? []);
      const termosvagos      = (ae?.termos_vagos      as string[] ?? []);
      const detCat = (comp?.detalhamento_categorias as Array<{categoria:string;mao_obra:number;material:number;total:number}> ?? []);
      const cmpSinapi = (rm?.comparacao_por_categoria as Array<{categoria:string;diferenca_percentual:number;badge:string}> ?? []);
      const melhorias = (cv?.melhorias_comerciais as string[] ?? []);

      return `╔══ EMPRESA ${i + 1}: ${p.empresa} (candidatura_id: ${p.candidatura_id}) ══╗
VALORES
  Valor proposto:         R$ ${cm?.valor_fornecedor ?? p.analise?.valor_proposta ?? 'N/D'}
  R$/m² fornecedor:       ${cm?.valor_por_m2_fornecedor != null ? `R$ ${cm.valor_por_m2_fornecedor}/m²` : 'N/D'}
  Valor médio mercado:    R$ ${cm?.media_mercado ?? 'N/D'}
  R$/m² mercado ref.:     ${cm?.valor_por_m2_mercado != null ? `R$ ${cm.valor_por_m2_mercado}/m²` : 'N/D'}
  Faixa mercado:          R$ ${cm?.faixa_referencia_min ?? 'N/D'} – R$ ${cm?.faixa_referencia_max ?? 'N/D'}
  Diferença vs mercado:   ${cm?.diferenca_percentual_mercado != null ? cm.diferenca_percentual_mercado + '%' : 'N/D'}
  Classificação preço:    ${cm?.classificacao_preco ?? 'N/D'}
SCORES IA
  Score geral:            ${ac?.score ?? 'N/D'}/100
  Nível de risco:         ${ac?.nivel_risco ?? 'N/D'}
  Posicionamento:         ${p.analise?.posicionamento ?? 'N/D'}
ESCOPO
  Tipo proposta:          ${ac?.tipo_proposta ?? 'N/D'}
  Nível detalhamento:     ${ae?.nivel_detalhamento ?? 'N/D'}
  Clareza técnica:        ${ae?.clareza_tecnica ?? 'N/D'}
  Separação M.O/Material: ${ae?.separacao_materiais_mo ? 'Sim' : 'Não'}
  Def. responsabilidades: ${ae?.definicao_responsabilidades ?? 'N/D'}
  Síntese escopo:         ${ep?.sintese_tecnica ?? 'N/D'}
  Serviços inclusos:      ${servicosInclusos.length > 0 ? servicosInclusos.join(' | ') : 'N/D'}
  Itens ausentes/risco:   ${itensAusentes.length > 0 ? itensAusentes.join(' | ') : 'nenhum identificado'}
  Termos vagos:           ${termosvagos.length > 0 ? termosvagos.join(' | ') : 'nenhum'}
COMPOSIÇÃO M.O × MATERIAIS
  M.O total:              ${comp?.total_mao_obra != null ? `R$ ${Number(comp.total_mao_obra).toLocaleString('pt-BR')}` : 'N/D'}
  Materiais total:        ${comp?.total_materiais != null ? `R$ ${Number(comp.total_materiais).toLocaleString('pt-BR')}` : 'N/D'}
  Gestão/BDI:             ${comp?.total_gestao_bdi != null ? `R$ ${Number(comp.total_gestao_bdi).toLocaleString('pt-BR')}` : 'N/D'}
  % M.O:                  ${comp?.percentual_mao_obra != null ? `${comp.percentual_mao_obra}%` : 'N/D'}
  % Materiais:            ${comp?.percentual_materiais != null ? `${comp.percentual_materiais}%` : 'N/D'}
  Detalhe por categoria:  ${detCat.length > 0 ? detCat.map(c => `${c.categoria}→R$${c.total}(MO:${c.mao_obra}/Mat:${c.material})`).join(' | ') : 'N/D'}
COMPARAÇÃO SINAPI POR CATEGORIA
  ${cmpSinapi.length > 0 ? cmpSinapi.map(c => `${c.categoria}: ${c.diferenca_percentual}% vs SINAPI [badge:${c.badge}]`).join(' | ') : 'N/D'}
RISCOS
  Risco técnico:          ${ar?.risco_tecnico ?? 'N/D'}
  Risco financeiro:       ${ar?.risco_financeiro ?? 'N/D'}
  Risco operacional:      ${ar?.risco_operacional ?? 'N/D'}
  Risco contratual:       ${ar?.risco_contratual ?? 'N/D'}
PRAZO / PAGAMENTO
  Prazo informado:        ${tab?.prazo_informado ?? 'N/D'}
  Condições pagamento:    ${tab?.condicoes_pagamento ?? 'N/D'}
POSICIONAMENTO
  Avaliação geral:        ${at?.posicionamento_geral ?? 'N/D'}
  Itens p/ negociação:    ${at?.itens_atencao_negociacao ?? 'N/D'}
  Melhorias sugeridas:    ${melhorias.length > 0 ? melhorias.join(' | ') : 'N/D'}
PONTOS FORTES:      ${(p.analise?.pontos_fortes as string[] ?? []).join(' | ')}
PONTOS DE ATENÇÃO:  ${(p.analise?.pontos_atencao as string[] ?? []).join(' | ')}
CONCLUSÃO IA:       ${(conc?.recomendacao_final as string) ?? 'N/D'}
╚═══════════════════════════════════════════════════╝`;
    }).join("\n\n");

    const metragem  = orcamento.metragem  || "Não informado";
    const categorias = orcamento.categoria || orcamento.categorias_servico || "Não especificada";

    const blocoCorrecoes = correcoes_consultor?.trim()
      ? `\n━━━ CORREÇÕES DO CONSULTOR — PRIORIDADE MÁXIMA ━━━
ATENÇÃO: As informações abaixo foram inseridas MANUALMENTE pelo consultor técnico da Reforma100.
Elas SOBREPÕEM e CORRIGEM os dados automáticos extraídos da análise individual de cada proposta.

REGRAS OBRIGATÓRIAS:
→ Se o consultor corrigiu o valor de uma empresa: use ESSE valor como valor_proposta e recalcule diferenca_mercado
→ Se o consultor informou que um item está incluso ou excluído: sobrescreva os dados de escopo automáticos
→ Se o consultor identificou risco específico: incorpore obrigatoriamente nas seções de risco e pontos de atenção
→ NÃO ignore nenhuma correção do consultor, mesmo que contradiga os dados automáticos

Correções do consultor para esta reanálise:
${correcoes_consultor.trim()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      : "";

    const blocoIncompativeis = propostasIncompativeis.length > 0
      ? `\n━━━ PROPOSTAS NÃO COMPARÁVEIS — EXCLUÍDAS DA ANÁLISE (${propostasIncompativeis.length}) ━━━
ATENÇÃO: As propostas abaixo foram identificadas como incompatíveis e NÃO devem ser mencionadas, comparadas ou consideradas.
${propostasIncompativeis.map(p => {
  const ac = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
  const motivo = (ac?.compatibilidade_escopo as string) === "incompativel"
    ? (ac?.motivo_incompatibilidade as string ?? "escopo incompatível")
    : "proposta de projeto arquitetônico — não comparável com execução de obra";
  return `- ${p.empresa}: ${motivo}`;
}).join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      : "";

    // ── 5. Chamar Claude — Sonnet (única etapa) ──────────────────────────
    const etapa2MaxTokens = Math.min(3500 + propostasValidas.length * 400, 5500);
    console.log(`[compat] empresas válidas: ${propostasValidas.length} | etapa2 max_tokens: ${etapa2MaxTokens}`);

    try {

      // ── ETAPA 1: Normalização TypeScript (sem chamada de IA — infalível) ─
      console.log(`[compat] etapa1 normalização TypeScript — ${propostasValidas.length} empresas — id: ${registro.id}`);

      const metragemNum = parseFloat(String(metragem)) || null;

      const empresasNorm = propostasValidas.map((p) => {
        const ac   = p.analise?.analise_completa as Record<string, unknown> | null ?? null;
        const cm   = ac?.comparativo_mercado as Record<string, unknown> | null ?? null;
        const ae   = ac?.analise_escopo      as Record<string, unknown> | null ?? null;
        const ar   = ac?.analise_risco       as Record<string, unknown> | null ?? null;
        const tab  = ac?.tabela_tecnica      as Record<string, unknown> | null ?? null;
        const ep   = ac?.escopo_projeto      as Record<string, unknown> | null ?? null;
        const at   = ac?.analise_tecnica     as Record<string, unknown> | null ?? null;

        const valorBruto  = cm?.valor_fornecedor ?? p.analise?.valor_proposta;
        const valorCorr   = typeof valorBruto === 'number' ? valorBruto : null;
        const valorM2     = valorCorr != null && metragemNum ? Math.round(valorCorr / metragemNum) : null;

        const servicosInc = (ep?.servicos_inclusos as string[] ?? []);
        const itensAus    = (ae?.itens_ausentes    as string[] ?? []);

        const riscos: string[] = [];
        if (ar?.risco_tecnico)     riscos.push(`técnico: ${ar.risco_tecnico}`);
        if (ar?.risco_financeiro)  riscos.push(`financeiro: ${ar.risco_financeiro}`);
        if (ar?.risco_operacional) riscos.push(`operacional: ${ar.risco_operacional}`);
        if (ar?.risco_contratual)  riscos.push(`contratual: ${ar.risco_contratual}`);

        return {
          candidatura_id:                 p.candidatura_id,
          empresa:                        p.empresa,
          valor_corrigido:                valorCorr,
          valor_por_m2:                   valorM2,
          escopo_resumido:                String(ep?.sintese_tecnica ?? ae?.nivel_detalhamento ?? 'Não informado'),
          itens_inclusos:                 servicosInc,
          itens_excluidos:                [] as string[],
          itens_nao_mencionados:          itensAus,
          materiais_relevantes:           String(tab?.materiais_observacoes ?? at?.especificacao_materiais ?? 'Não informado'),
          prazo:                          String(tab?.prazo_informado ?? 'Não informado'),
          pagamento:                      String(tab?.condicoes_pagamento ?? 'Não informado'),
          documentacao:                   String(tab?.documentacao ?? at?.documentacao ?? 'Não informado'),
          riscos_principais:              riscos,
          pontos_fortes:                  (p.analise?.pontos_fortes  as string[] ?? []),
          pontos_atencao:                 (p.analise?.pontos_atencao as string[] ?? []),
          observacoes_correcao_consultor: '',
        };
      }) as Array<{
        candidatura_id: string; empresa: string; valor_corrigido: number | null; valor_por_m2: number | null;
        escopo_resumido: string; itens_inclusos: string[]; itens_excluidos: string[];
        itens_nao_mencionados: string[]; materiais_relevantes: string; prazo: string;
        pagamento: string; documentacao: string; riscos_principais: string[];
        pontos_fortes: string[]; pontos_atencao: string[]; observacoes_correcao_consultor: string;
      }>;

      console.log(`[compat] etapa1 end — ${empresasNorm.length} empresas normalizadas — id: ${registro.id}`);

      // ── ETAPA 2: Compatibilização final ────────────────────────────────
      const trunc = (s: string, n: number) => s?.length > n ? s.slice(0, n) + '…' : (s || 'N/D');
      const tArr  = (arr: string[], n: number) => arr.slice(0, n);

      const blocoNorm = empresasNorm.map((e, i) => `╔══ EMPRESA ${i + 1}: ${e.empresa} (candidatura_id: ${e.candidatura_id}) ══╗
Valor:        ${e.valor_corrigido != null ? `R$ ${e.valor_corrigido.toLocaleString('pt-BR')}` : 'Não informado'} | R$/m²: ${e.valor_por_m2 != null ? `R$ ${e.valor_por_m2.toLocaleString('pt-BR')}/m²` : 'N/D'}
Escopo:       ${trunc(e.escopo_resumido, 300)}
Inclusos:     ${tArr(e.itens_inclusos, 6).join(' | ') || 'N/D'}
Excluídos:    ${tArr(e.itens_excluidos, 5).join(' | ') || 'nenhum declarado'}
Não citados:  ${tArr(e.itens_nao_mencionados, 6).join(' | ') || 'nenhum'}
Materiais:    ${trunc(e.materiais_relevantes, 200)}
Prazo:        ${trunc(e.prazo, 150)}
Pagamento:    ${trunc(e.pagamento, 150)}
Documentação: ${trunc(e.documentacao, 150)}
Riscos:       ${tArr(e.riscos_principais, 5).join(' | ') || 'nenhum'}
Fortes:       ${tArr(e.pontos_fortes, 4).join(' | ') || 'N/D'}
Atenção:      ${tArr(e.pontos_atencao, 4).join(' | ') || 'N/D'}${e.observacoes_correcao_consultor ? `\nCorreções:    ${trunc(e.observacoes_correcao_consultor, 200)}` : ''}
╚═══════════════════════════════════════╝`).join("\n\n");

      const promptCompat = `Consultor técnico sênior da Reforma100. Pare técnico comparativo para reunião com o cliente.

REGRAS INVIOLÁVEIS:
• Análise comparativa — nunca descritiva. Cada campo: impacto real para a decisão.
• PROIBIDO: texto genérico, repetição entre campos, "adequado" sem justificativa técnica.
• PROIBIDO: comparar só preço — sempre considerar escopo, risco, documentação.
• PROIBIDO: "dentro do mercado" sem número/faixa/fonte. Responder: preço ou escopo diferente?

PROJETO: ${orcamento.nome_contato || "N/I"} | ${orcamento.cidade || ""}, ${orcamento.estado || "SP"} | ${metragem} m²
Serviços: ${typeof categorias === 'object' ? JSON.stringify(categorias) : categorias}
Descrição: ${orcamento.descricao || "Não informada"}

DADOS NORMALIZADOS — ${empresasNorm.length} empresas:
${blocoNorm}
${blocoCorrecoes}${blocoIncompativeis}
REFERÊNCIAS: SINAPI-SP (custos unitários) | CUB/SINDUSCON: leve R$450–700/m² | média R$650–950/m² | completa R$1.200–1.800/m² | premium R$1.800–2.600/m² | CREA-SP (ART/RRT) | SECONCI-SP (prazo) | Andora/Chronoshare (benchmark)
Sempre citar faixa e fonte. Indicar se diferença vem de: preço | escopo | material | risco | documentação.

CAMPOS A PREENCHER (análise comparativa por empresa em cada um):

escopo_cliente: tipologia, padrão esperado, faixa CUB aplicável, riscos técnicos do projeto

tabela_comparativa: item a item por disciplina. ✔=incluso | ~=vago | ✗=excluído | ?=não citado (risco aditivo). Disciplinas: Civil | Elétrica | Hidráulica | Revestimentos | Esquadrias | Pintura | Forro | Marcenaria | Instalações | Documentação. Formato: "Item: EmpA: detalhe ✔ | EmpB: detalhe ?"

valores_por_empresa: valor total, R$/m², composição M.O/materiais, spread entre propostas

comparacao_mercado_detalhada: desvio % vs SINAPI/SINDUSCON por empresa, tipologia, fonte. Subdimensionamento ou sobrepreço?

inclusoes_exclusoes: itens inclusos/excluídos/não mencionados por empresa. Qual tem menor risco de aditivo?

analise_materiais: padrão (popular/médio/alto) por empresa vs padrão esperado. Riscos de especificação vaga.

analise_prazo: prazo — realista? benchmark SECONCI-SP. Risco de atraso por empresa.

condicoes_pagamento: estrutura, risco financeiro para o cliente, alinhamento com cronograma.

documentacao_tecnica: ART/RRT, responsável técnico, garantias NBR 15575. Maior segurança jurídica?

pontos_fortes_por_empresa: por empresa — O QUÊ é forte → POR QUÊ vantagem real para este projeto

pontos_atencao_por_empresa: por empresa — [problema] → [risco] → [como mitigar antes de contratar]

riscos_detalhados: por empresa — técnico | financeiro | operacional | contratual. Nível (baixo/médio/alto). Risco mais crítico e mitigação.

diferenca_real [PRIORIDADE MÁXIMA]: diferença REAL de escopo além do preço. Preço ou escopo diferente? Custo real da mais barata com aditivos. Qual entrega melhor valor-custo?

recomendacao_final_detalhada: recomendação CONDICIONAL — empresa + justificativa técnica+financeira+risco. Condições de validade. Pontos a negociar ANTES de assinar.

proximos_passos: documentos a solicitar, pontos a negociar, proteção jurídica, como formalizar.

escopo | preco | prazo | risco | materiais: sínteses comparativas de cada dimensão.

SCORE COMPOSTO (score_composto 0–100): qualidade técnica 30% + preço vs mercado 25% + risco invertido 20% + completude do escopo 15% + clareza da proposta 10%.
Risco invertido: baixo→100 | médio→60 | alto→20. Proposta >20% abaixo do mercado: penalizar preço (sobrepreço ou escopo encolhido).
Score baseado exclusivamente na análise acima — nunca arbitrário.

RANKING — justificativa_posicao é o campo principal:
Compare diretamente as empresas: preço real (com aditivos prováveis), escopo declarado vs esperado, risco contratual e documentação técnica.
Seja direto e profundo — 3 a 4 frases densas por empresa. Mencione números, percentuais e riscos concretos.

Retorne candidatura_id exatamente como fornecido. Análise EXCLUSIVAMENTE das empresas normalizadas acima.`;

      // ── Avançar para 'compatibilizando' antes de chamar Claude ──────────
      await supabase
        .from("compatibilizacoes_analises_ia")
        .update({ status: "compatibilizando" })
        .eq("id", registro.id);

      // Chamar Claude — Etapa 2 (com timeout de 110s para não travar em erro de rede)
      console.log("[compat] etapa2 start — id:", registro.id);
      console.time("[compat] etapa2");

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 110_000);

      let aiResponse: Response;
      try {
        aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicApiKey!,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31",
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: etapa2MaxTokens,
            system: [{ type: "text", text: "Você é um consultor técnico sênior da Reforma100 especializado em análise comparativa de propostas de reforma e construção. Produza parecer técnico profissional — análise específica e baseada em referências reais de mercado (SINAPI-SP, SINDUSCON-SP, CREA-SP). Preencha TODOS os campos com dados concretos. Scores devem ser tecnicamente embasados. Nunca use texto genérico. IMPORTANTE: seja conciso — máx 3 frases por empresa em cada campo comparativo. Prefira frases objetivas com números e fatos a parágrafos longos.", cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: promptCompat }],
            tools: [
              {
                name: "analise_compatibilizacao",
                description: "Retorna ranking comparativo, análise técnica e recomendação final entre múltiplas propostas",
                input_schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {

                    // analise_comparativa PRIMEIRO — garante geração antes do ranking
                    analise_comparativa: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        escopo:    { type: "string", description: "Síntese comparativa de escopo — diferenças reais de escopo que impactam o cliente" },
                        preco:     { type: "string", description: "Comparação de preços com referência SINAPI/SINDUSCON — desvio % vs mercado por empresa" },
                        prazo:     { type: "string", description: "Comparação de prazos, viabilidade e benchmark por empresa" },
                        risco:     { type: "string", description: "Comparação de riscos técnicos, financeiros e contratuais — qual empresa apresenta menor risco e por quê" },
                        materiais: { type: "string", description: "Comparação de padrão e especificação de materiais por empresa — impacto no custo real" },
                        escopo_cliente:               { type: "string", description: "SEÇÃO 1: Tipologia, padrão esperado, ambientes, faixa CUB/SINDUSCON aplicável, riscos do projeto" },
                        tabela_comparativa:           { type: "string", description: "SEÇÃO 2: Comparação item a item por disciplina com ✔/~/✗/? por empresa" },
                        valores_por_empresa:          { type: "string", description: "SEÇÃO 3: Valor total, R$/m², composição M.O/materiais, spread entre propostas" },
                        comparacao_mercado_detalhada: { type: "string", description: "SEÇÃO 4: Desvio % vs SINAPI-SP/SINDUSCON-SP por empresa, tipologia, fonte explícita, subdimensionamento ou sobrepreço" },
                        inclusoes_exclusoes:          { type: "string", description: "SEÇÃO 5: Itens inclusos e excluídos/não mencionados por empresa — risco de aditivo comparado" },
                        analise_materiais:            { type: "string", description: "SEÇÃO 6: Padrão de materiais por empresa — compatibilidade com padrão esperado, riscos de especificação vaga" },
                        analise_prazo:                { type: "string", description: "SEÇÃO 7: Prazo declarado por empresa — viabilidade, benchmark SECONCI-SP, risco de atraso" },
                        condicoes_pagamento:          { type: "string", description: "SEÇÃO 8: Estrutura de pagamento, risco financeiro para o cliente, alinhamento com cronograma físico" },
                        documentacao_tecnica:         { type: "string", description: "SEÇÃO 9: ART/RRT, responsável técnico, garantias (NBR 15575), segurança jurídica comparada" },
                        pontos_fortes_por_empresa:    { type: "string", description: "SEÇÃO 10: Pontos fortes específicos e técnicos por empresa — O QUÊ é forte e POR QUÊ vantagem real" },
                        pontos_atencao_por_empresa:   { type: "string", description: "SEÇÃO 11: Pontos de atenção por empresa — [problema] → [risco] → [mitigação]" },
                        riscos_detalhados:            { type: "string", description: "SEÇÃO 12: Riscos técnico, financeiro, operacional e contratual por empresa — nível (baixo/médio/alto), risco crítico e mitigações" },
                        diferenca_real:               { type: "string", description: "SEÇÃO 13: Diferença real além do preço — custo real com aditivos, valor-custo, resposta: preço ou escopo diferente?" },
                        recomendacao_final_detalhada: { type: "string", description: "SEÇÃO 14: Recomendação condicional com justificativa técnica+financeira+risco, condições de validade, pontos a negociar" },
                        proximos_passos:              { type: "string", description: "SEÇÃO 15: Ações concretas e sequenciais — documentos, negociação, proteção jurídica, formalização" },
                      },
                      required: [
                        "escopo", "preco", "prazo", "risco", "materiais",
                        "escopo_cliente", "tabela_comparativa", "valores_por_empresa",
                        "comparacao_mercado_detalhada", "inclusoes_exclusoes",
                        "analise_materiais", "analise_prazo", "condicoes_pagamento",
                        "documentacao_tecnica", "pontos_fortes_por_empresa",
                        "pontos_atencao_por_empresa", "riscos_detalhados",
                        "diferenca_real", "recomendacao_final_detalhada", "proximos_passos",
                      ],
                    },

                    empresa_recomendada_id:     { type: "string", description: "candidatura_id da empresa recomendada" },
                    justificativa_recomendacao: { type: "string", description: "Por que esta empresa é a mais adequada — técnica + financeiro + risco" },
                    recomendacao_geral:         { type: "string", description: "Síntese executiva para o cliente — o que fazer e por quê, em linguagem acessível" },
                    metodologia:                { type: "string", description: "Como o score composto foi calculado — transparência para o cliente" },

                    decisao_estrategica: {
                      type: "object",
                      description: "Leitura consultiva prática para o cliente",
                      additionalProperties: false,
                      properties: {
                        nivel_confianca:             { type: "string", enum: ["alta", "media", "baixa"], description: "alta = dados completos e diferença clara; media = dados parciais mas direção clara; baixa = empate ou dados insuficientes" },
                        recomendacao:                { type: "string", description: "Nome da empresa recomendada ou condição" },
                        tipo_recomendacao:           { type: "string", enum: ["forte", "moderada", "condicional"] },
                        justificativa:               { type: "string", description: "Texto claro e direto para o cliente entender a decisão" },
                        criterio_de_desempate:       { type: "string", description: "O que foi usado para desempatar quando scores são próximos" },
                        quando_escolher_recomendada: { type: "string", description: "Cenário em que a empresa recomendada é a melhor escolha" },
                        quando_escolher_alternativa: { type: "string", description: "Cenário em que outra empresa pode ser preferível" },
                        risco_da_decisao:            { type: "string", description: "Principal risco ao seguir esta recomendação e como mitigá-lo" },
                        proximo_passo_obrigatorio:   { type: "string", description: "Ação concreta que o cliente deve tomar agora — nunca vazio" },
                      },
                      required: [
                        "nivel_confianca", "recomendacao", "tipo_recomendacao",
                        "justificativa", "criterio_de_desempate",
                        "quando_escolher_recomendada", "quando_escolher_alternativa",
                        "risco_da_decisao", "proximo_passo_obrigatorio",
                      ],
                    },
                    // ranking ÚLTIMO — simplificado, apenas posição e justificativa profunda
                    ranking: {
                      type: "array",
                      description: "Empresas ordenadas por score_composto DESC (posicao 1 = melhor). Gerado por último.",
                      items: {
                        type: "object",
                        properties: {
                          candidatura_id:        { type: "string", description: "ID exato da candidatura — copie sem alteração" },
                          empresa:               { type: "string" },
                          posicao:               { type: "number", description: "1 = melhor" },
                          score_composto:        { type: "number", description: "0–100, score ponderado" },
                          valor_proposta:        { type: ["number", "null"], description: "Valor total em R$. null se indisponível." },
                          diferenca_mercado:     { type: ["number", "null"], description: "% vs mercado. Positivo = acima. Negativo = abaixo." },
                          justificativa_posicao: { type: "string", description: "Análise direta e profunda: por que esta empresa está nesta posição vs as outras. Compare preço real (com aditivos prováveis), escopo declarado, risco contratual e documentação. 3–4 frases densas com números e fatos concretos." },
                        },
                        required: ["candidatura_id", "empresa", "posicao", "score_composto", "justificativa_posicao"],
                      },
                    },

                  },
                  required: [
                    "analise_comparativa",
                    "empresa_recomendada_id", "justificativa_recomendacao",
                    "recomendacao_geral", "metodologia", "decisao_estrategica",
                    "ranking",
                  ],
                },
                cache_control: { type: "ephemeral" },
              },
            ],
            tool_choice: { type: "tool", name: "analise_compatibilizacao" },
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      console.timeEnd("[compat] etapa2");

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        const detalhe = `Claude API retornou HTTP ${aiResponse.status}: ${errText.slice(0, 500)}`;
        console.error("[compat] Etapa 2 falhou:", aiResponse.status, errText);
        await marcarErro(supabase, registro.id, detalhe);
        return new Response(
          JSON.stringify({ compat_id: registro.id, status: "erro", motivo: "falha_na_geracao_ia" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData  = await aiResponse.json();
      const toolUse = aiData.content?.find((c: { type: string }) => c.type === "tool_use");

      if (!toolUse?.input) {
        const detalhe = `Claude retornou sem tool_use. stop_reason=${aiData.stop_reason}. content_types=${aiData.content?.map((c: {type:string}) => c.type).join(',')}`;
        console.error("[compat] Etapa 2: sem tool_use:", JSON.stringify(aiData));
        await marcarErro(supabase, registro.id, detalhe);
        return new Response(
          JSON.stringify({ compat_id: registro.id, status: "erro", motivo: "resposta_ia_sem_estrutura" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = toolUse.input;

      // ── Salvar resultado ──────────────────────────────────────────────
      console.log("[compat] update concluida — id:", registro.id);
      const { error: updateErr } = await supabase
        .from("compatibilizacoes_analises_ia")
        .update({
          status: "concluida",
          analise_completa: {
            ranking:                    result.ranking,
            analise_comparativa:        result.analise_comparativa,
            empresa_recomendada_id:     result.empresa_recomendada_id,
            justificativa_recomendacao: result.justificativa_recomendacao,
            recomendacao_geral:         result.recomendacao_geral,
            metodologia:                result.metodologia,
            decisao_estrategica:        result.decisao_estrategica ?? null,
          },
          raw_response: JSON.stringify(aiData),
        })
        .eq("id", registro.id);

      if (updateErr) {
        const detalhe = `Erro ao salvar análise no banco após geração com sucesso: ${JSON.stringify(updateErr)}`;
        console.error("[compat] update failed — id:", registro.id, JSON.stringify(updateErr));
        await marcarErro(supabase, registro.id, detalhe);
        return new Response(
          JSON.stringify({ compat_id: registro.id, status: "erro", motivo: "falha_ao_salvar_resultado" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ compat_id: registro.id, status: "concluida" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (aiErr) {
      const detalhe = aiErr instanceof Error
        ? (aiErr.name === "AbortError"
            ? "Timeout de 110s atingido aguardando resposta da Claude API"
            : `Exceção na chamada IA: ${aiErr.message}`)
        : String(aiErr);
      console.error("[compat] Erro nas chamadas de IA:", aiErr);
      await marcarErro(supabase, registro.id, detalhe);
      return new Response(
        JSON.stringify({ compat_id: registro.id, status: "erro" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
