import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Validação pré-análise ─────────────────────────────────────────────────────
// valida    → tem valor declarado (análise completa)
// parcial   → tem PDF(s) mas sem valor declarado (IA tenta extrair com limitações)
// invalida  → sem valor declarado + apenas imagens ou sem documentos
//             Imagens sem valor → abortar: foto não contém dados financeiros extraíveis
function validarProposta(
  pdfBlocksCount: number,
  imageBlocksCount: number,
  valorTotal: number | null,
): "valida" | "parcial" | "invalida" {
  const temValor  = valorTotal != null && Number(valorTotal) > 0;
  const temPdf    = pdfBlocksCount > 0;
  const temImagem = imageBlocksCount > 0;

  if (temValor)             return "valida";   // valor declarado → análise completa
  if (temPdf)               return "parcial";  // PDF sem valor → IA tenta extrair
  if (temImagem)            return "invalida"; // só imagens, sem valor → sem dados financeiros
  return "invalida";                           // sem documentos
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidatura_id, arquivo_id } = await req.json();

    if (!candidatura_id || !arquivo_id) {
      return new Response(
        JSON.stringify({ error: "candidatura_id e arquivo_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get candidatura + orcamento data
    const { data: candidatura, error: candError } = await supabase
      .from("candidaturas_fornecedores")
      .select("*, orcamentos(*)")
      .eq("id", candidatura_id)
      .single();

    if (candError || !candidatura) {
      console.error("Candidatura not found:", candError);
      return new Response(
        JSON.stringify({ error: "Candidatura não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get arquivo data
    const { data: arquivo, error: arqError } = await supabase
      .from("propostas_arquivos")
      .select("*")
      .eq("id", arquivo_id)
      .single();

    if (arqError || !arquivo) {
      console.error("Arquivo not found:", arqError);
      return new Response(
        JSON.stringify({ error: "Arquivo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get checklist proposta if exists (for value data)
    const { data: checklistProposta } = await supabase
      .from("checklist_propostas")
      .select("*, checklist_respostas(*)")
      .eq("candidatura_id", candidatura_id)
      .maybeSingle();

    const orcamento = candidatura.orcamentos;

    // Carregar estimativa técnica do orçamento (contexto para o prompt — não é regra)
    const { data: estimativaRef } = await supabase
      .from("estimativas_tecnicas")
      .select("tipologia, faixa_min, faixa_media, faixa_alta, custo_m2_estimado, perc_mao_obra, perc_materiais, perc_gestao")
      .eq("orcamento_id", candidatura.orcamento_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create pending analysis record
    const { data: analise, error: insertError } = await supabase
      .from("propostas_analises_ia")
      .insert({
        candidatura_id,
        orcamento_id: candidatura.orcamento_id,
        fornecedor_id: candidatura.fornecedor_id,
        propostas_arquivo_id: arquivo_id,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar análise" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      await supabase
        .from("propostas_analises_ia")
        .update({ status: "failed" })
        .eq("id", analise.id);

      return new Response(
        JSON.stringify({ analise_id: analise.id, status: "failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHECKPOINT 1: verificar se arquivo ainda existe antes de processar ────
    const { data: arquivoCheck1 } = await supabase
      .from("propostas_arquivos")
      .select("id")
      .eq("id", arquivo_id)
      .maybeSingle();

    if (!arquivoCheck1) {
      console.log("[analisar-proposta] Análise abortada — proposta removida (checkpoint 1)");
      await supabase
        .from("propostas_analises_ia")
        .update({ status: "cancelada", raw_response: "Análise abortada — proposta removida" })
        .eq("id", analise.id);
      return new Response(
        JSON.stringify({ analise_id: analise.id, status: "cancelada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Buscar TODOS os arquivos da candidatura ───────────────────────────────
    const { data: todosArquivos, error: arquivosErr } = await supabase
      .from("propostas_arquivos")
      .select("id, nome_arquivo, tipo_arquivo, caminho_storage, tamanho")
      .eq("candidatura_id", candidatura_id)
      .order("created_at", { ascending: true });

    if (arquivosErr) {
      console.warn("[analisar-proposta] Erro ao buscar todos os arquivos, usando apenas o arquivo_id original:", arquivosErr);
    }

    const listaArquivos = (todosArquivos && todosArquivos.length > 0)
      ? todosArquivos
      : [arquivo]; // fallback: pelo menos o arquivo que disparou a análise

    console.log(`[analisar-proposta] Total de arquivos encontrados para candidatura: ${listaArquivos.length}`);

    const TAMANHO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    const arquivosIgnorados: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentBlocks: any[] = [];
    let pdfBlocksCount   = 0;
    let imageBlocksCount = 0;

    for (const arq of listaArquivos) {
      const isPdf   = arq.tipo_arquivo?.includes("pdf");
      const isImage = arq.tipo_arquivo?.includes("image");

      if (!isPdf && !isImage) {
        console.log(`[analisar-proposta] Ignorando arquivo (tipo não suportado): ${arq.nome_arquivo} (${arq.tipo_arquivo})`);
        continue;
      }

      if (arq.tamanho && arq.tamanho > TAMANHO_MAX_BYTES) {
        const mb = (arq.tamanho / 1024 / 1024).toFixed(1);
        console.warn(`[analisar-proposta] Arquivo ignorado (${mb}MB > 10MB): ${arq.nome_arquivo}`);
        arquivosIgnorados.push(`${arq.nome_arquivo} (${mb}MB)`);
        continue;
      }

      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("propostas-fornecedores")
          .download(arq.caminho_storage);

        if (downloadError || !fileData) {
          console.warn(`[analisar-proposta] Falha no download de ${arq.nome_arquivo}:`, downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array  = new Uint8Array(arrayBuffer);

        // Verificação de tamanho real (fallback caso tamanho no banco esteja desatualizado)
        if (uint8Array.byteLength > TAMANHO_MAX_BYTES) {
          const mb = (uint8Array.byteLength / 1024 / 1024).toFixed(1);
          console.warn(`[analisar-proposta] Arquivo ignorado por tamanho real (${mb}MB): ${arq.nome_arquivo}`);
          arquivosIgnorados.push(`${arq.nome_arquivo} (${mb}MB — tamanho real)`);
          continue;
        }

        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        if (isPdf) {
          documentBlocks.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          });
          pdfBlocksCount++;
          console.log(`[analisar-proposta] PDF adicionado: ${arq.nome_arquivo} (${(uint8Array.byteLength / 1024).toFixed(0)}KB)`);
        } else {
          const mediaType = arq.tipo_arquivo.includes("png") ? "image/png" : "image/jpeg";
          documentBlocks.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          });
          imageBlocksCount++;
          console.log(`[analisar-proposta] Imagem adicionada: ${arq.nome_arquivo} (${(uint8Array.byteLength / 1024).toFixed(0)}KB)`);
        }
      } catch (e) {
        console.warn(`[analisar-proposta] Erro ao processar ${arq.nome_arquivo}:`, e);
      }
    }

    console.log(`[analisar-proposta] Resumo: ${documentBlocks.length} arquivo(s) enviados para IA | ${arquivosIgnorados.length} ignorado(s)`);
    if (arquivosIgnorados.length > 0) {
      console.log(`[analisar-proposta] Ignorados: ${arquivosIgnorados.join(", ")}`);
    }

    // ── CHECKPOINT 2: re-verificar após downloads, antes de chamar IA ────────
    const { data: arquivoCheck2 } = await supabase
      .from("propostas_arquivos")
      .select("id")
      .eq("id", arquivo_id)
      .maybeSingle();

    if (!arquivoCheck2) {
      console.log("[analisar-proposta] Análise abortada — proposta removida (checkpoint 2, durante downloads)");
      await supabase
        .from("propostas_analises_ia")
        .update({ status: "cancelada", raw_response: "Análise abortada — proposta removida durante processamento" })
        .eq("id", analise.id);
      return new Response(
        JSON.stringify({ analise_id: analise.id, status: "cancelada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Checklist estruturado (sempre injetado antes dos documentos) ──────────
    const valorTotal = checklistProposta?.valor_total_estimado || null;
    const metragem = orcamento?.tamanho_imovel ? String(orcamento.tamanho_imovel) : "Não informado";
    const categorias = orcamento?.categoria || orcamento?.categorias_servico || "Não especificada";

    const checklistRespostas = (checklistProposta?.checklist_respostas as Array<{
      pergunta?: string; resposta?: string; campo?: string; valor?: string;
    }> | null) ?? [];

    const statusProposta = validarProposta(
      pdfBlocksCount,
      imageBlocksCount,
      valorTotal ? Number(valorTotal) : null,
    );

    if (statusProposta === "invalida") {
      console.log(`[analisar-proposta] Proposta inválida — PDFs: ${pdfBlocksCount}, imagens: ${imageBlocksCount}, valor: ${valorTotal ?? "nenhum"}`);
      const { error: invalidErr } = await supabase
        .from("propostas_analises_ia")
        .update({
          status: "invalid",
          qualidade_leitura: "proposta_incompleta",
          raw_response: "Proposta sem valor total. Solicitar reenvio estruturado.",
        })
        .eq("id", analise.id);
      if (invalidErr) console.error("[analisar-proposta] Erro ao salvar status invalid:", invalidErr);
      return new Response(
        JSON.stringify({
          status:                    "invalida",
          qualidade_leitura:         "proposta_incompleta",
          bloquear_compatibilizacao: true,
          mensagem:                  "Proposta sem valor total. Solicitar reenvio estruturado.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avisoParcial = statusProposta === "parcial"
      ? "\n⚠️ ANÁLISE LIMITADA: Os dados disponíveis são insuficientes para análise completa. NÃO assuma valores como reais — indique as limitações explicitamente nos campos de risco e pontos de atenção.\n"
      : "";

    const blocoChecklist = `━━━ DADOS ESTRUTURADOS DECLARADOS PELO FORNECEDOR ━━━
Estes dados foram declarados diretamente pelo fornecedor no sistema.
Use-os como âncora prioritária — mesmo que o documento mostre algo diferente, registre a divergência.

- Valor total estimado: ${valorTotal ? `R$ ${Number(valorTotal).toLocaleString("pt-BR")}` : "Não declarado"}
- Empresa: ${candidatura.empresa}
- Responsável: ${candidatura.nome}
${checklistRespostas.length > 0
  ? checklistRespostas
      .map((r) => `- ${r.pergunta ?? r.campo ?? "Campo"}: ${r.resposta ?? r.valor ?? "—"}`)
      .join("\n")
  : "- (Checklist não preenchido pelo fornecedor)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const avisoArquivosIgnorados = arquivosIgnorados.length > 0
      ? `\nAVISO: ${arquivosIgnorados.length} arquivo(s) não foram analisados por excederem 10MB: ${arquivosIgnorados.join(", ")}. Analise com os documentos disponíveis.\n`
      : "";

    const prompt = `Você é um consultor técnico sênior especializado em reformas e projetos residenciais/comerciais no Brasil, com profundo domínio de CUB-SP, SINAPI, SINDUSCON-SP, AECWeb e práticas contratuais do setor.${avisoParcial}

━━━ FOCO DESTA ANÁLISE ━━━

Esta é uma análise INDIVIDUAL da proposta de um único fornecedor.
O objetivo NÃO é escolher vencedor — é mostrar ao fornecedor:
• como sua proposta está em relação ao mercado
• onde está forte e onde está fraca
• o que precisa melhorar para ser mais competitiva
• quais riscos o cliente ou consultor enxergariam nesta proposta

O resultado deve funcionar como um mini-laudo técnico de melhoria, não como um resumo.

━━━ REGRA DE PROFUNDIDADE REAL (OBRIGATÓRIA) ━━━

A análise deve ser interpretativa, não descritiva.

PROIBIDO:
- repetir o texto da proposta sem análise
- listar itens sem explicar impacto na obra ou no cliente
- usar frases genéricas sem consequência prática ("proposta adequada", "escopo coerente")
- avaliar apenas preço sem considerar escopo, risco e documentação
- ignorar ausência de informação — toda lacuna deve ser nomeada e classificada

OBRIGATÓRIO — para cada conclusão, responder:
→ por que isso importa para a obra?
→ qual impacto financeiro ou técnico?
→ qual risco para o cliente ou para o fornecedor?
→ como o fornecedor pode corrigir ou melhorar?

Exemplo ERRADO:
"Escopo incompleto."

Exemplo CORRETO:
"Escopo incompleto — a ausência de detalhamento de elétrica e hidráulica enfraquece a previsibilidade da proposta, aumenta o risco de aditivos e deve ser corrigida com uma tabela itemizada por ambiente, incluindo materiais, mão de obra e responsabilidades por item."

Toda observação deve ajudar o fornecedor a melhorar a proposta concretamente.

━━━ SCORE — CONDIÇÕES DE REDUÇÃO OBRIGATÓRIA ━━━

O score deve cair automaticamente quando houver:
• baixa transparência (campo transparencia_proposta = "baixa") → -20 pts máximo
• ausência de ART/RRT quando escopo exige (elétrica, hidráulica, estrutural) → -15 pts máximo
• falta de composição M.O/material → -10 pts máximo
• ausência de prazo declarado → -5 pts máximo
• ausência de garantia formal → -5 pts máximo
• escopo não itemizado (sem lista de serviços) → -15 pts máximo
• preço >20% abaixo do mercado sem justificativa de escopo reduzido → -10 pts máximo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 0 — LEITURA DOS DOCUMENTOS (OBRIGATÓRIO ANTES DE TUDO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de qualquer análise, classifique cada documento recebido:

TIPO A — DADOS TÉCNICOS (usar integralmente na análise)
• Planilha orçamentária (tabela de itens com valores)
• Memória de cálculo ou composição de custos
• Contrato ou proposta comercial com valores e escopo
• Lista de serviços com quantitativos
• Cronograma físico-financeiro

TIPO B — CONTEXTO DA EMPRESA (usar apenas como complemento qualitativo)
• Apresentação institucional / portfólio / sobre a empresa
• Fotos de obras anteriores
• Certificações, laudos, depoimentos
• Material de marketing sem valores ou escopo

REGRA: Extraia dados técnicos (valores, escopo, prazo, pagamento) SOMENTE de documentos TIPO A.
Documentos TIPO B informam sobre o perfil da empresa — NÃO contêm dados para análise financeira.
Se misturar os dois tipos, a análise ficará errada.

Se algum documento for imagem, foto, scan ou PDF baseado em imagem (sem texto selecionável):
1. Descreva brevemente o que vê: layout, títulos visíveis, estrutura de tabelas, valores aparentes
2. Classifique como TIPO A ou TIPO B com base nessa descrição
3. Extraia os dados estruturados com o máximo de inferência visual possível
NÃO declare "não consigo extrair" — tente sempre.
${avisoArquivosIgnorados}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 1 — EXTRAÇÃO DE VALORES (CRÍTICO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identifique e separe os seguintes valores nos documentos TIPO A:

1. VALOR PRINCIPAL DA OBRA
   • Procure por: "valor total", "total da obra", "total geral", "valor do contrato"
   • Registre exatamente como está no documento
   • NÃO some com complementos sem certeza explícita

2. SEPARAÇÃO M.O × MATERIAIS
   • Se a proposta separar mão de obra de materiais, registre cada um
   • Se não separar, registre como "não separado" — NÃO invente a divisão
   • Proporção típica de mercado (apenas para referência): M.O 40–55%, Materiais 45–60%

3. ITENS COMPLEMENTARES (NÃO fazem parte da obra principal)
   • Exemplos: marcenaria, ar condicionado, automação, paisagismo, móveis, equipamentos
   • Liste cada item separadamente com seu valor quando disponível
   • Marque explicitamente como "item adicional — fora do escopo principal"
   • NUNCA some automaticamente ao valor principal sem instrução clara no documento

4. REGRA DE OURO PARA VALORES MÚLTIPLOS
   Se o documento apresentar um valor principal + valores complementares separados:
   → Mantenha-os separados
   → Informe os dois na análise
   → NÃO infira total geral sem que o documento declare explicitamente
   → Se houver dúvida sobre o que compõe o total: registre a dúvida na análise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DO PROJETO E FORNECEDOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Cliente: ${orcamento?.nome_contato || "Não informado"}
- Localização: ${orcamento?.local || "Não informado"}
- Metragem do imóvel (dado oficial do sistema): ${metragem !== "Não informado" ? `${metragem} m²` : "Não informado"}
- Necessidade: ${orcamento?.necessidade || "Reforma residencial"}
- Serviços solicitados: ${typeof categorias === 'object' ? JSON.stringify(categorias) : categorias}
- Descrição: ${orcamento?.descricao || "Não informada"}
- Prazo desejado: ${orcamento?.prazo_inicio || "Não informado"}
- Empresa: ${candidatura.empresa}
- Responsável: ${candidatura.nome}
- Documentos recebidos: ${documentBlocks.length} arquivo(s)
${documentBlocks.length > 0
  ? "→ LEIA todos os documentos. Extraia valores e escopo dos documentos TIPO A. NÃO estime se o valor estiver legível em qualquer arquivo."
  : valorTotal
    ? `→ Valor declarado pelo fornecedor no sistema: R$ ${Number(valorTotal).toLocaleString("pt-BR")} — use como referência principal`
    : "→ Nenhum arquivo ou valor declarado disponível — estime com base no escopo descrito e metragem."}

${estimativaRef ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERÊNCIA DE MERCADO — ESTIMATIVA REFORMA100 (CONTEXTO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estimativa técnica gerada pela plataforma para este projeto (use como benchmark — NÃO é regra de decisão):
- Tipologia identificada: ${estimativaRef.tipologia ?? "não informada"}
- Faixa mínima: R$ ${estimativaRef.faixa_min ? Number(estimativaRef.faixa_min).toLocaleString("pt-BR") : "N/A"}
- Faixa média:  R$ ${estimativaRef.faixa_media ? Number(estimativaRef.faixa_media).toLocaleString("pt-BR") : "N/A"}
- Faixa alta:   R$ ${estimativaRef.faixa_alta ? Number(estimativaRef.faixa_alta).toLocaleString("pt-BR") : "N/A"}${estimativaRef.custo_m2_estimado ? `\n- Custo/m² referência: R$ ${Number(estimativaRef.custo_m2_estimado).toLocaleString("pt-BR")}/m²` : ""}
- Composição estimada: M.O ${estimativaRef.perc_mao_obra ?? "?"}% | Materiais ${estimativaRef.perc_materiais ?? "?"}% | Gestão ${estimativaRef.perc_gestao ?? "?"}%

Considerando que a estimativa de mercado para este projeto é de R$ ${estimativaRef.faixa_media ? Number(estimativaRef.faixa_media).toLocaleString("pt-BR") : "N/A"} (faixa média), use esse benchmark como referência adicional ao analisar o posicionamento de preço desta proposta. Esta é uma estimativa de contexto — não determina sozinha se a proposta é boa ou ruim.
` : ""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 0 — CLASSIFICAÇÃO DA PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identifique o tipo ANTES de qualquer análise:

• projeto_arquitetonico — plantas, layouts, 3D, detalhamento técnico; SEM execução
• execucao_obra — serviços de obra (demolição, elétrica, hidráulica, acabamentos, M.O e/ou materiais); SEM projeto
• proposta_completa — projeto + execução combinados

Justifique em 1 frase objetiva.
Esta classificação define o modelo de análise — NÃO trate todas as propostas da mesma forma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 0B — COMPATIBILIDADE COM O ORÇAMENTO PRINCIPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avalie se esta proposta é compatível com o orçamento principal descrito acima.

Preencha os campos:
• compatibilidade_escopo: "compativel" | "parcial" | "incompativel"
• motivo_incompatibilidade: descrição objetiva APENAS quando parcial ou incompativel — null se compatível

Critérios:
• "compativel" — A proposta atende ao mesmo tipo de serviço do orçamento (execução = execução; projeto = projeto). Localização consistente.
• "parcial" — Cobre apenas parte do escopo solicitado (ex: só elétrica quando o orçamento pede reforma completa). Tipo de serviço compatível mas escopo reduzido.
• "incompativel" — Claramente outro tipo de serviço (ex: projeto arquitetônico quando o orçamento pede execução de obra); ou proposta endereçada a outro cliente/obra com dados conflitantes (endereço, nome do cliente, tipologia de imóvel).

REGRAS:
→ NÃO marcar incompatível por diferença de preço, qualidade ou empresa desconhecida
→ NÃO marcar incompatível se o tipo de serviço for compatível mas o escopo for menor — use "parcial"
→ Se a proposta mencionar endereço, nome de cliente ou imóvel claramente diferente do orçamento: marcar incompatível
→ Em caso de dúvida entre "parcial" e "incompatível": prefira "parcial"
→ Projeto arquitetônico de interiores NÃO é compatível com orçamento de execução de obra (são etapas distintas que não se substituem)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 1 — EXTRAÇÃO E ANÁLISE DO ESCOPO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Liste todos os serviços declarados na proposta, agrupados por disciplina:
   • Civil / Estrutural (demolição, alvenaria, contrapiso, laje)
   • Elétrica (quadro, pontos, iluminação, SPDA)
   • Hidráulica / Sanitária (tubulações, louças, metais)
   • Revestimentos (piso, parede, forro, soleiras)
   • Esquadrias (portas, janelas, vidros)
   • Pintura (interna, externa, texturas)
   • Instalações especiais (ar condicionado, automação, câmeras)
   • Marcenaria / Mobiliário (quando incluso)
   • Outros

2. Para cada disciplina: marque se está INCLUSO, EXCLUÍDO ou NÃO MENCIONADO
3. Identifique termos vagos: "conforme necessário", "a definir", "dependendo do local"
4. Avalie:
   • Clareza técnica (objetiva / vaga / genérica)
   • Nível de detalhamento (baixo / médio / alto)
   • Separação M.O × materiais (sim / não / parcial)
   • Definição de responsabilidades (quem fornece o quê)

Se projeto arquitetônico: verifique entregáveis (plantas, cortes, 3D, memorial), revisões, compatibilização

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 2 — ANÁLISE DE PREÇO (MERCADO REAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use SOMENTE o valor principal da obra para comparação com mercado.
Itens complementares (marcenaria, ar condicionado, etc.) devem ser isolados ANTES do cálculo de R$/m².

Faixas de referência SP 2026:

| Tipologia             | Faixa R$/m²       | Quando usar                                    |
|-----------------------|-------------------|------------------------------------------------|
| Reforma leve          | R$ 450–700/m²     | Piso + pintura + elétrica simples              |
| Reforma média         | R$ 650–950/m²     | Revestimentos + elétrica completa + gestão     |
| Reforma completa      | R$ 1.200–1.800/m² | Instalações completas (CUB × 65–75%)          |
| Alto padrão completo  | R$ 1.800–2.600/m² | Premium com projetos (CUB × 85%+)             |

Regras obrigatórias:
• Identifique a tipologia ANTES de calcular
• Use CUB-SP R8-N APENAS para retrofit ou reforma total completa
• Isole itens especiais antes de calcular R$/m²
• Classifique: abaixo_mercado | dentro_mercado | acima_mercado
• Fontes: SINDUSCON-SP | SINAPI-SP | SECONCI-SP | AECWeb | Andora | Chronoshare

REGRA — COMPARAÇÃO DE MERCADO E USO DA METRAGEM
O campo "Metragem do imóvel (dado oficial do sistema)" acima vem diretamente do cadastro do orçamento (campo tamanho_imovel). É dado oficial — não é estimativa, não é inferência do documento.
→ Se o valor for um número (ex: "80 m²"): USE como base para calcular R$/m² e comparação percentual. NÃO declare "metragem não informada" quando este campo estiver preenchido.
→ Só omita a comparação percentual se o campo estiver literalmente como "Não informado" E a proposta também não contiver quantitativos confiáveis.
→ Quando não for possível comparar: use "Comparação percentual indisponível — metragem não cadastrada." Você PODE apresentar faixas de referência absolutas sem afirmar percentual.

REGRA — INTERPRETAÇÃO DE PREÇO COM ESCOPO REDUZIDO
Antes de classificar o preço como baixo, risco ou suspeito:
→ Verifique se itens relevantes estão explicitamente excluídos (marcenaria, acabamentos fornecidos pelo cliente, automação, sacada, mobiliário, etc.)
→ Se itens de alto valor estiverem fora do escopo: use exatamente "abaixo da média de mercado para o escopo declarado" — NÃO use apenas "abaixo da média" sem qualificar o escopo
→ Reserve "risco de subdimensionamento" para quando o preço é baixo E o escopo é completo E não há justificativa técnica
→ NUNCA usar "preço competitivo" como frase isolada — substituir por análise contextual, ex: "valor posicionado abaixo da média de mercado para o escopo contratado, considerando que [listar exclusões relevantes]"

REGRA — IMPACTO DE EXCLUSÕES NA CONCLUSÃO
Se materiais de acabamento, marcenaria ou itens relevantes estiverem excluídos do contrato:
→ Incluir obrigatoriamente na conclusão (pontos de atenção ou recomendação final):
"O custo total da reforma para o cliente será significativamente superior ao valor contratado — materiais de acabamento, [listar itens excluídos] precisam ser contratados separadamente ou fornecidos pelo cliente."
→ NÃO omitir esse aviso na conclusão quando houver exclusões relevantes
→ NÃO sugerir risco de subdimensionamento como substituto — são alertas diferentes

REGRA — COMPOSIÇÃO M.O × MATERIAIS COM ESCOPO PARCIAL
Se materiais de acabamento ou fornecimento estiverem excluídos do contrato:
→ NÃO comparar a proporção M.O/materiais com o padrão de mercado (55–60% M.O / 40–45% materiais)
→ A proporção esperada muda radicalmente quando o cliente fornece os materiais
→ Indique: "Composição parcial — materiais de acabamento não contemplados na proposta. Proporção M.O/materiais reflete apenas o escopo contratado."

REGRA — BDI / GESTÃO AUSENTE (ALERTA INTERNO)
Se BDI = 0 ou não informado:
→ NÃO bloquear a proposta nem impedir compatibilização
→ NÃO penalizar o score por este motivo isolado
→ NÃO classificar risco_financeiro como alto apenas por ausência de BDI
→ Adicione nos pontos de atenção apenas esta nota interna para o consultor:
"BDI/gestão não declarado — confirmar com fornecedor se margem, administração de obra e imprevistos estão incluídos no valor total."
→ Esta informação é interna. NÃO incluir no resumo de risco nem em campos exibidos ao cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 3 — ANÁLISE DE RISCO (com causa, impacto e probabilidade)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para cada dimensão de risco, preencha o campo com:
  Nível: [baixo / médio / alto]
  Causa: o que gera esse risco nesta proposta específica
  Impacto: o que acontece se o risco se concretizar
  Probabilidade: [baixa / média / alta]

• risco_tecnico
  Avaliar: escopo incompleto, especificações vagas, disciplinas ausentes, itens "a definir"
  ALTO se: falta especificação de mais de 2 disciplinas relevantes, ou há termos vagos em itens críticos

• risco_financeiro
  Avaliar: aditivo provável, subdimensionamento de M.O/materiais, BDI ausente, preço abaixo do mercado sem justificativa
  ALTO se: preço >20% abaixo do mercado sem exclusões que justifiquem, ou itens críticos sem valor declarado

• risco_operacional
  Avaliar: prazo irreal para o escopo, ausência de cronograma por etapa, metodologia não declarada, equipe não identificada
  Se escopo multidisciplinar (3+ disciplinas): avaliar se prazo é viável — se não → probabilidade alta de atraso

• risco_contratual
  Avaliar: ausência de ART/RRT (obrigatória por CREA-SP para obras com elétrica/hidráulica/estrutural), responsável técnico não identificado, ausência de garantias formais, pagamento desalinhado com execução
  DOCUMENTAÇÃO OBRIGATÓRIA (validar via CREA-SP):
  - ART ausente em obra com elétrica/hidráulica/estrutural → risco_contratual = ALTO automaticamente
  - Responsável técnico não identificado → adicionar em pontos de atenção
  - Garantias declaradas (NBR 15575: 5 anos estrutural, 2 anos instalações) → reduz nível de risco_contratual
  - Seguro de obra: ausente → incluir alerta

Determine o nivel_risco_geral considerando o risco mais crítico entre as quatro dimensões.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 4 — COMPETITIVIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Onde a proposta perde competitividade
• Onde se destaca
• Qualidade da apresentação (clareza, organização, profissionalismo)
• Melhorias comerciais objetivas para o fornecedor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 5 — ANÁLISE ESPECÍFICA POR TIPO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

projeto_arquitetonico → entregáveis (plantas, cortes, 3D, memorial), nº revisões, compatibilização técnica, clareza projetual
execucao_obra → cobertura por especialidade (✔/✗/?), materiais especificados (padrão/fabricante), cronograma por etapa, metodologia de execução
proposta_completa → coerência projeto × execução, qualidade do projeto incluso, risco de conflito entre etapas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 6 — TRANSPARÊNCIA DA PROPOSTA (→ campo transparencia_proposta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Classifique com base em:
• Clareza e completude do escopo declarado (itens listados, quantificados, especificados)
• Separação e detalhamento de M.O vs materiais
• Identificação do responsável técnico
• Clareza das condições comerciais (prazo, pagamento, garantias)
• Ausência de termos vagos ou genéricos em itens relevantes

Critérios:
• "alta"  → escopo detalhado + M.O/materiais separados + responsável identificado + condições claras
• "media" → escopo parcialmente detalhado, alguns itens vagos, M.O/materiais não totalmente separados
• "baixa" → escopo genérico, vago ou incompleto; sem separação de custos; responsável não identificado

Se transparencia = "baixa" → registrar obrigatoriamente em pontos de atenção:
"Proposta com baixa transparência — risco contratual elevado. Solicitar detalhamento antes de qualquer avanço."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 7 — CLASSIFICAÇÃO DO FORNECEDOR (→ campo classificacao_fornecedor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Classifique com base no perfil combinado de preço, risco e escopo:

• "economico"   → preço abaixo do mercado + risco técnico/contratual mais elevado + escopo enxuto ou vago
  Perfil: proposta competitiva em custo mas que demanda atenção técnica e maior acompanhamento de obra

• "equilibrado" → preço dentro do mercado + risco médio/baixo + escopo adequado ao projeto
  Perfil: melhor custo-benefício; ponto de partida recomendado para negociação

• "premium"     → preço acima do mercado + risco baixo + escopo detalhado + documentação completa
  Perfil: alto custo com alto nível de controle e segurança contratual; justificado quando projeto exige

Regras:
→ NÃO classificar como "premium" apenas por preço alto sem documentação e escopo correspondentes
→ NÃO classificar como "economico" apenas por preço baixo — verificar se escopo é reduzido intencionalmente
→ A classificação deve refletir o perfil REAL da proposta, não o desejo do fornecedor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 8 — VALIDAÇÃO DE REFERÊNCIAS OBRIGATÓRIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de fechar a análise, confirme que você:
• Usou SINAPI-SP para validar custo unitário de pelo menos 1 categoria de serviço
• Usou SINDUSCON-SP/CUB para calcular a faixa de referência R$/m² para a tipologia identificada
• Apresentou faixa de referência NUMÉRICA (ex: "R$ 650–950/m² para reforma média — SINDUSCON-SP")
• Cruzou o valor da proposta com essa faixa e indicou % de desvio
• Verificou responsabilidade técnica via CREA-SP (ART/RRT presente ou ausente)

PROIBIDO nas conclusões e análise:
→ "dentro do mercado" sem apresentar faixa numérica de referência e fonte
→ "preço competitivo" sem comparação percentual explícita
→ análise de preço sem identificar tipologia ANTES da comparação
→ ignorar discrepâncias >15% entre proposta e mercado sem explicação

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORE FINAL (0–100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDAÇÃO OBRIGATÓRIA — o score só pode ser gerado se houver:
• Escopo analisado (itens identificados e classificados ✔/✗/?)
• Preço analisado (valor declarado e comparado com SINAPI/SINDUSCON com faixa numérica)
• Risco analisado (pelo menos 3 dimensões com causa, impacto e probabilidade)
Se qualquer um faltar → reduzir score proporcionalmente ao que está incompleto.
proposta_incompleta → score máximo = 40.

Composição do score:
• Completude e clareza do escopo: 30 pontos
• Competitividade e coerência de preço: 25 pontos
• Clareza técnica e apresentação: 25 pontos
• Nível de risco geral (inverso): 20 pontos

REGRA — SCORE COM ESCOPO REDUZIDO
Quando itens relevantes estão explicitamente excluídos do contrato (materiais fornecidos pelo cliente, marcenaria, automação):
→ NÃO penalize completude por ausência desses itens — eles foram excluídos intencionalmente
→ Avalie completude DENTRO do escopo declarado: os serviços contratados estão bem definidos?
→ Penalize apenas quando o escopo contratado em si estiver vago, incompleto ou inconsistente

Score < 50: proposta crítica — requer revisão antes de qualquer avanço
Score 50–74: adequada com melhorias obrigatórias recomendadas
Score 75–89: boa — refinamentos pontuais sugeridos
Score 90–100: excelente — escopo completo, preço coerente e baixo risco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALIDADE DE LEITURA — CAMPO OBRIGATÓRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avalie a qualidade do conteúdo extraído e preencha o campo "qualidade_leitura":

• "completa"
  → Identificou claramente: valor total + composição de custos (M.O/materiais) + escopo estruturado
  → Análise confiável; continue normalmente.

• "parcial"
  → Identificou pelo menos 1 dos 3 critérios acima com limitações (ex: PDF escaneado, escopo vago)
  → Analise com o que está disponível e registre as limitações no campo de risco.

• "proposta_incompleta"
  → NÃO identificou nenhum ou apenas 1 dos critérios:
    - sem valor total legível
    - sem composição de custos (M.O/materiais)
    - sem escopo estruturado (lista de serviços)
  → USE quando: arquivo é portfólio/institucional, imagem sem texto, planilha corrompida ou vazia
  → Impacto OBRIGATÓRIO quando proposta_incompleta:
    - score deve ser ≤ 40 (confiabilidade baixíssima)
    - nivel_risco = "alto"
    - recomendacoes deve incluir: "Reenvie a proposta em formato estruturado com valor total, escopo e separação de mão de obra e materiais"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONCLUSÃO — CAMPO recomendacao_final
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O campo recomendacao_final deve conter DOIS blocos distintos, separados por linha em branco:

BLOCO 1 — ANÁLISE TÉCNICA
Síntese objetiva dos achados: o que foi identificado no escopo, preço e risco.
Sem sugerir ação. Apenas fatos e avaliação técnica imparcial.
Exemplo: "A proposta cobre os principais serviços de reforma com nível médio de detalhamento. O valor está dentro da faixa de mercado para o escopo declarado. Ausência de cronograma e separação parcial de M.O/materiais limitam a análise contratual."

BLOCO 2 — RECOMENDAÇÃO ESTRATÉGICA
Com base na análise acima, qual ação concreta o consultor deve considerar.
Deve ser explícito e orientado para decisão: avançar, negociar, solicitar revisão, rejeitar, ou aguardar complementação.
Exemplo: "Recomenda-se solicitar cronograma físico por etapa e detalhamento de M.O × materiais antes de assinar. O preço comporta negociação de prazo sem risco de desistência."

REGRAS:
→ NÃO misturar os dois blocos em um único parágrafo
→ NÃO iniciar o bloco 2 com justificativa técnica — isso pertence ao bloco 1
→ NÃO usar expressões genéricas como "proposta adequada" sem qualificação contextual

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUÇÕES FINAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Análise INDIVIDUAL — NÃO compare com outras empresas, NÃO gere ranking
• Seja técnico, objetivo e útil
• Para cada categoria de preço, compare com referências SINAPI quando possível
• Badge de mercado por categoria: verde (≤+10%), ambar (+10–20%), vermelho (>+20%)
• Esta análise é exclusiva para o fornecedor — NÃO exibir ao cliente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRA ABSOLUTA — CAMPO valor_proposta
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O campo valor_proposta SÓ pode ser preenchido com valor EXPLÍCITO e DECLARADO:
• Valor escrito pelo fornecedor no documento enviado (planilha, contrato, proposta), OU
• Valor declarado pelo fornecedor no checklist estruturado do sistema

SE NÃO EXISTIR VALOR TOTAL EXPLÍCITO EM NENHUMA DESSAS FONTES:
→ valor_proposta DEVE ser null (obrigatório — sem exceções)
→ NÃO estimar valor com base em escopo
→ NÃO inferir valor a partir de itens parciais
→ NÃO calcular valor_proposta usando médias de mercado
→ NÃO usar estimativa de referência (CUB, SINAPI, faixas) como valor_proposta
→ NÃO preencher valor_proposta com qualquer número que não esteja literalmente no documento ou no checklist

Você PODE: descrever o escopo encontrado, calcular referências de mercado e preencher todos os demais campos.
Você NÃO PODE: inventar, estimar ou inferir valor_proposta. Se não há valor explícito, valor_proposta = null.`;

    try {
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey!,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 12000,
          system: [{ type: "text", text: `━━━ PAPEL DA IA ━━━

Você deve atuar como um consultor técnico sênior da Reforma100, especializado em análise de propostas de reforma e construção no Brasil.

Seu objetivo é avaliar uma única proposta com profundidade técnica, identificar riscos reais e posicionar o fornecedor em relação ao mercado.

---

━━━ DIRETRIZES CRÍTICAS ━━━

PROIBIDO:

- Resumir a proposta sem análise técnica
- Usar linguagem genérica ("bom", "adequado", "coerente") sem justificativa
- Ignorar ausência de informação
- Inventar dados não presentes na proposta
- Avaliar apenas preço sem considerar escopo
- Assumir que escopo está completo

---

━━━ TRATAMENTO DE DADOS INCOMPLETOS ━━━

• NÃO assumir informações ausentes
• NÃO inferir valores, prazos ou escopos não descritos

Classificar cada item como:

✔ Declarado claramente
~ Declarado de forma vaga
✗ Explicitamente não incluso
? Não mencionado (RISCO DE ADITIVO)

• Itens "?" representam:
  → risco técnico
  → risco financeiro
  → risco contratual

• Quanto mais "?" a proposta tiver:
  → maior o risco de aditivo
  → menor previsibilidade de custo
  → menor transparência

---

━━━ ANÁLISE OBRIGATÓRIA ━━━

1. COMPOSIÇÃO DE CUSTO

Separar, sempre que possível:

• Mão de obra
• Materiais
• Gestão / BDI

Se não estiver claro:
→ classificar como BAIXA TRANSPARÊNCIA

---

2. CÁLCULO DE R$/m²

• Calcular obrigatoriamente
• Classificar:

- abaixo do mercado
- dentro do mercado
- acima do mercado

---

3. ANÁLISE DE ESCOPO

Listar:

✔ Itens incluídos
✗ Itens não incluídos
? Itens não mencionados

→ Identificar risco de aditivo

---

4. ANÁLISE DE RISCO

Avaliar separadamente:

• risco técnico
• risco financeiro
• risco contratual
• risco operacional

Para cada:

→ causa
→ impacto
→ probabilidade

---

5. DOCUMENTAÇÃO TÉCNICA

Verificar:

• ART/RRT
• responsável técnico
• garantia

Se ausente:
→ classificar como ALTO RISCO

---

6. TRANSPARÊNCIA DA PROPOSTA

Classificar:

• alta
• média
• baixa

Base:

→ nível de detalhamento
→ clareza de escopo
→ separação de custos

---

7. CLASSIFICAÇÃO DO FORNECEDOR

Classificar como:

• econômico (baixo custo, maior risco)
• equilibrado (melhor custo-benefício)
• premium (maior controle e previsibilidade)

---

8. POSICIONAMENTO DE MERCADO

Comparar a proposta com mercado atual e explicar:

• se está abaixo
• dentro
• acima

E por quê:

→ preço
→ escopo
→ material
→ risco

---

9. SCORE TÉCNICO

O score só pode ser gerado se houver:

• análise de escopo
• análise de preço
• análise de risco

Caso contrário:
→ reduzir score automaticamente

---

━━━ USO OBRIGATÓRIO DE REFERÊNCIAS ━━━

A análise deve obrigatoriamente utilizar, cruzar e interpretar dados das seguintes fontes:

• SINAPI-SP → custos unitários de serviços e coerência por item
• SINDUSCON-SP → custo médio por m² por padrão construtivo
• CREA-SP → responsabilidade técnica, ART/RRT e exigências legais
• SECONCI-SP → parâmetros de execução e práticas de obra
• AECWeb → especificações técnicas e materiais
• Andora / Chronoshare → benchmark de mercado real
• Catálogos de fornecedores nacionais → validação de materiais

---

REGRAS DE USO:

• NÃO apenas citar — interpretar
• SEMPRE cruzar proposta vs mercado
• SEMPRE apresentar faixa de referência

---

PROIBIDO:

• Dizer "dentro do mercado" sem número
• Fazer análise sem referência
• Ignorar discrepâncias

---

OBRIGATÓRIO:

• Apresentar faixa de preço
• Comparação percentual aproximada
• Conclusão objetiva baseada em dados

---

━━━ REGRA DE PROFUNDIDADE ━━━

• Cada seção deve conter análise técnica
• Mínimo 4–8 linhas por seção relevante
• Explicar sempre o "porquê"

---

━━━ VALIDAÇÃO FINAL ━━━

Antes de finalizar:

• Existe análise técnica real?
• Existe identificação de risco?
• Existe coerência com mercado?
• Existe justificativa em todas as conclusões?

Se estiver superficial:
→ REESCREVER antes de retornar`, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content: documentBlocks.length > 0
                ? [
                    { type: "text", text: blocoChecklist },
                    ...documentBlocks,
                    { type: "text", text: prompt },
                  ]
                : `${blocoChecklist}\n\n${prompt}`,
            },
          ],
          tools: [
            {
              name: "analise_proposta_completa",
              description: "Retorna análise técnica, comercial e financeira completa da proposta do fornecedor",
              input_schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  // ── Resumo (compatibilidade) ───────────────────────────────
                  posicionamento: {
                    type: "string",
                    enum: ["dentro_media", "acima_media", "abaixo_media"],
                    description: "Posicionamento geral do valor vs mercado baseado em SINDUSCON-SP/SINAPI para a tipologia identificada",
                  },
                  valor_proposta:            { type: ["number", "null"], description: "Valor total da proposta em R$. Retornar null se não houver valor explícito no documento ou no checklist do fornecedor. NÃO estimar." },
                  valor_referencia_mercado:  { type: "number", description: "Valor médio de referência do mercado em R$ — calculado com base em SINDUSCON-SP para tipologia e metragem deste projeto" },
                  pontos_fortes:  { type: "array", items: { type: "string" }, description: "4–6 pontos fortes ESPECÍFICOS e técnicos — O QUÊ é forte e POR QUÊ é vantagem para esse projeto" },
                  pontos_atencao: { type: "array", items: { type: "string" }, description: "4–6 pontos de atenção ESPECÍFICOS — [problema identificado] → [risco potencial] → [como mitigar]" },

                  // ── Classificação do fornecedor e transparência (novas seções) ──
                  classificacao_fornecedor: {
                    type: "string",
                    enum: ["economico", "equilibrado", "premium"],
                    description: "Perfil do fornecedor: economico = preço baixo + risco elevado; equilibrado = melhor custo-benefício; premium = preço alto + escopo completo + documentação sólida",
                  },
                  transparencia_proposta: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "Transparência da proposta: alta = escopo detalhado + M.O/materiais separados + responsável identificado; media = parcialmente detalhado; baixa = genérico/vago/sem separação de custos",
                  },

                  // ── Etapa 0 — Classificação ────────────────────────────────
                  tipo_proposta: {
                    type: "string",
                    enum: ["projeto_arquitetonico", "execucao_obra", "proposta_completa"],
                    description: "Tipo identificado automaticamente",
                  },
                  justificativa_tipo: { type: "string", description: "Justificativa da classificação em 1 frase" },

                  // ── Compatibilidade com o orçamento principal ──────────────
                  compatibilidade_escopo: {
                    type: "string",
                    enum: ["compativel", "parcial", "incompativel"],
                    description: "Compatibilidade da proposta com o tipo de serviço do orçamento principal",
                  },
                  motivo_incompatibilidade: {
                    type: ["string", "null"],
                    description: "Motivo objetivo da incompatibilidade ou parcialidade. null quando compativel.",
                  },

                  // ── Score e risco geral ────────────────────────────────────
                  score: {
                    type: "number",
                    description: "Score 0–100: escopo 30pts + preço 25pts + clareza 25pts + risco(inverso) 20pts",
                  },
                  nivel_risco: {
                    type: "string",
                    enum: ["baixo", "medio", "alto"],
                    description: "Nível de risco geral da proposta",
                  },

                  // ── Etapa 1 — Análise de Escopo ────────────────────────────
                  analise_escopo: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      clareza_tecnica:             { type: "string" },
                      termos_vagos:                { type: "array", items: { type: "string" } },
                      itens_ausentes:              { type: "array", items: { type: "string" } },
                      nivel_detalhamento:          { type: "string", enum: ["baixo", "medio", "alto"] },
                      separacao_materiais_mo:      { type: "boolean" },
                      definicao_responsabilidades: { type: "string" },
                      cobertura_servicos:          { type: "array", items: { type: "string" }, description: "Para execução" },
                      entregaveis:                 { type: "array", items: { type: "string" }, description: "Para projeto" },
                      numero_revisoes:             { type: "string", description: "Para projeto" },
                    },
                    required: ["clareza_tecnica", "termos_vagos", "itens_ausentes", "nivel_detalhamento", "separacao_materiais_mo", "definicao_responsabilidades"],
                  },

                  // ── Etapa 2 — Comparativo de Mercado ──────────────────────
                  comparativo_mercado: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      valor_fornecedor:             { type: "number" },
                      media_mercado:                { type: "number" },
                      alto_padrao:                  { type: "number" },
                      diferenca_percentual_mercado: { type: "number", description: "positivo = acima, negativo = abaixo" },
                      classificacao_preco:          { type: "string", enum: ["abaixo_mercado", "dentro_mercado", "acima_mercado"] },
                      valor_por_m2_fornecedor:      { type: "number" },
                      valor_por_m2_mercado:         { type: "number" },
                      faixa_referencia_min:         { type: "number" },
                      faixa_referencia_max:         { type: "number" },
                    },
                    required: ["valor_fornecedor", "media_mercado", "alto_padrao", "diferenca_percentual_mercado", "classificacao_preco"],
                  },

                  // ── Composição M.O × Materiais ─────────────────────────────
                  composicao: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      total_mao_obra:     { type: "number" },
                      total_materiais:    { type: "number" },
                      total_gestao_bdi:   { type: "number" },
                      percentual_mao_obra:  { type: "number" },
                      percentual_materiais: { type: "number" },
                      percentual_gestao:    { type: "number" },
                      detalhamento_categorias: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            categoria:    { type: "string" },
                            mao_obra:     { type: "number" },
                            material:     { type: "number" },
                            total:        { type: "number" },
                            percentual_mo: { type: "number" },
                          },
                          required: ["categoria", "mao_obra", "material", "total"],
                        },
                      },
                    },
                    required: ["total_mao_obra", "total_materiais", "detalhamento_categorias"],
                  },

                  // ── Etapa 3 — Análise de Risco ─────────────────────────────
                  analise_risco: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      risco_tecnico:      { type: "string", description: "Formato obrigatório: 'Nível: [baixo/médio/alto] | Causa: [causa específica] | Impacto: [o que acontece se se concretizar] | Probabilidade: [baixa/média/alta]'" },
                      risco_financeiro:   { type: "string", description: "Formato obrigatório: 'Nível: [baixo/médio/alto] | Causa: [causa específica] | Impacto: [o que acontece se se concretizar] | Probabilidade: [baixa/média/alta]'" },
                      risco_operacional:  { type: "string", description: "Formato obrigatório: 'Nível: [baixo/médio/alto] | Causa: [causa específica] | Impacto: [o que acontece se se concretizar] | Probabilidade: [baixa/média/alta]'" },
                      risco_contratual:   { type: "string", description: "Formato obrigatório: 'Nível: [baixo/médio/alto] | Causa: [causa específica — ex: ART ausente] | Impacto: [o que acontece se se concretizar] | Probabilidade: [baixa/média/alta]'" },
                      nivel_risco_geral:  { type: "string", enum: ["baixo", "medio", "alto"] },
                    },
                    required: ["risco_tecnico", "risco_financeiro", "risco_operacional", "risco_contratual", "nivel_risco_geral"],
                  },

                  // ── Etapa 4 — Competitividade ──────────────────────────────
                  competitividade: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      pontos_perda:           { type: "array", items: { type: "string" } },
                      pontos_destaque:        { type: "array", items: { type: "string" } },
                      qualidade_apresentacao: { type: "string" },
                      melhorias_comerciais:   { type: "array", items: { type: "string" } },
                      impacto_competitivo:    { type: "string" },
                    },
                    required: ["pontos_perda", "pontos_destaque", "qualidade_apresentacao", "melhorias_comerciais", "impacto_competitivo"],
                  },

                  // ── Etapa 5 — Análise específica por tipo ─────────────────
                  analise_especifica: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      descricao: { type: "string", description: "Avaliação específica conforme tipo_proposta" },
                      pontos:    { type: "array", items: { type: "string" } },
                    },
                    required: ["descricao", "pontos"],
                  },

                  // ── Recomendações objetivas ────────────────────────────────
                  recomendacoes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recomendações objetivas para o fornecedor melhorar a proposta antes de enviar",
                  },

                  // ── Seções legacy (compatibilidade) ───────────────────────
                  escopo_projeto: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      sintese_tecnica:        { type: "string" },
                      tipologia_identificada: { type: "string" },
                      servicos_inclusos:      { type: "array", items: { type: "string" } },
                      area_total:             { type: "string" },
                      observacoes_escopo:     { type: "string" },
                    },
                    required: ["sintese_tecnica", "tipologia_identificada", "servicos_inclusos"],
                  },
                  tabela_tecnica: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      empresa:                { type: "string" },
                      valor_total:            { type: "number" },
                      composicao_resumo:      { type: "string" },
                      vs_mercado:             { type: "string" },
                      vs_alto_padrao:         { type: "string" },
                      escopo_resumo:          { type: "string" },
                      pontos_fortes_tecnicos: { type: "array", items: { type: "string" } },
                      pontos_fracos_tecnicos: { type: "array", items: { type: "string" } },
                      prazo_informado:        { type: "string" },
                      condicoes_pagamento:    { type: "string" },
                    },
                    required: ["empresa", "valor_total", "composicao_resumo", "vs_mercado"],
                  },
                  referencia_mercado: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      indice_utilizado:         { type: "string" },
                      calculo_passo_a_passo:    { type: "string" },
                      itens_especiais_separados: { type: "array", items: { type: "string" } },
                      comparacao_por_categoria: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            categoria:               { type: "string" },
                            valor_fornecedor:        { type: "number" },
                            valor_referencia_sinapi: { type: "number" },
                            diferenca_percentual:    { type: "number" },
                            badge:                   { type: "string", enum: ["verde", "ambar", "vermelho"] },
                          },
                          required: ["categoria", "valor_fornecedor", "valor_referencia_sinapi", "diferenca_percentual", "badge"],
                        },
                      },
                      fontes:             { type: "array", items: { type: "string" } },
                      citacao_referencia: { type: "string" },
                    },
                    required: ["indice_utilizado", "calculo_passo_a_passo", "comparacao_por_categoria", "citacao_referencia"],
                  },
                  analise_tecnica: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      posicionamento_geral:      { type: "string" },
                      justificativas_valores:    { type: "string" },
                      itens_atencao_negociacao:  { type: "string" },
                      pontos_esclarecimento:     { type: "string" },
                    },
                    required: ["posicionamento_geral", "justificativas_valores", "itens_atencao_negociacao", "pontos_esclarecimento"],
                  },
                  conclusao: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      pontos_positivos: { type: "array", items: { type: "string" } },
                      pontos_negativos: { type: "array", items: { type: "string" } },
                      recomendacao_final: {
                        type: "string",
                        description: "Dois blocos separados por linha em branco. BLOCO 1 — ANÁLISE TÉCNICA: síntese objetiva dos achados (escopo, preço, risco) sem emitir decisão — apenas fatos e avaliação técnica. BLOCO 2 — RECOMENDAÇÃO ESTRATÉGICA: ação concreta sugerida com base na análise (ex: avançar, negociar X ponto, solicitar revisão de escopo, rejeitar). Não misturar os blocos. Não iniciar o bloco 2 com justificativa técnica.",
                      },
                    },
                    required: ["pontos_positivos", "pontos_negativos", "recomendacao_final"],
                  },
                  qualidade_leitura: {
                    type: "string",
                    enum: ["completa", "parcial", "proposta_incompleta"],
                    description: "Qualidade do conteúdo extraído: completa = valor+composição+escopo; parcial = dados com limitações; proposta_incompleta = documento sem estrutura adequada",
                  },
                },
                required: [
                  "posicionamento", "valor_proposta", "valor_referencia_mercado",
                  "pontos_fortes", "pontos_atencao",
                  "tipo_proposta", "justificativa_tipo",
                  "compatibilidade_escopo", "motivo_incompatibilidade",
                  "score", "nivel_risco",
                  "analise_escopo", "comparativo_mercado", "composicao",
                  "analise_risco", "competitividade", "analise_especifica", "recomendacoes",
                  "escopo_projeto", "tabela_tecnica", "referencia_mercado", "analise_tecnica", "conclusao",
                  "qualidade_leitura",
                  "classificacao_fornecedor", "transparencia_proposta",
                ],
              },
              cache_control: { type: "ephemeral" },
            },
          ],
          tool_choice: { type: "tool", name: "analise_proposta_completa" },
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errorText);
        await supabase
          .from("propostas_analises_ia")
          .update({ status: "failed", raw_response: errorText })
          .eq("id", analise.id);

        return new Response(
          JSON.stringify({ analise_id: analise.id, status: "failed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      // Anthropic response format: content[] with type "tool_use"
      const toolUse = aiData.content?.find((c: { type: string }) => c.type === "tool_use");

      if (!toolUse?.input) {
        console.error("No tool use in response:", JSON.stringify(aiData));
        await supabase
          .from("propostas_analises_ia")
          .update({ status: "failed", raw_response: JSON.stringify(aiData) })
          .eq("id", analise.id);

        return new Response(
          JSON.stringify({ analise_id: analise.id, status: "failed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = toolUse.input;

      // ── VALIDAÇÃO PÓS-IA: valor_proposta deve ser explícito ───────────────
      // Se a IA não encontrou valor real no documento, bloquear como invalid.
      const valorPropostaValido =
        result.valor_proposta != null &&
        typeof result.valor_proposta === "number" &&
        result.valor_proposta > 0;

      if (!valorPropostaValido) {
        console.log("[analisar-proposta] IA retornou sem valor_proposta explícito — salvando como invalid");
        const { error: postAiErr } = await supabase
          .from("propostas_analises_ia")
          .update({
            status: "invalid",
            qualidade_leitura: "proposta_incompleta",
            raw_response: "Proposta sem valor total explícito. Solicitar reenvio estruturado.",
          })
          .eq("id", analise.id);
        if (postAiErr) console.error("[analisar-proposta] Erro ao salvar invalid pós-IA:", postAiErr);
        return new Response(
          JSON.stringify({
            status:                    "invalid",
            qualidade_leitura:         "proposta_incompleta",
            bloquear_compatibilizacao: true,
            mensagem:                  "Proposta sem valor total explícito. Solicitar reenvio estruturado.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── CHECKPOINT 3: verificar antes de salvar resultado ─────────────────
      const { data: arquivoCheck3 } = await supabase
        .from("propostas_arquivos")
        .select("id")
        .eq("id", arquivo_id)
        .maybeSingle();

      if (!arquivoCheck3) {
        console.log("[analisar-proposta] Resultado descartado — proposta removida antes do término da análise (checkpoint 3)");
        await supabase
          .from("propostas_analises_ia")
          .update({ status: "cancelada", raw_response: "Análise abortada — proposta removida antes de salvar resultado" })
          .eq("id", analise.id);
        return new Response(
          JSON.stringify({ analise_id: analise.id, status: "cancelada" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save both summary fields and full analysis
      const { error: saveErr } = await supabase
        .from("propostas_analises_ia")
        .update({
          status: "completed",
          qualidade_leitura: result.qualidade_leitura ?? "completa",
          posicionamento: result.posicionamento,
          valor_proposta: result.valor_proposta,
          valor_referencia_mercado: result.valor_referencia_mercado,
          pontos_fortes: result.pontos_fortes,
          pontos_atencao: result.pontos_atencao,
          analise_completa: {
            tipo_proposta:            result.tipo_proposta,
            justificativa_tipo:       result.justificativa_tipo,
            compatibilidade_escopo:   result.compatibilidade_escopo,
            motivo_incompatibilidade: result.motivo_incompatibilidade ?? null,
            score:                    result.score,
            nivel_risco:        result.nivel_risco,
            analise_escopo:     result.analise_escopo,
            analise_risco:      result.analise_risco,
            competitividade:    result.competitividade,
            analise_especifica: result.analise_especifica,
            recomendacoes:      result.recomendacoes,
            escopo_projeto:      result.escopo_projeto,
            comparativo_mercado: result.comparativo_mercado,
            composicao:          result.composicao,
            tabela_tecnica:      result.tabela_tecnica,
            referencia_mercado:  result.referencia_mercado,
            analise_tecnica:     result.analise_tecnica,
            conclusao:           result.conclusao,
          },
          raw_response: JSON.stringify(aiData),
        })
        .eq("id", analise.id);

      if (saveErr) {
        console.error("[analisar-proposta] Erro ao salvar análise completed:", saveErr);
        return new Response(
          JSON.stringify({ analise_id: analise.id, status: "failed", erro: "Erro ao salvar resultado no banco" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ analise_id: analise.id, status: "completed", statusProposta }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("AI call error:", aiError);
      await supabase
        .from("propostas_analises_ia")
        .update({ status: "failed", raw_response: String(aiError) })
        .eq("id", analise.id);

      return new Response(
        JSON.stringify({ analise_id: analise.id, status: "failed" }),
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
