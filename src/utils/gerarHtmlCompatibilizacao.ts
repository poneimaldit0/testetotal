import type { CompatibilizacaoIA, EmpresaRanking } from '@/hooks/useCompatibilizacaoIA';
import { buildClientHTML } from '@/utils/template/buildClientHTML';
import { adaptarParaV9 }   from '@/utils/adapter/adaptarParaV9';

export interface OrcamentoParaHtml {
  id:            string;
  nome_contato?: string | null;
  necessidade?:  string | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function moneyBR(v: number | null | undefined): string {
  if (v == null || v === 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function scoreCor(s: number): string {
  return s >= 75 ? '#15803d' : s >= 50 ? '#b45309' : '#b91c1c';
}

function scoreBarColor(s: number): string {
  return s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
}

function mercadoBadge(diff: number | null | undefined): string {
  if (diff == null) return '';
  if (diff >  10) return `<span class="badge ba">+${diff.toFixed(1)}% acima do mercado</span>`;
  if (diff < -10) return `<span class="badge bb">${diff.toFixed(1)}% abaixo do mercado</span>`;
  return `<span class="badge bg">Dentro do mercado</span>`;
}

function posLabel(pos: number): string {
  return pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
}

function mesAtual(): string {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const CORES = ['#2D3395', '#F7A226', '#1B7A4A', '#8B2252', '#0D7377', '#B5451B'];

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,-apple-system,sans-serif;background:#eef1f7;color:#1a1a2e;font-size:15px;line-height:1.55}

/* Header */
.header{background:#10162b;color:#fff;padding:24px 32px 20px;position:relative;overflow:hidden}
.header-bg{position:absolute;inset:0;pointer-events:none}
.logo-oficial{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.logo-word{font-family:'Nunito',sans-serif;font-weight:300;font-size:1.35rem;color:#fff}
.logo-bold{font-weight:800}
.logo-icon{width:46px;height:32px}
.header-client{font-size:.95rem;color:#b8c2ea;line-height:1.5}
.header-client strong{color:#fff;font-size:1.1rem;display:block;margin-bottom:2px}
.orange-line{height:4px;background:linear-gradient(90deg,#F7A226,#e08010)}

/* Tabs */
.tabs{display:flex;overflow-x:auto;background:#fff;border-bottom:2px solid #e5e7eb;padding:0 24px;gap:2px;position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.tab{padding:14px 18px;font-size:.82rem;font-weight:600;color:#6b7280;cursor:pointer;border-bottom:2.5px solid transparent;white-space:nowrap;transition:all .15s;user-select:none}
.tab:hover{color:#374151}
.tab.active{color:#2D3395;border-bottom-color:#2D3395}
.tab-num{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#e5e7eb;font-size:.7rem;margin-right:6px;font-weight:700}
.tab.active .tab-num{background:#2D3395;color:#fff}

/* Sections */
.section{display:none;padding:28px 32px 40px;max-width:1000px;margin:0 auto}
.section.active{display:block}
.section-title{font-family:'DM Serif Display',serif;font-size:1.6rem;color:#10162b;margin-bottom:4px}
.section-subtitle{font-size:.85rem;color:#6b7280;margin-bottom:24px}

/* Cards grid */
.g1{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:20px}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
@media(max-width:720px){.g2,.g3,.g4{grid-template-columns:1fr}}
@media(min-width:721px) and (max-width:900px){.g3,.g4{grid-template-columns:repeat(2,1fr)}}

.card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(32,41,79,.08);border-top:4px solid #2D3395}
.card.cb{border-top-color:#2D3395}.card.co{border-top-color:#F7A226}.card.cg{border-top-color:#1B7A4A}
.card.cv{border-top-color:#8B2252}.card.cc{border-top-color:#0D7377}.card.cr{border-top-color:#B5451B}
.card-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700;margin-bottom:6px}
.card-value{font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:4px}
.card-desc{font-size:.8rem;color:#6b7280;line-height:1.5}

/* Alerts */
.alert{border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:.88rem;line-height:1.6}
.al-a{background:#fef3c7;border:1px solid #fcd34d;color:#78350f}
.al-b{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f}
.al-g{background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d}
.al-r{background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d}
.alert strong{font-weight:700}

/* Tables */
.table-wrap{overflow-x:auto;margin-bottom:20px;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.04)}
table{width:100%;border-collapse:collapse;font-size:.83rem}
th{background:#f8fafc;padding:10px 14px;text-align:left;font-weight:700;font-size:.75rem;text-transform:uppercase;letter-spacing:.6px;color:#374151;border-bottom:2px solid #e5e7eb}
td{padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#374151;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafbfe}
td.td-ok{color:#15803d;font-weight:600}
td.td-warn{color:#92400e;font-weight:600}

/* Score bar */
.score-row{margin-bottom:10px}
.score-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.score-label{font-size:.8rem;color:#374151;font-weight:600}
.score-val{font-size:.85rem;font-weight:700}
.score-track{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden}
.score-fill{height:100%;border-radius:99px;transition:width .8s ease}

/* Badge mercado */
.badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:.74rem;font-weight:600}
.badge.bg{background:#dcfce7;color:#15803d}
.badge.ba{background:#fee2e2;color:#b91c1c}
.badge.bb{background:#fef3c7;color:#92400e}
.badge.bs{background:#f1f5f9;color:#475569}

/* Empresa ranking card */
.emp-card{background:#fff;border-radius:14px;padding:22px;margin-bottom:16px;box-shadow:0 2px 10px rgba(32,41,79,.08);border-left:5px solid #2D3395}
.emp-card.recomendada{border-left-color:#15803d;background:#f0fdf4}
.emp-header{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.emp-pos{font-size:1.5rem;line-height:1}
.emp-name{font-size:1.05rem;font-weight:700;color:#111827}
.emp-score-big{margin-left:auto;text-align:right}
.emp-score-num{font-size:2rem;font-weight:900;line-height:1}
.emp-score-sub{font-size:.7rem;color:#6b7280}
.emp-sub{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.8rem;margin-bottom:12px}
.emp-main-bar{height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:16px}
.emp-main-fill{height:100%;border-radius:99px}
.subscores{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px}
.subscore{text-align:center}
.subscore-val{font-size:.8rem;font-weight:700;margin-bottom:2px}
.subscore-track{height:4px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:0 2px}
.subscore-fill{height:100%;border-radius:99px}
.subscore-label{font-size:.65rem;color:#9ca3af;margin-top:2px;line-height:1.2}
.subscore-peso{font-size:.6rem;color:#d1d5db}
.emp-bullets{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:12px;border-top:1px solid #f1f5f9}
.bullets-col{font-size:.8rem;line-height:1.6}
.bullets-title{font-weight:700;margin-bottom:4px;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px}
.bullets-col.fortes .bullets-title{color:#15803d}
.bullets-col.fracos .bullets-title{color:#b45309}
.bullet-item{display:flex;gap:6px;margin-bottom:2px;color:#374151}
.bullet-dot{flex-shrink:0;margin-top:4px}

/* Decision card */
.decision-card{border-radius:14px;padding:26px;color:#fff;display:flex;flex-direction:column;gap:10px}
.decision-tag{font-size:.68rem;text-transform:uppercase;letter-spacing:1.2px;opacity:.65}
.decision-title{font-family:'DM Serif Display',serif;font-size:1.15rem;line-height:1.3}
.decision-bullets{font-size:.81rem;line-height:1.9;opacity:.9}
.decision-value{margin-top:auto;background:rgba(255,255,255,.15);border-radius:8px;padding:12px 16px;text-align:center;font-weight:700;font-size:.95rem;border:1px solid rgba(255,255,255,.25)}

/* Dim tabs */
.dim-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.dim-tab{padding:7px 14px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;border:1.5px solid #e5e7eb;background:#fff;color:#374151;transition:all .12s}
.dim-tab.active{background:#2D3395;color:#fff;border-color:#2D3395}
.dim-content{display:none}
.dim-content.active{display:block}
.dim-text{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;font-size:.88rem;line-height:1.7;color:#374151;margin-bottom:12px}
.dim-scores{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.dim-emp-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.dim-emp-name{font-size:.8rem;font-weight:700;margin-bottom:6px;color:#374151}

/* Divider */
.divider{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
h3{font-size:1rem;font-weight:700;color:#111827;margin:20px 0 12px}
.center-note{text-align:center;font-size:.82rem;color:#6b7280;padding:16px;font-style:italic}

/* Footer nav */
.footer-nav{position:sticky;bottom:0;background:#fff;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:12px 32px;z-index:10;box-shadow:0 -2px 8px rgba(0,0,0,.06)}
.nav-btn{border:1.5px solid #e5e7eb;background:#fff;border-radius:8px;padding:8px 20px;font-weight:600;font-size:.85rem;cursor:pointer;color:#374151;transition:all .12s}
.nav-btn:hover:not(:disabled){background:#f8fafc;border-color:#2D3395;color:#2D3395}
.nav-btn:disabled{opacity:.4;cursor:not-allowed}
.nav-counter{font-size:.82rem;font-weight:600;color:#6b7280}

/* Brand footer */
.brand-footer{background:#10162b;color:#fff;padding:18px 32px;display:flex;align-items:center;gap:10px;font-size:.85rem}
.brand-footer-icon{opacity:.9}

/* Consultor note section */
.consultor-box{background:#fff;border:2px dashed #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px}
.consultor-box h4{font-size:.75rem;text-transform:uppercase;letter-spacing:.7px;color:#6b7280;font-weight:700;margin-bottom:8px}
.consultor-box p{font-size:.9rem;color:#374151;line-height:1.65;white-space:pre-wrap}

/* Rec card */
.rec-card{border-radius:14px;padding:22px;margin-bottom:20px;border:2px solid}
.rec-card.ok{border-color:#22c55e;background:#f0fdf4}
.rec-card.atencao{border-color:#f59e0b;background:#fffbeb}
.rec-card.critico{border-color:#ef4444;background:#fef2f2}
.rec-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
.rec-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700;margin-bottom:4px}
.rec-empresa{display:inline-block;padding:4px 12px;border-radius:99px;font-size:.85rem;font-weight:700;color:#fff}
.rec-empresa.ok{background:#15803d}.rec-empresa.atencao{background:#b45309}.rec-empresa.critico{background:#b91c1c}
.rec-score{font-size:2.5rem;font-weight:900;line-height:1}
.rec-score-sub{font-size:.72rem;color:#6b7280}
.rec-text{font-size:.9rem;line-height:1.65;color:#374151;margin-top:8px}
.rec-just{font-size:.83rem;color:#6b7280;font-style:italic;border-left:2px solid #d1d5db;padding-left:10px;margin-top:8px;line-height:1.6}
`;

// ── score bar HTML ────────────────────────────────────────────────────────────

function scoreBar(label: string, value: number, peso: string): string {
  const color = scoreBarColor(value);
  return `
    <div class="score-row">
      <div class="score-header">
        <span class="score-label">${esc(label)} <span style="color:#9ca3af;font-weight:400;font-size:.72rem">(${esc(peso)})</span></span>
        <span class="score-val" style="color:${color}">${value}</span>
      </div>
      <div class="score-track">
        <div class="score-fill" style="width:${value}%;background:${color}"></div>
      </div>
    </div>`;
}

// ── sections ──────────────────────────────────────────────────────────────────

function sectionVisaoGeral(
  orcamento: OrcamentoParaHtml,
  rankingAtivo: EmpresaRanking[],
  scopeAlert: string,
): string {
  const clienteNome = orcamento.nome_contato || 'Cliente';
  const n = rankingAtivo.length;

  const summaryCards = `
    <div class="${n <= 2 ? 'g2' : 'g3'}">
      <div class="card cb">
        <div class="card-label">Cliente</div>
        <div class="card-value">${esc(clienteNome)}</div>
        <div class="card-desc">${esc(orcamento.necessidade || '—')}</div>
      </div>
      <div class="card co">
        <div class="card-label">Propostas analisadas</div>
        <div class="card-value">${n} empresa${n !== 1 ? 's' : ''}</div>
        <div class="card-desc">${rankingAtivo.map(e => esc(e.empresa)).join(' · ')}</div>
      </div>
      ${n >= 2 ? `
      <div class="card cg">
        <div class="card-label">Empresa recomendada</div>
        <div class="card-value">${esc(rankingAtivo[0]?.empresa ?? '—')}</div>
        <div class="card-desc">Score: ${rankingAtivo[0]?.score_composto ?? '—'} / 100</div>
      </div>` : ''}
    </div>`;

  const pontosCards = rankingAtivo.map((emp, i) => {
    const cls = ['cb', 'co', 'cg', 'cv', 'cc', 'cr'][i] ?? 'cb';
    const pontos = (emp.pontos_fortes ?? []).slice(0, 5).map(p => `<div style="margin-bottom:4px">✔ ${esc(p)}</div>`).join('');
    const alertas = (emp.pontos_fracos ?? []).slice(0, 3).map(p => `<div style="margin-bottom:4px;color:#92400e">⚠ ${esc(p)}</div>`).join('');
    return `
      <div class="card ${cls}">
        <div class="card-label">${esc(posLabel(emp.posicao))} ${esc(emp.empresa)}</div>
        <div class="card-value">${moneyBR(emp.valor_proposta)}</div>
        ${mercadoBadge(emp.diferenca_mercado) ? `<div style="margin:6px 0">${mercadoBadge(emp.diferenca_mercado)}</div>` : ''}
        <div class="card-desc" style="margin-top:10px;font-size:.8rem;line-height:1.7">
          ${pontos}
          ${alertas}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="section-title">Visão Geral</div>
    <div class="section-subtitle">Compatibilização de orçamentos · ${esc(mesAtual())}</div>
    ${summaryCards}
    <div class="alert al-b"><strong>ℹ Natureza das propostas:</strong> ${esc(scopeAlert)}</div>
    <h3>Resumo por empresa</h3>
    <div class="${n <= 2 ? 'g2' : 'g3'}">${pontosCards}</div>`;
}

function sectionScores(rankingAtivo: EmpresaRanking[]): string {
  const SUBSCORES: Array<{ key: keyof EmpresaRanking; label: string; peso: string }> = [
    { key: 'score_qualidade', label: 'Qualidade', peso: '30%' },
    { key: 'score_preco',    label: 'Preço',     peso: '25%' },
    { key: 'score_risco',    label: 'Risco',     peso: '20%' },
    { key: 'score_escopo',  label: 'Escopo',     peso: '15%' },
    { key: 'score_clareza', label: 'Clareza',    peso: '10%' },
  ];

  const cards = rankingAtivo.map((emp, i) => {
    const cls = ['cb', 'co', 'cg', 'cv', 'cc', 'cr'][i] ?? 'cb';
    const cor = scoreCor(emp.score_composto);
    const barColor = scoreBarColor(emp.score_composto);
    const subRows = SUBSCORES.map(s => {
      const val = (emp[s.key] as number | undefined) ?? 0;
      return `
        <div class="subscore">
          <div class="subscore-val" style="color:${scoreCor(val)}">${val}</div>
          <div class="subscore-track"><div class="subscore-fill" style="width:${val}%;background:${scoreBarColor(val)}"></div></div>
          <div class="subscore-label">${esc(s.label)}</div>
          <div class="subscore-peso">${esc(s.peso)}</div>
        </div>`;
    }).join('');

    return `
      <div class="emp-card ${i === 0 ? 'recomendada' : ''}">
        <div class="emp-header">
          <div class="emp-pos">${esc(posLabel(emp.posicao))}</div>
          <div>
            <div class="emp-name">${esc(emp.empresa)}</div>
            <div class="emp-sub">${mercadoBadge(emp.diferenca_mercado)} ${emp.valor_proposta ? `<span style="font-size:.8rem;color:#6b7280">${moneyBR(emp.valor_proposta)}</span>` : ''}</div>
          </div>
          <div class="emp-score-big">
            <div class="emp-score-num" style="color:${cor}">${emp.score_composto}</div>
            <div class="emp-score-sub">/ 100</div>
          </div>
        </div>
        <div class="emp-main-bar">
          <div class="emp-main-fill" style="width:${emp.score_composto}%;background:${barColor}"></div>
        </div>
        <div class="subscores">${subRows}</div>
        <div class="emp-bullets">
          <div class="bullets-col fortes">
            <div class="bullets-title">Pontos fortes</div>
            ${(emp.pontos_fortes ?? []).slice(0, 4).map(p => `<div class="bullet-item"><span class="bullet-dot" style="color:#22c55e">•</span><span>${esc(p)}</span></div>`).join('')}
          </div>
          <div class="bullets-col fracos">
            <div class="bullets-title">Pontos de atenção</div>
            ${(emp.pontos_fracos ?? []).slice(0, 4).map(p => `<div class="bullet-item"><span class="bullet-dot" style="color:#f59e0b">•</span><span>${esc(p)}</span></div>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');

  // Tabela de scores comparativa
  const headerCols = rankingAtivo.map(e => `<th style="background:${CORES[rankingAtivo.indexOf(e)] || '#2D3395'};color:#fff">${esc(e.empresa)}</th>`).join('');
  const rows = [
    ['Composto (0–100)', ...rankingAtivo.map(e => e.score_composto)],
    ['Qualidade (30%)', ...rankingAtivo.map(e => e.score_qualidade ?? 0)],
    ['Preço (25%)',     ...rankingAtivo.map(e => e.score_preco     ?? 0)],
    ['Risco (20%)',    ...rankingAtivo.map(e => e.score_risco      ?? 0)],
    ['Escopo (15%)',   ...rankingAtivo.map(e => e.score_escopo     ?? 0)],
    ['Clareza (10%)',  ...rankingAtivo.map(e => e.score_clareza    ?? 0)],
  ].map(row => `<tr><td><strong>${esc(String(row[0]))}</strong></td>${row.slice(1).map(v => {
    const n = Number(v);
    return `<td style="color:${scoreCor(n)};font-weight:700">${n}</td>`;
  }).join('')}</tr>`).join('');

  return `
    <div class="section-title">Scores</div>
    <div class="section-subtitle">Score composto 0–100 ponderado por dimensão</div>
    ${cards}
    <h3>Tabela comparativa de scores</h3>
    <div class="table-wrap">
      <table><tr><th>Dimensão</th>${headerCols}</tr>${rows}</table>
    </div>`;
}

function sectionComparativo(rankingAtivo: EmpresaRanking[]): string {
  const headerCols = rankingAtivo.map((e, i) =>
    `<th style="background:${CORES[i] || '#2D3395'};color:#fff">${esc(e.empresa)}</th>`
  ).join('');

  const rows = [
    {
      label: 'Posição',
      vals: rankingAtivo.map(e => `${posLabel(e.posicao)} ${e.posicao === 1 ? '<span style="color:#15803d;font-size:.75rem">recomendada</span>' : ''}`),
    },
    {
      label: 'Score composto',
      vals: rankingAtivo.map(e => `<strong style="color:${scoreCor(e.score_composto)}">${e.score_composto}/100</strong>`),
    },
    {
      label: 'Valor da proposta',
      vals: rankingAtivo.map(e => moneyBR(e.valor_proposta)),
    },
    {
      label: 'Posicionamento de mercado',
      vals: rankingAtivo.map(e => mercadoBadge(e.diferenca_mercado) || '—'),
    },
    {
      label: 'Pontos fortes',
      vals: rankingAtivo.map(e => (e.pontos_fortes ?? []).slice(0, 3).map(p => `<div>✔ ${esc(p)}</div>`).join('') || '—'),
    },
    {
      label: 'Pontos de atenção',
      vals: rankingAtivo.map(e => (e.pontos_fracos ?? []).slice(0, 3).map(p => `<div style="color:#92400e">⚠ ${esc(p)}</div>`).join('') || '—'),
    },
  ].map(r => `<tr><td><strong>${esc(r.label)}</strong></td>${r.vals.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');

  return `
    <div class="section-title">Comparativo</div>
    <div class="section-subtitle">Visão lado a lado das propostas recebidas</div>
    <div class="table-wrap">
      <table><tr><th>Critério</th>${headerCols}</tr>${rows}</table>
    </div>`;
}

function sectionPorDimensao(
  analise: Partial<{ escopo: string; preco: string; prazo: string; risco: string; materiais: string }> | null | undefined,
  rankingAtivo: EmpresaRanking[],
): string {
  if (!analise) {
    return `
    <div class="section-title">Por Dimensão</div>
    <div class="section-subtitle">Análise comparativa em cada dimensão avaliada</div>
    <div class="alert al-b">Informação não detalhada na análise atual.</div>`;
  }

  const dims = [
    { key: 'escopo',    label: 'Escopo',    text: analise.escopo    ?? '', scoreKey: 'score_escopo'  as const },
    { key: 'preco',     label: 'Preço',     text: analise.preco     ?? '', scoreKey: 'score_preco'   as const },
    { key: 'prazo',     label: 'Prazo',     text: analise.prazo     ?? '', scoreKey: 'score_clareza' as const },
    { key: 'risco',     label: 'Risco',     text: analise.risco     ?? '', scoreKey: 'score_risco'   as const },
    { key: 'materiais', label: 'Materiais', text: analise.materiais ?? '', scoreKey: 'score_escopo'  as const },
  ];

  const tabBtns = dims.map((d, i) =>
    `<button class="dim-tab${i === 0 ? ' active' : ''}" onclick="dimGo(${i})">${esc(d.label)}</button>`
  ).join('');

  const tabContents = dims.map((d, i) => {
    const empCards = rankingAtivo.map((emp) => {
      const sc = (emp[d.scoreKey] as number | undefined) ?? emp.score_composto;
      return `
        <div class="dim-emp-card">
          <div class="dim-emp-name">${esc(posLabel(emp.posicao))} ${esc(emp.empresa)}</div>
          ${scoreBar(d.label, sc, '')}
        </div>`;
    }).join('');
    return `
      <div class="dim-content${i === 0 ? ' active' : ''}" id="dim-${i}">
        <div class="dim-text">${d.text ? esc(d.text) : '<em>Sem análise disponível para esta dimensão.</em>'}</div>
        <div class="dim-scores">${empCards}</div>
      </div>`;
  }).join('');

  return `
    <div class="section-title">Por Dimensão</div>
    <div class="section-subtitle">Análise comparativa em cada dimensão avaliada</div>
    <div class="dim-tabs">${tabBtns}</div>
    ${tabContents}`;
}

function sectionAnalise(rankingAtivo: EmpresaRanking[], metodologia: string): string {
  const cards = rankingAtivo.map((emp, i) => {
    const cls = ['cb', 'co', 'cg', 'cv', 'cc', 'cr'][i] ?? 'cb';
    return `
      <div class="card ${cls}" style="margin-bottom:16px">
        <div class="card-label">${esc(posLabel(emp.posicao))} ${esc(emp.empresa)}</div>
        <h3 style="margin-top:8px;margin-bottom:8px">${esc(emp.empresa)}</h3>
        <div class="analysis-text">
          <p style="font-size:.9rem;line-height:1.7;color:#374151">${esc(emp.justificativa_posicao)}</p>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="section-title">Análise</div>
    <div class="section-subtitle">Leitura qualitativa de cada proposta pela IA</div>
    ${cards}
    ${metodologia ? `
    <details style="margin-top:20px">
      <summary style="font-size:.8rem;font-weight:600;color:#6b7280;cursor:pointer;padding:8px 0">
        ℹ Metodologia de score
      </summary>
      <p style="font-size:.82rem;color:#6b7280;line-height:1.6;padding:10px 0">${esc(metodologia)}</p>
    </details>` : ''}`;
}

function sectionConclusao(
  rankingAtivo: EmpresaRanking[],
  recomendacaoGeral: string,
  justificativaRecomendacao: string,
  empresaRecomendadaId: string,
): string {
  const recomendada = rankingAtivo.find(e => e.candidatura_id === empresaRecomendadaId) ?? rankingAtivo[0];
  const score = recomendada?.score_composto ?? 0;
  const nivel = score >= 75 ? 'ok' : score >= 50 ? 'atencao' : 'critico';
  const cor = scoreCor(score);

  const recCard = `
    <div class="rec-card ${nivel}">
      <div class="rec-header">
        <div>
          <div class="rec-label">Recomendação da IA</div>
          <span class="rec-empresa ${nivel}">${esc(recomendada?.empresa ?? '—')}</span>
        </div>
        <div style="text-align:right">
          <div class="rec-score" style="color:${cor}">${score}</div>
          <div class="rec-score-sub">score / 100</div>
        </div>
      </div>
      <p class="rec-text">${esc(recomendacaoGeral)}</p>
      ${justificativaRecomendacao ? `<p class="rec-just">${esc(justificativaRecomendacao)}</p>` : ''}
    </div>`;

  const n = rankingAtivo.length;
  const decisionCards = rankingAtivo.map((emp, i) => {
    const color = CORES[i] ?? '#2D3395';
    const isRec = emp.candidatura_id === empresaRecomendadaId;
    const bullets = (emp.pontos_fortes ?? []).slice(0, 4).map(b => `<div>→ ${esc(b)}</div>`).join('');
    return `
      <div class="decision-card" style="background:linear-gradient(150deg,${color},${color}cc);${isRec ? 'box-shadow:0 4px 20px rgba(0,0,0,.2)' : 'opacity:.9'}">
        <div class="decision-tag">${esc(isRec ? '★ Recomendada' : `#${emp.posicao}`)}</div>
        <div class="decision-title">Siga com ${esc(emp.empresa)} se você prioriza…</div>
        <div class="decision-bullets">${bullets}</div>
        <div class="decision-value">${moneyBR(emp.valor_proposta)}</div>
      </div>`;
  }).join('');

  return `
    <div class="section-title">Conclusão</div>
    <div class="section-subtitle">Resumo final e recomendação do consultor Reforma100</div>
    ${recCard}
    <div class="${n <= 2 ? 'g2' : 'g3'}">${decisionCards}</div>
    <div class="center-note">Compartilhe com seu consultor Reforma100 qual empresa você deseja seguir para darmos os próximos passos juntos.</div>
    <hr class="divider">
    <div class="alert al-b">Análise gerada pela plataforma Reforma100 · ${esc(mesAtual())} · Scores: Qualidade (30%) + Preço (25%) + Risco (20%) + Escopo (15%) + Clareza (10%)</div>`;
}

function sectionNotaConsultor(
  notaConsultor: string | null,
  ajusteLeitura: string | null,
  aprovadoEm: string | null,
  rankingAjustado: EmpresaRanking[] | null,
  justificativaAjuste: string | null,
): string {
  const hasNota = !!notaConsultor?.trim();
  const hasAjuste = !!ajusteLeitura?.trim();
  const hasRankingAjustado = rankingAjustado != null && !!justificativaAjuste?.trim();

  if (!hasNota && !hasAjuste && !hasRankingAjustado) {
    return `
      <div class="section-title">Revisão do Consultor</div>
      <div class="section-subtitle">Registro interno da revisão técnica aplicada</div>
      <div class="alert al-b">Nenhuma nota de consultor registrada para esta análise.</div>`;
  }

  const aprovado = aprovadoEm
    ? `<div class="alert al-g" style="margin-bottom:16px">✔ Análise aprovada pelo consultor em ${new Date(aprovadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>`
    : '';

  const notaBlock = hasNota
    ? `<div class="consultor-box"><h4>Nota interna do consultor</h4><p>${esc(notaConsultor)}</p></div>`
    : '';

  const ajusteBlock = hasAjuste
    ? `<div class="consultor-box"><h4>Ajuste de leitura para o cliente</h4><p>${esc(ajusteLeitura)}</p></div>`
    : '';

  const rankingBlock = hasRankingAjustado
    ? `<div class="consultor-box" style="border-color:#f59e0b">
        <h4>Revisão técnica de ranking</h4>
        <p>${esc(justificativaAjuste)}</p>
      </div>`
    : '';

  return `
    <div class="section-title">Revisão do Consultor</div>
    <div class="section-subtitle">Registro interno da revisão técnica aplicada — uso interno Reforma100</div>
    ${aprovado}
    ${notaBlock}
    ${ajusteBlock}
    ${rankingBlock}`;
}

// ── JavaScript inline ─────────────────────────────────────────────────────────

const SCRIPT = `
let currentSection = 0;
function sections() { return Array.from(document.querySelectorAll('.section')); }
function allTabs()   { return Array.from(document.querySelectorAll('.tab')); }
function goTo(idx) {
  const secs = sections(), tabs = allTabs();
  if (idx < 0 || idx >= secs.length) return;
  currentSection = idx;
  secs.forEach((el, i)  => el.classList.toggle('active', i === idx));
  tabs.forEach((el, i)  => el.classList.toggle('active', i === idx));
  const c = document.getElementById('navCounter');
  if (c) c.textContent = (idx + 1) + ' de ' + secs.length;
  const p = document.getElementById('prevBtn');
  const n = document.getElementById('nextBtn');
  if (p) p.disabled = idx === 0;
  if (n) n.disabled = idx === secs.length - 1;
}
function dimGo(idx) {
  document.querySelectorAll('.dim-tab').forEach((el, i) => el.classList.toggle('active', i === idx));
  document.querySelectorAll('.dim-content').forEach((el, i) => el.classList.toggle('active', i === idx));
}
goTo(0);
`;

// ── v2 custom renderer (kept as fallback) ─────────────────────────────────────

export function gerarHtmlCompatibilizacaoCustom(
  orcamento: OrcamentoParaHtml,
  compat:    CompatibilizacaoIA,
): string {
  const ac = compat.analise_completa;
  if (!ac) return `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:sans-serif;padding:2rem"><p>Análise não disponível — status: ${compat.status}</p></body></html>`;

  const rankingAtivo = [...(compat.ranking_ajustado ?? ac.ranking ?? [])].sort((a, b) => a.posicao - b.posicao);

  const clienteNome = orcamento.nome_contato || 'Cliente';

  const hasNotaConsultor = !!(
    compat.nota_consultor?.trim() ||
    compat.ajuste_leitura?.trim() ||
    compat.ranking_ajustado ||
    compat.justificativa_ajuste?.trim()
  );

  const TAB_LABELS = [
    'Visão Geral', 'Scores', 'Comparativo', 'Por Dimensão', 'Análise', 'Conclusão',
    ...(hasNotaConsultor ? ['Nota do Consultor'] : []),
  ];

  const tabsHtml = TAB_LABELS
    .map((t, i) => `<div class="tab${i === 0 ? ' active' : ''}" onclick="goTo(${i})"><span class="tab-num">${i + 1}</span> ${esc(t)}</div>`)
    .join('');

  const sections = [
    sectionVisaoGeral(orcamento, rankingAtivo, ac.analise_comparativa?.escopo ?? ''),
    sectionScores(rankingAtivo),
    sectionComparativo(rankingAtivo),
    sectionPorDimensao(ac.analise_comparativa ?? null, rankingAtivo),
    sectionAnalise(rankingAtivo, ac.metodologia),
    sectionConclusao(rankingAtivo, ac.recomendacao_geral, ac.justificativa_recomendacao, ac.empresa_recomendada_id),
    ...(hasNotaConsultor
      ? [sectionNotaConsultor(compat.nota_consultor, compat.ajuste_leitura, compat.aprovado_em, compat.ranking_ajustado, compat.justificativa_ajuste)]
      : []),
  ];

  const sectionsHtml = sections
    .map((content, i) => `<div class="section${i === 0 ? ' active' : ''}">${content}</div>`)
    .join('\n');

  const logoSvg = `<svg class="brand-footer-icon" viewBox="0 0 148 110" width="34" height="24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="16" height="72" rx="8" fill="#F7A226"/><circle cx="65" cy="38" r="30" fill="#F7A226"/><circle cx="100" cy="38" r="30" fill="#F7A226"/><path d="M 44 80 Q 74 102 108 84 L 113 92" stroke="#F7A226" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compatibilização — ${esc(clienteNome)} · Reforma100</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:wght@400&family=Nunito:wght@300;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<div class="header">
  <div class="logo-oficial">
    ${logoSvg}
    <span class="logo-word">reforma<strong class="logo-bold">100</strong></span>
  </div>
  <div class="header-client">
    <strong>${esc(clienteNome)}</strong>
    Compatibilização de Orçamentos · ${esc(mesAtual())}
  </div>
</div>
<div class="orange-line"></div>

<div class="tabs">${tabsHtml}</div>

${sectionsHtml}

<div class="footer-nav">
  <button class="nav-btn" id="prevBtn" onclick="goTo(currentSection-1)" disabled>← Anterior</button>
  <div class="nav-counter" id="navCounter">1 de ${TAB_LABELS.length}</div>
  <button class="nav-btn" id="nextBtn" onclick="goTo(currentSection+1)">Próxima →</button>
</div>

<div class="brand-footer">
  ${logoSvg}
  <span style="font-family:'Nunito',sans-serif;font-weight:300">reforma</span><strong>100</strong>
  <span>Seu hub de reformas 100% seguro e confiável</span>
</div>

<script>${SCRIPT.replace(/<\//g, '<\\/')}<\/script>
</body>
</html>`;
}

// ── Orchestrator (v9 adapter path) ────────────────────────────────────────────

export function gerarHtmlCompatibilizacao(
  orcamento: OrcamentoParaHtml,
  compat:    CompatibilizacaoIA,
): string {
  try {
    const data = adaptarParaV9(orcamento, compat);
    return buildClientHTML(data);
  } catch (err) {
    console.warn('[gerarHtmlCompatibilizacao] v9 falhou, usando fallback v2:', err);
    return gerarHtmlCompatibilizacaoCustom(orcamento, compat);
  }
}
