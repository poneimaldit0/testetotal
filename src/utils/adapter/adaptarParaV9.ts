import type { CompatibilizacaoIA, EmpresaRanking } from '@/hooks/useCompatibilizacaoIA';
import type { V9Data, V9Proposal, V9Card, V9Analysis, V9Alert, V9ChartBar, V9ChartGroup } from '@/utils/template/buildClientHTML';
import type { OrcamentoParaHtml } from '@/utils/gerarHtmlCompatibilizacao';

// ── Constants ─────────────────────────────────────────────────────────────────

const CORES = ['#2D3395', '#F7A226', '#1B7A4A', '#8B2252', '#0D7377', '#B5451B'];
const COLOR_CLASSES = ['cb', 'co', 'cg', 'cv', 'cc', 'cr'];
const DECISION_GRADIENTS = [
  'linear-gradient(135deg,#2D3395,#1a1f6e)',
  'linear-gradient(135deg,#F7A226,#c47c00)',
  'linear-gradient(135deg,#1B7A4A,#0d3d23)',
  'linear-gradient(135deg,#8B2252,#4a0e2b)',
  'linear-gradient(135deg,#0D7377,#053b3d)',
  'linear-gradient(135deg,#B5451B,#5c200a)',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortName(nome: string): string {
  return nome.split(/[\s(]/)[0].slice(0, 12);
}

function moneyBR(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function marketBadge(diff: number | null | undefined): { text: string; cls: string } {
  if (diff == null) return { text: 'Sem referência', cls: 'bs' };
  if (diff > 10)   return { text: `+${diff.toFixed(1)}% acima do mercado`, cls: 'ba' };
  if (diff < -10)  return { text: `${diff.toFixed(1)}% abaixo do mercado`, cls: 'bb' };
  return { text: 'Dentro do mercado', cls: 'bg' };
}

function scoreLabel(s: number): string {
  return s >= 75 ? 'Excelente' : s >= 50 ? 'Regular' : 'Atenção';
}

function mesAtual(): string {
  return new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

// ── Main adapter ──────────────────────────────────────────────────────────────

export function adaptarParaV9(orcamento: OrcamentoParaHtml, compat: CompatibilizacaoIA): V9Data {
  const ac = compat.analise_completa;
  // prefer consultant-adjusted ranking when available
  const ranking: EmpresaRanking[] = (compat.ranking_ajustado ?? ac?.ranking ?? [])
    .slice()
    .sort((a, b) => a.posicao - b.posicao);

  const nomeCliente = orcamento.nome_contato?.trim() || 'Cliente';
  const recomendadaId = ac?.empresa_recomendada_id ?? '';

  // ── Proposals ──────────────────────────────────────────────────────────────
  const proposals: V9Proposal[] = ranking.map((e, idx) => {
    const { text: mbText, cls: mbCls } = marketBadge(e.diferenca_mercado);
    const isRecomendada = e.candidatura_id === recomendadaId;
    const pFortes = e.pontos_fortes ?? [];
    const pFracos = e.pontos_fracos ?? [];
    return {
      name:             e.empresa,
      shortName:        shortName(e.empresa),
      colorClass:       COLOR_CLASSES[idx] ?? 'cb',
      color:            CORES[idx] ?? '#2D3395',
      decisionGradient: DECISION_GRADIENTS[idx] ?? DECISION_GRADIENTS[0],
      type:             `${e.posicao}º lugar — Score ${e.score_composto.toFixed(0)}/100`,
      value:            e.valor_proposta ?? undefined,
      valueLabel:       moneyBR(e.valor_proposta),
      summary:          e.justificativa_posicao,
      payment:          undefined,
      includes:         pFortes.length ? pFortes : ['Informações disponíveis na proposta'],
      alerts:           pFracos,
      excludes:         [],
      marketBadge:      mbText,
      marketBadgeClass: mbCls,
      decisionTag:      isRecomendada ? 'Recomendada' : `${e.posicao}ª opção`,
      decisionTitle:    e.empresa,
      decisionBullets:  [
        `Score geral: ${e.score_composto.toFixed(0)}/100`,
        ...(e.score_qualidade != null ? [`Qualidade: ${e.score_qualidade.toFixed(0)} pts`] : []),
        ...(e.score_preco     != null ? [`Preço: ${e.score_preco.toFixed(0)} pts`]          : []),
        ...(e.score_risco     != null ? [`Risco: ${e.score_risco.toFixed(0)} pts`]           : []),
        ...pFortes.slice(0, 2),
      ],
    };
  });

  // ── Summary cards ──────────────────────────────────────────────────────────
  const valores = ranking.map(e => e.valor_proposta).filter((v): v is number => v != null);
  const melhor  = ranking[0];
  const summaryCards: V9Card[] = [
    { label: 'Propostas analisadas', value: String(ranking.length), desc: 'Empresas compatibilizadas nesta análise', class: 'cb' },
    { label: 'Melhor avaliada',      value: melhor ? shortName(melhor.empresa) : '—', desc: melhor ? `Score ${melhor.score_composto.toFixed(0)}/100` : '—', class: 'co' },
    { label: 'Faixa de valores',     value: valores.length ? `${moneyBR(Math.min(...valores))} – ${moneyBR(Math.max(...valores))}` : '—', desc: 'Diferença entre menor e maior proposta', class: 'cg' },
    { label: 'Recomendação',         value: melhor ? shortName(melhor.empresa) : '—', desc: melhor ? `Empresa recomendada para este projeto` : '—', class: 'ca' },
  ];

  // ── Scope table — score breakdown per empresa ──────────────────────────────
  const scopeHeaders = ['Dimensão', ...ranking.map(e => shortName(e.empresa))];
  const hasSubScores = ranking.some(e => e.score_qualidade != null);
  const dimensoes: Array<{ label: string; fn: (e: EmpresaRanking) => number; max: number }> = hasSubScores
    ? [
      { label: 'Qualidade (30 pts)', fn: e => e.score_qualidade ?? 0, max: 30  },
      { label: 'Preço (25 pts)',     fn: e => e.score_preco     ?? 0, max: 25  },
      { label: 'Risco (20 pts)',     fn: e => e.score_risco     ?? 0, max: 20  },
      { label: 'Escopo (15 pts)',    fn: e => e.score_escopo    ?? 0, max: 15  },
      { label: 'Clareza (10 pts)',   fn: e => e.score_clareza   ?? 0, max: 10  },
      { label: 'Score composto',     fn: e => e.score_composto,       max: 100 },
    ]
    : [
      { label: 'Score composto (0–100)', fn: e => e.score_composto, max: 100 },
    ];
  const scopeRows: (string | null)[][] = dimensoes.map(d => [
    d.label,
    ...ranking.map(e => {
      const v = d.fn(e);
      const pct = (v / d.max) * 100;
      const tdClass = pct >= 70 ? 'td-ok' : pct < 40 ? 'td-warn' : null;
      const cell = `${v.toFixed(0)} / ${d.max}`;
      return tdClass ? `<span class="${tdClass}">${cell}</span>` : cell;
    }),
  ]);

  // ── Comparison rows (qualitative from analise_comparativa) ─────────────────
  const analComp = ac?.analise_comparativa;
  const comparisonRows: (string | null)[][] = analComp
    ? [
        ['Escopo',     analComp.escopo    || '—', ...Array(Math.max(0, ranking.length - 1)).fill(null)],
        ['Preço',      analComp.preco     || '—', ...Array(Math.max(0, ranking.length - 1)).fill(null)],
        ['Prazo',      analComp.prazo     || '—', ...Array(Math.max(0, ranking.length - 1)).fill(null)],
        ['Risco',      analComp.risco     || '—', ...Array(Math.max(0, ranking.length - 1)).fill(null)],
        ['Materiais',  analComp.materiais || '—', ...Array(Math.max(0, ranking.length - 1)).fill(null)],
      ]
    : [];

  // ── Analyses — legacy dimensions + 15-section rich content ─────────────────
  const analyses: V9Analysis[] = [];
  if (analComp) {
    // Campos legacy (sempre exibidos se presentes)
    const legacyDims: Array<{ title: string; text: string; cls: string }> = [
      { title: 'Escopo das Propostas',       text: analComp.escopo,     cls: 'al-b' },
      { title: 'Comparativo de Preços',      text: analComp.preco,      cls: 'al-a' },
      { title: 'Prazos e Cronograma',        text: analComp.prazo,      cls: 'al-b' },
      { title: 'Análise de Riscos',          text: analComp.risco,      cls: 'al-r' },
      { title: 'Materiais e Especificações', text: analComp.materiais,  cls: 'al-g' },
    ];
    for (const d of legacyDims) {
      if (d.text) analyses.push({ title: d.title, class: d.cls, paragraphs: [d.text] });
    }

    // Seções ricas das 15 seções novas (exibidas quando disponíveis)
    type RichSection = { title: string; field: string | undefined; cls: string };
    const richSections: RichSection[] = [
      { title: 'Escopo do Projeto',                   field: (analComp as any).escopo_cliente,                cls: 'al-b' },
      { title: 'Comparação Item a Item por Disciplina', field: (analComp as any).tabela_comparativa,           cls: 'al-b' },
      { title: 'Valores e R$/m² por Empresa',          field: (analComp as any).valores_por_empresa,          cls: 'al-a' },
      { title: 'Comparação com Mercado (SINAPI/CUB)',   field: (analComp as any).comparacao_mercado_detalhada, cls: 'al-a' },
      { title: 'Inclusões e Exclusões',                field: (analComp as any).inclusoes_exclusoes,           cls: 'al-b' },
      { title: 'Análise de Materiais',                 field: (analComp as any).analise_materiais,            cls: 'al-g' },
      { title: 'Prazo de Execução',                    field: (analComp as any).analise_prazo,                cls: 'al-b' },
      { title: 'Condições de Pagamento',               field: (analComp as any).condicoes_pagamento,          cls: 'al-a' },
      { title: 'Documentação Técnica (ART/Garantias)', field: (analComp as any).documentacao_tecnica,         cls: 'al-r' },
      { title: 'Riscos Detalhados',                    field: (analComp as any).riscos_detalhados,            cls: 'al-r' },
      { title: 'Diferença Real Entre Propostas',       field: (analComp as any).diferenca_real,               cls: 'al-a' },
      { title: 'Recomendação Final',                   field: (analComp as any).recomendacao_final_detalhada, cls: 'al-g' },
      { title: 'Próximos Passos',                      field: (analComp as any).proximos_passos,              cls: 'al-b' },
    ];
    for (const s of richSections) {
      if (s.field?.trim()) analyses.push({ title: s.title, class: s.cls, paragraphs: [s.field] });
    }
  }

  // ── Analysis alerts ────────────────────────────────────────────────────────
  const analysisAlerts: V9Alert[] = [];
  if (ac?.recomendacao_geral) {
    analysisAlerts.push({ class: 'al-b', text: ac.recomendacao_geral });
  }
  if (ac?.justificativa_recomendacao) {
    analysisAlerts.push({ class: 'al-g', text: `★ Recomendação: ${ac.justificativa_recomendacao}` });
  }
  if (compat.ajuste_leitura) {
    analysisAlerts.push({ class: 'al-a', text: `Nota do consultor: ${compat.ajuste_leitura}` });
  }

  // ── Chart groups ───────────────────────────────────────────────────────────
  const chartGroups: V9ChartGroup[] = [];
  const proposalsWithValue = ranking.filter(e => e.valor_proposta != null);
  if (proposalsWithValue.length) {
    const maxVal = Math.max(...proposalsWithValue.map(e => e.valor_proposta!));
    const bars: V9ChartBar[] = proposalsWithValue.map((e, idx) => ({
      label: shortName(e.empresa),
      desc:  scoreLabel(e.score_composto),
      value: e.valor_proposta!,
      color: CORES[ranking.indexOf(e)] ?? '#2D3395',
      tip:   `${e.empresa}\nValor: ${moneyBR(e.valor_proposta)}\nScore: ${e.score_composto.toFixed(0)}/100\n${marketBadge(e.diferenca_mercado).text}`,
    }));
    const cards: V9Card[] = proposalsWithValue.slice(0, 3).map((e, idx) => ({
      label: shortName(e.empresa),
      value: moneyBR(e.valor_proposta),
      desc:  `Score: ${e.score_composto.toFixed(0)}/100`,
      class: COLOR_CLASSES[ranking.indexOf(e)] ?? 'cb',
    }));
    chartGroups.push({
      title: 'Comparativo de Valores das Propostas',
      quote: ac?.metodologia
        ? `Metodologia: ${ac.metodologia}`
        : 'Valores nominais das propostas apresentadas. Diferenças refletem escopo, prazo e condições de pagamento distintos.',
      cards,
      bars,
      max:   maxVal,
    });
  }

  // ── Conclusion ────────────────────────────────────────────────────────────
  const recomFinalDetalhada = (analComp as any)?.recomendacao_final_detalhada as string | undefined;
  const diferecaReal        = (analComp as any)?.diferenca_real               as string | undefined;
  const proximosPassos      = (analComp as any)?.proximos_passos              as string | undefined;
  const comparMercado       = (analComp as any)?.comparacao_mercado_detalhada as string | undefined;
  const escopoCliente       = (analComp as any)?.escopo_cliente               as string | undefined;

  const conclusionIntro = recomFinalDetalhada || ac?.recomendacao_geral || undefined;
  const budgetAdvice    = diferecaReal || compat.ajuste_leitura || undefined;
  const marketMethodology = comparMercado || 'Referências: SINAPI-SP (custos unitários por serviço), SINDUSCON-SP/CUB (R$/m² por tipologia), Andora/Chronoshare (benchmark de mercado)';

  // Tabela de referência de mercado estática — SP 2026
  const marketTableRows: (string | null)[][] = [
    ['Reforma leve',        'R$ 450–700/m²',    'CUB×25-30%', 'Piso, pintura, elétrica básica'],
    ['Reforma média',       'R$ 650–950/m²',    'CUB×40-50%', 'Revestimentos completos, elétrica, hidráulica'],
    ['Reforma completa',    'R$ 1.200–1.800/m²','CUB×65-75%', 'Instalações novas, estrutural'],
    ['Alto padrão',         'R$ 1.800–2.600/m²','CUB×85%+',   'Premium com projetos'],
  ];

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerTech = `Gerado em ${mesAtual()} · Reforma100 Compatibilização IA · Referências: SINAPI-SP, SINDUSCON-SP/CUB, CREA-SP`;

  return {
    client: {
      name:       nomeCliente,
      purpose:    orcamento.necessidade ?? undefined,
      monthLabel: mesAtual(),
      subtitle:   `Análise de ${ranking.length} proposta${ranking.length !== 1 ? 's' : ''}`,
    },
    proposals,
    summaryCards,
    scopeAlert:  escopoCliente || (ranking.length === 1
      ? 'Apenas uma proposta foi analisada. Recomenda-se obter ao menos mais duas para comparação.'
      : `${ranking.length} propostas analisadas e comparadas tecnicamente.`),
    scopeTable:  [scopeHeaders, ...scopeRows],
    comparisonRows: comparisonRows.length ? comparisonRows : undefined,
    analyses:    analyses.length ? analyses : undefined,
    analysisAlerts: analysisAlerts.length ? analysisAlerts : undefined,
    conclusionIntro,
    budgetAdvice,
    chartGroups:    chartGroups.length ? chartGroups : undefined,
    marketTableRows,
    marketMethodology,
    footerTech,
  };
}
