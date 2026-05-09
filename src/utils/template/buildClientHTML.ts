/**
 * Extracted from reforma100_master_reconstruido_v9_codex.html (3rd buildClientHTML block).
 * Changes from original:
 *  - @font-face base64 blocks removed → Google Fonts CDN link injected in <head>
 *  - .td-ok / .td-warn / .td-hl added (were missing from CLIENT_CSS)
 *  - Converted to TypeScript with minimal type annotations
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface V9Proposal {
  name?:             string;
  shortName?:        string;
  colorClass?:       string;
  color?:            string;
  decisionGradient?: string;
  type?:             string;
  value?:            number;
  valueLabel?:       string;
  summary?:          string;
  payment?:          string;
  includes?:         string[];
  alerts?:           string[];
  excludes?:         string[];
  marketBadge?:      string;
  marketBadgeClass?: string;
  decisionTag?:      string;
  decisionTitle?:    string;
  decisionBullets?:  string[];
  __disabled?:       boolean;
}

export interface V9Card {
  label?:  string;
  value?:  string;
  desc?:   string;
  class?:  string;
}

export interface V9Analysis {
  title?:      string;
  class?:      string;
  paragraphs?: string[];
}

export interface V9Alert {
  class?: string;
  text?:  string;
}

export interface V9ChartBar {
  label?: string;
  desc?:  string;
  value?: number;
  color?: string;
  tip?:   string;
}

export interface V9ChartGroup {
  title?:  string;
  quote?:  string;
  cards?:  V9Card[];
  bars?:   V9ChartBar[];
  max?:    number;
}

export interface V9SinapiBar {
  label?:  string;
  value?:  number;
  color?:  string;
  refMin?: number;
  refMax?: number;
  tip?:    string;
}

export interface V9Data {
  client: {
    name:              string;
    location?:         string;
    area?:             number | string;
    propertyType?:     string;
    purpose?:          string;
    startIntent?:      string;
    consultant?:       string;
    subtitle?:         string;
    monthLabel?:       string;
    clientBudget?:     number;
    clientBudgetPublic?: boolean;
  };
  proposals:        V9Proposal[];
  summaryCards?:    V9Card[];
  scopeAlert?:      string;
  scopeTable?:      (string | null)[][];
  comparisonRows?:  (string | null)[][];
  technicalRows?:   (string | null)[][];
  analyses?:        V9Analysis[];
  analysisAlerts?:  V9Alert[];
  conclusionIntro?: string;
  budgetAdvice?:    string;
  chartGroups?:     V9ChartGroup[];
  sinapiBars?:      V9SinapiBar[];
  sinapiMax?:       number;
  sinapiBreakdown?: (string | null)[][];
  marketTableRows?: (string | null)[][];
  marketMethodology?: string;
  marketRangeCard?: V9Card;
  footerTech?:      string;
}

// ── Helpers (verbatim from v9, typed) ─────────────────────────────────────────

function esc(s: string | number | null | undefined): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function moneyBR(v: number | null | undefined): string {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function buildCards(cards: V9Card[]): string {
  const n = cards.length, cls = n === 1 ? 'g1' : n === 2 ? 'g2' : 'g3';
  return '<div class="' + cls + '">' + cards.map(c =>
    '<div class="card ' + esc(c.class || 'cb') + '"><div class="card-label">' + esc(c.label) + '</div><div class="card-value">' + esc(c.value) + '</div><div class="card-desc">' + esc(c.desc || '') + '</div></div>'
  ).join('') + '</div>';
}

function buildTable(headers: string[], rows: (string | null)[][], headerColors?: (string | null)[]): string {
  return '<div class="table-wrap"><table><tr>' +
    headers.map((h, i) =>
      '<th' + (headerColors && headerColors[i] ? ' style="background:' + esc(headerColors[i]) + '"' : '') + '>' + esc(h) + '</th>'
    ).join('') + '</tr>' +
    rows.map(r => '<tr>' + r.map(c => '<td>' + String(c ?? '') + '</td>').join('') + '</tr>').join('') +
    '</table></div>';
}

function buildVerticalChart(group: V9ChartGroup): string {
  const bars = group.bars || [];
  if (!bars.length) return '';
  const max = group.max || Math.max(1, ...bars.map(b => Number(b.value) || 0));
  const grid = [0,1,2,3,4].map(i => {
    const pct = i / 4, val = Math.round(max * (1 - pct));
    return '<div class="vchart-grid-line" style="top:' + (pct * 100) + '%"><span class="vchart-grid-label">' + moneyBR(val) + '</span></div>';
  }).join('');
  const cols = bars.map(b => {
    const h = Math.max(4, Math.round(((Number(b.value) || 0) / max) * 100));
    return '<div class="vcol" data-tip="' + esc(b.tip || '') + '"><div class="vcol-amount">' + moneyBR(b.value) + '</div><div class="vcol-bar-wrap"><div class="vcol-bar" data-target="' + h + '" style="height:0;background:' + esc(b.color || '#2D3395') + '"></div></div><div class="vcol-label">' + esc(b.label) + '</div><div class="vcol-desc">' + esc(b.desc || '') + '</div></div>';
  }).join('');
  return '<div class="chart-box"><div class="chart-title">' + esc(group.title) + '</div>' +
    (group.cards ? buildCards(group.cards) : '') +
    '<div class="vchart-wrap"><div class="vchart-grid">' + grid + '</div><div class="vchart">' + cols + '</div></div>' +
    '<div class="quote-box">' + esc(group.quote || '') + '</div></div>';
}

function buildSinapiBars(data: Pick<V9Data, 'sinapiBars' | 'sinapiMax'>): string {
  const bars = data.sinapiBars || [];
  if (!bars.length) return '';
  const max = data.sinapiMax || Math.max(1, ...bars.map(b => Number(b.value) || 0));
  return '<div class="chart-box"><div class="chart-title">Comparativo SINAPI / referência de mercado</div>' +
    bars.map(b => {
      const w    = Math.max(2, ((Number(b.value) || 0) / max) * 100);
      const min  = ((Number(b.refMin) || 0) / max) * 100;
      const maxr = ((Number(b.refMax) || 0) / max) * 100;
      return '<div class="bar-row" data-tip="' + esc(b.tip || '') + '"><div class="bar-label">' + esc(b.label) + '</div><div class="bar-track">' +
        '<div class="sinapi-ref-area" style="left:' + min + '%;width:' + Math.max(1, maxr - min) + '%;background:rgba(247,162,38,.18)"></div>' +
        '<div class="sinapi-ref-line" style="left:' + min + '%;background:#E08B00"></div>' +
        '<div class="sinapi-ref-line" style="left:' + maxr + '%;background:#E08B00"></div>' +
        '<div class="bar-fill" data-target="' + w + '" style="width:0;background:' + esc(b.color || '#2D3395') + '">' + moneyBR(b.value) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
}

function buildMarketTable(rows: (string | null)[][], area: number): string {
  const areaLabel = area ? String(area) + 'm²' : 'área';
  const hdr = ['Tipologia', 'Faixa R$/m²', 'Para ' + areaLabel, 'Onde as propostas se encaixam?'];
  return '<div class="table-wrap"><table><tr>' + hdr.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' +
    rows.map(r => {
      const label = String(r[0] || '');
      const isStar = label.startsWith('★');
      const trCls  = isStar ? ' class="td-hl"' : '';
      const displayLabel = isStar ? '<strong>' + esc(label.replace('★ ', '')) + ' ★</strong>' : esc(label);
      const col4 = String(r[3] || '—');
      const ok4   = col4.startsWith('✔');
      const warn4 = col4.startsWith('✗');
      const col4html = ok4   ? '<td class="td-ok">'   + esc(col4) + '</td>'
                      : warn4 ? '<td class="td-warn">' + esc(col4) + '</td>'
                      :         '<td>'                 + esc(col4) + '</td>';
      return '<tr' + trCls + '><td>' + displayLabel + '</td><td>' + esc(String(r[1] || '')) + '</td><td>' + esc(String(r[2] || '—')) + '</td>' + col4html + '</tr>';
    }).join('') + '</table></div>';
}

function buildDecisionCards(data: Pick<V9Data, 'proposals'>): string {
  const active = (data.proposals || []).filter(p => !p.__disabled);
  const n = active.length, cls = n === 1 ? 'g1' : n === 2 ? 'g2' : 'g3';
  return '<div class="' + cls + '">' + active.map(p => {
    const grad    = (p.decisionGradient || 'linear-gradient(150deg,#2D3395 0%,#3d4ab5 100%)').replace('135deg', '150deg');
    const bullets = (p.decisionBullets || []).map(b => '<div>→ ' + esc(b) + '</div>').join('');
    const valueType = [p.valueLabel || moneyBR(p.value), p.type].filter(Boolean).join(' — ');
    return '<div style="background:' + grad + ';border-radius:14px;padding:26px;color:#fff;display:flex;flex-direction:column;gap:10px">' +
      '<div style="font-size:.68rem;text-transform:uppercase;letter-spacing:1.2px;opacity:.65">' + esc(p.decisionTag || '') + '</div>' +
      '<div style="font-family:\'DM Serif Display\',serif;font-size:1.15rem;line-height:1.3">' + esc(p.decisionTitle || ('Siga com ' + (p.shortName || 'esta proposta') + ' se você prioriza...')) + '</div>' +
      '<div style="font-size:.81rem;line-height:1.9;opacity:.9">' + bullets + '</div>' +
      '<div style="margin-top:auto;background:rgba(255,255,255,.15);border-radius:8px;padding:12px 16px;text-align:center;font-weight:700;font-size:.95rem;border:1px solid rgba(255,255,255,.25)">' + esc(valueType) + '</div>' +
      '</div>';
  }).join('') + '</div>';
}

// ── CSS (extracted, fonts replaced by CDN link, 3 missing classes added) ──────

const CLIENT_CSS = [
  'body{font-family:\'DM Sans\',sans-serif;background:#F5F6FA;color:#1a1a2e}',
  '.header{background:#2D3395;color:#fff;padding:0 28px;height:62px;display:flex;align-items:center;justify-content:flex-end;position:sticky;top:0;z-index:100;overflow:hidden;box-shadow:0 2px 20px rgba(20,25,100,.4)}',
  '.header-bg{position:absolute;inset:0;pointer-events:none;z-index:0}',
  '.h-glow{position:absolute;border-radius:50%;filter:blur(55px);pointer-events:none}',
  '.h-glow-o{width:320px;height:100px;background:#F7A226;opacity:.1;top:50%;right:38%;transform:translate(50%,-50%);animation:hGlow 7s ease-in-out infinite alternate}',
  '.h-glow-b{width:220px;height:100px;background:#5060d0;opacity:.1;top:50%;right:68%;transform:translate(50%,-50%);animation:hGlow 7s ease-in-out infinite alternate;animation-delay:3.5s}',
  '@keyframes hGlow{from{opacity:.05;transform:translate(50%,-50%) scale(.8)}to{opacity:.15;transform:translate(50%,-50%) scale(1.2)}}',
  '#hcv{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}',
  '.header-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;animation:floatY 7s ease-in-out infinite}',
  '@keyframes floatY{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-4px)}}',
  '.header-client{position:relative;z-index:3;text-align:right;font-size:.74rem;opacity:.82;flex-shrink:0}',
  '.header-client strong{display:block;font-size:.86rem;color:#fff;opacity:1}',
  '.logo-oficial{display:flex;align-items:center;gap:10px;text-decoration:none}',
  '.logo-word{font-family:\'Nunito\',sans-serif;font-size:1.65rem;font-weight:300;letter-spacing:.5px;line-height:1;background:linear-gradient(105deg,#fff 40%,#c8d0ff 50%,#fff 60%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:textShine 6s linear infinite}',
  '@keyframes textShine{0%{background-position:200% center}100%{background-position:-200% center}}',
  '.logo-icon-anim{animation:iconBreath 4s ease-in-out infinite}',
  '@keyframes iconBreath{0%,100%{filter:drop-shadow(0 0 6px rgba(247,162,38,.35))}50%{filter:drop-shadow(0 0 22px rgba(247,162,38,.85))}}',
  '.orange-line{height:4px;background:linear-gradient(90deg,#F7A226,#f7c26a,#F7A226);background-size:200% auto;animation:lineSweep 3s linear infinite}',
  '@keyframes lineSweep{0%{background-position:0% center}100%{background-position:200% center}}',
  '.tabs{background:#fff;border-bottom:1px solid #e0e3ef;padding:0 24px;display:flex;gap:4px;overflow-x:auto;position:sticky;top:62px;z-index:90}',
  '.tab{padding:14px 18px;cursor:pointer;font-size:.8rem;font-weight:600;color:#888;white-space:nowrap;border-bottom:3px solid transparent;transition:all .18s;display:flex;align-items:center;gap:7px}',
  '.tab:hover{color:#2D3395}.tab.active{color:#2D3395;border-bottom-color:#F7A226}',
  '.tab-num{background:#2D3395;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.7rem;transition:background .18s}',
  '.tab.active .tab-num{background:#F7A226}',
  '.section{display:none;padding:32px;max-width:1100px;margin:0 auto}.section.active{display:block;animation:fadeSlideIn .35s ease-out}',
  '@keyframes fadeSlideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}',
  '.section-title{font-family:\'DM Serif Display\',serif;font-size:1.6rem;color:#2D3395;margin-bottom:6px}.section-subtitle{font-size:.88rem;color:#888;margin-bottom:24px}',
  '.g1,.g2,.g3,.g4{display:grid;gap:16px;margin-bottom:24px}.g1{grid-template-columns:1fr}.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}',
  '@media(max-width:900px){.g2,.g3,.g4{grid-template-columns:1fr}}',
  '.card{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.07);transition:transform .2s ease,box-shadow .22s ease}.card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.11)}',
  '.cb{border-top:4px solid #2D3395}.co{border-top:4px solid #F7A226}.cg{border-top:4px solid #1B7A4A}.ca{border-top:4px solid #E08B00}.cr{border-top:4px solid #C0392B}.cs{border-top:4px solid #9e9e9e}.cp1{border-top:4px solid #0891b2}.cp2{border-top:4px solid #7c3aed}.cp3{border-top:4px solid #be185d}',
  '.card-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px}.card-value{font-size:1.4rem;font-weight:700}.card-desc{font-size:.78rem;color:#888;margin-top:4px;line-height:1.55}',
  '.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:700}.bb{background:#e8eaff;color:#2D3395}.bg{background:#e0f5ec;color:#1B7A4A}.ba{background:#fff3cd;color:#856404}.br{background:#fde8e8;color:#C0392B}.bs{background:#f0f0f0;color:#555}',
  '.alert{border-radius:8px;padding:14px 18px;font-size:.85rem;margin-bottom:16px;line-height:1.6}.al-a{background:#fff8e1;border-left:4px solid #F7A226;color:#7d5a00}.al-b{background:#eef0ff;border-left:4px solid #2D3395;color:#1a2070}.al-g{background:#e0f5ec;border-left:4px solid #1B7A4A;color:#0d3d23}.al-r{background:#fde8e8;border-left:4px solid #C0392B;color:#7d1a1a}',
  '.table-wrap{overflow-x:auto;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.07);margin-bottom:24px}table{width:100%;border-collapse:collapse;background:#fff;font-size:.82rem}',
  'th{background:#2D3395;color:#fff;padding:12px 14px;text-align:left;font-weight:600;font-size:.78rem}td{padding:11px 14px;border-bottom:1px solid #f0f0f0;vertical-align:middle}tr:nth-child(even) td{background:#f8f9fc}tr:last-child td{border-bottom:none}',
  '.td-ok{background:#e0f5ec!important}.td-warn{background:#fff8e1!important}.td-hl{background:#eef0ff!important;font-weight:700}.td-red{background:#fde8e8!important}',
  '.check-y{color:#1B7A4A;font-weight:700}.check-n{color:#C0392B;font-weight:700}.check-o{color:#E08B00;font-weight:600}',
  '@keyframes rowSlide{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}',
  '.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:14px}.li{display:flex;align-items:center;gap:6px;font-size:.75rem;color:#555}.ld{width:12px;height:12px;border-radius:3px}',
  '.vtip strong{color:#F7A226;display:block;margin-bottom:2px;font-size:.8rem}.vtip .ref{color:#888;font-size:.69rem;margin-top:5px;border-top:1px solid rgba(255,255,255,.1);padding-top:5px}.vtip .ok{color:#6fcf97}.vtip .warn{color:#F7A226}',
  '.chart-box:hover{box-shadow:0 4px 18px rgba(45,51,149,.1)}.bar-row{cursor:pointer;border-radius:5px;padding:1px 0;transition:background .15s}.bar-row:hover{background:rgba(45,51,149,.05)}.bar-row:hover .bar-fill{filter:brightness(1.1)}',
  '.chart-box{background:#fff;border-radius:10px;padding:24px;box-shadow:0 1px 6px rgba(0,0,0,.07);margin-bottom:24px}.chart-title{font-size:.88rem;font-weight:700;color:#2D3395;margin-bottom:20px}',
  '.vchart-wrap{position:relative;padding:8px 0 0}.vchart-grid{position:absolute;top:0;left:44px;right:0;bottom:48px;pointer-events:none}.vchart-grid-line{position:absolute;left:0;right:0;height:1px;background:#f0f0f0}.vchart-grid-label{position:absolute;right:calc(100% + 6px);transform:translateY(-50%);font-size:.65rem;color:#bbb;white-space:nowrap}',
  '.vchart{display:flex;align-items:flex-end;gap:10px;height:240px;padding:0 8px 0 44px;position:relative}.vcol{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;cursor:pointer;transition:transform .18s}.vcol:hover{transform:translateY(-3px)}',
  '.vcol-amount{font-size:.78rem;font-weight:700;margin-bottom:5px;white-space:nowrap;text-align:center}.vcol-bar-wrap{flex:1;display:flex;align-items:flex-end;width:100%}.vcol-bar{width:100%;border-radius:5px 5px 0 0;transition:height 1s cubic-bezier(.25,.46,.45,.94)}',
  '.vcol-label{font-size:.73rem;font-weight:600;color:#444;text-align:center;margin-top:8px;line-height:1.3;padding:0 2px}.vcol-desc{font-size:.67rem;color:#aaa;text-align:center;margin-top:2px}',
  '.bar-row{display:flex;align-items:center;margin-bottom:12px;gap:10px}.bar-label{font-size:.75rem;width:220px;flex-shrink:0;color:#555;font-weight:500}.bar-track{flex:1;background:#f0f0f0;border-radius:4px;height:28px;position:relative;overflow:hidden}',
  '.bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:.71rem;font-weight:700;color:#fff;white-space:nowrap;transition:width 1s cubic-bezier(.25,.46,.45,.94)}',
  '.sinapi-ref-area{position:absolute;top:0;height:100%;pointer-events:none;z-index:1}.sinapi-ref-line{position:absolute;top:0;height:100%;width:2px;pointer-events:none;z-index:4}',
  '.footer-nav{background:#fff;border-top:1px solid #e0e3ef;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;bottom:0;z-index:100}.nav-btn{font-family:\'DM Sans\',sans-serif;background:#2D3395;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:.82rem;font-weight:600;cursor:pointer}.nav-btn:disabled{background:#ccc;cursor:default}.nav-counter{font-size:.82rem;color:#888}',
  '.brand-footer{display:flex;align-items:center;justify-content:center;gap:10px;background:#2D3395;color:#fff;text-align:center;padding:16px;font-size:.8rem}.brand-footer strong{color:#F7A226}.brand-footer-icon{animation:iconBreath 5s ease-in-out infinite;animation-delay:1s}',
  '.divider{height:1px;background:#e8eaff;margin:24px 0}h3{font-family:\'DM Serif Display\',serif;font-size:1.1rem;color:#2D3395;margin:20px 0 10px}.analysis-text p{font-size:.88rem;line-height:1.8;color:#333;margin-bottom:12px}',
  '.vtip{position:fixed;background:#131428;color:#e8e8ff;padding:12px 15px;border-radius:10px;font-size:.76rem;line-height:1.7;max-width:280px;z-index:9999;pointer-events:none;opacity:0;transition:opacity .18s,transform .18s;transform:translateY(6px);box-shadow:0 8px 28px rgba(0,0,0,.35);border-left:3px solid #F7A226}',
  '.vtip.show{opacity:1;transform:translateY(0)}.quote-box{background:#eef0ff;border-left:4px solid #2D3395;padding:14px 18px;border-radius:0 8px 8px 0;font-size:.85rem;color:#1a2070;margin-top:18px;line-height:1.7}',
  '.center-note{text-align:center;font-size:.92rem;color:#2D3395;margin-top:18px}',
].join('');

// ── Inline JS (verbatim from v9) ──────────────────────────────────────────────

const CLIENT_SCRIPT = "let currentSection=0;function sections(){return Array.from(document.querySelectorAll('.section'));}function tabs(){return Array.from(document.querySelectorAll('.tab'));}function animateActive(active){active.querySelectorAll('.vcol-bar').forEach(bar=>{const t=bar.dataset.target||0;requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.height=t+'%';}));});active.querySelectorAll('.bar-fill').forEach(bar=>{const t=bar.dataset.target||0;requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.width=t+'%';}));});}function goTo(idx){const secs=sections();if(idx<0||idx>=secs.length)return;currentSection=idx;secs.forEach((el,i)=>{el.classList.toggle('active',i===idx);if(i===idx){el.querySelectorAll('table tr').forEach((tr,j)=>{tr.style.animation='none';void tr.offsetHeight;tr.style.animation='rowSlide .28s ease-out '+(j*35)+'ms both';});el.querySelectorAll('.card').forEach((c,j)=>{c.style.animation='none';void c.offsetHeight;c.style.animation='fadeSlideIn .3s ease-out '+(j*60)+'ms both';});}});tabs().forEach((el,i)=>el.classList.toggle('active',i===idx));const counter=document.getElementById('navCounter');if(counter)counter.textContent=(idx+1)+' de '+secs.length;const p=document.getElementById('prevBtn');const n=document.getElementById('nextBtn');if(p)p.disabled=idx===0;if(n)n.disabled=idx===secs.length-1;animateActive(secs[idx]);}const tipEl=document.createElement('div');tipEl.className='vtip';document.body.appendChild(tipEl);function moveTip(e){const x=e.clientX+18,y=e.clientY+16;tipEl.style.left=Math.min(x,window.innerWidth-tipEl.offsetWidth-14)+'px';tipEl.style.top=Math.min(y,window.innerHeight-tipEl.offsetHeight-14)+'px';}document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(t){tipEl.innerHTML=t.dataset.tip;tipEl.classList.add('show');moveTip(e);}});document.addEventListener('mousemove',e=>{if(tipEl.classList.contains('show'))moveTip(e);});document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tip]'))tipEl.classList.remove('show');});(function(){const cv=document.getElementById('hcv');if(!cv)return;const ctx=cv.getContext('2d');let W=0,H=0,pts=[];function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}function mk(){return{x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+.3,vx:(Math.random()-.5)*.25,vy:-Math.random()*.35-.08,a:Math.random()*.45+.08,c:Math.random()>.72?'#F7A226':'#fff'};}resize();window.addEventListener('resize',resize);for(let i=0;i<48;i++)pts.push(mk());(function loop(){ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.y<-4){p.x=Math.random()*W;p.y=H+4;}ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.c;ctx.globalAlpha=p.a;ctx.fill();});ctx.globalAlpha=1;requestAnimationFrame(loop);})();})();goTo(0);";

// ── buildClientHTML (verbatim from v9, CLIENT_CSS ref → local constant) ───────

export function buildClientHTML(data: V9Data): string {
  const activeProposals = (data.proposals || []).filter(p => !p.__disabled);
  const proposalHeaders      = ['Serviço / Item'].concat(activeProposals.map(p => (p.shortName || '') + ' — ' + (p.type || '')));
  const proposalHeaderColors = [''].concat(activeProposals.map(p => p.color || '#2D3395'));
  const comparisonHeaders    = ['Critério'].concat(activeProposals.map(p => p.name || ''));
  const comparisonHeaderColors = [''].concat(activeProposals.map(p => p.color || '#2D3395'));
  const scopeRows       = (data.scopeTable      || []).map(r => [r[0]].concat(r.slice(1)));
  const comparisonRows  = (data.comparisonRows  || []).map(r => [r[0]].concat(r.slice(1)));
  const technicalRows   = (data.technicalRows   || []).map(r => [r[0]].concat(r.slice(1)));
  const marketRows      = (data.marketTableRows || []).map(r => r.length >= 4 ? [r[0], r[1], r[2], r[3]] : [r[0], r[1], '—', r[2] || '—']);

  const conclusionCards: V9Card[] = activeProposals.map(p => ({
    label: p.shortName, value: p.valueLabel || moneyBR(p.value), desc: p.marketBadge, class: p.colorClass,
  }));
  if (data.marketRangeCard) conclusionCards.push(data.marketRangeCard);

  const budgetBlock = (() => {
    const b    = Number(data.client?.clientBudget) || 0;
    const vals = activeProposals.map(p => p.value ?? 0).filter(v => v > 0);
    const bMin = vals.length ? Math.min(...vals) : 0;
    const bMax = vals.length ? Math.max(...vals) : 0;
    const diff = bMin > 0 ? Math.round(((bMin - b) / b) * 100) : 0;
    const diffText = diff > 0 ? ('+' + diff + '% acima da sua estimativa') : diff < 0 ? (diff + '% abaixo da sua estimativa') : 'alinhado com sua estimativa';
    const numBlock = (data.client?.clientBudgetPublic && b > 0)
      ? '<div class="alert al-a" style="margin-bottom:12px;font-size:.97em"><strong>💡 Estimativa do cliente vs. propostas recebidas</strong><br>Você estimou <strong>' + moneyBR(b) + '</strong>' + (bMin > 0 ? ' · Menor proposta: <strong>' + moneyBR(bMin) + '</strong> (' + diffText + ')' : '') + (bMax > bMin ? ' · Maior proposta: <strong>' + moneyBR(bMax) + '</strong>' : '') + '</div>'
      : '';
    const adviceBlock = data.budgetAdvice
      ? '<div class="alert al-b" style="margin-bottom:20px"><strong>🎯 Análise de adequação ao orçamento</strong><br>' + esc(data.budgetAdvice) + '</div>'
      : '';
    return numBlock + adviceBlock;
  })();

  const paymentCards: V9Card[] = activeProposals.map(p => ({
    label: (p.shortName || '') + ' — ' + (p.type || ''),
    value: p.valueLabel || moneyBR(p.value),
    desc:  p.payment,
    class: p.colorClass,
  }));

  const sinapiBreakHeaders = ['Disciplina / Total', ...activeProposals.map(p => p.shortName || ''), 'Ref. SINAPI-SP', 'Status'];
  const sinapiBreakColors  = ['', ...activeProposals.map(p => p.color || '#2D3395'), '', ''];
  const sinapiBreakRows    = (data.sinapiBreakdown || []);
  const clientArea         = Number(data.client?.area) || 0;

  const parts: string[] = [];

  // <head>
  parts.push(
    '<!DOCTYPE html><html lang="pt-BR"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Compatibilização — ' + esc(data.client.name) + ' · Reforma100</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:wght@400&family=Nunito:wght@300;800&display=swap" rel="stylesheet">' +
    '<style>' + CLIENT_CSS + '</style>' +
    '</head><body>'
  );

  // header
  parts.push(
    '<div class="header">' +
    '<div class="header-bg"><div class="h-glow h-glow-o"></div><div class="h-glow h-glow-b"></div><canvas id="hcv"></canvas></div>' +
    '<div class="header-stage"><div class="logo-oficial"><span class="logo-word">reforma</span>' +
    '<svg class="logo-icon-anim" viewBox="0 0 148 110" width="54" height="40" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="16" height="72" rx="8" fill="#F7A226"/><circle cx="65" cy="38" r="30" fill="#F7A226"/><circle cx="100" cy="38" r="30" fill="#F7A226"/><path d="M 44 80 Q 74 102 108 84 L 113 92" stroke="#F7A226" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</div></div>' +
    '<div class="header-client"><strong>' + esc(data.client.name) + ' — ' + esc(data.client.location || 'São Paulo-SP') + '</strong>' + esc(String(data.client.area || '')) + (data.client.area ? 'm² · ' : '') + esc(data.client.subtitle || '') + '</div>' +
    '</div><div class="orange-line"></div>'
  );

  // tabs
  parts.push(
    '<div class="tabs">' +
    ['Escopo', 'Gráfico', 'Comparativo', 'Tabela Técnica', 'Mercado', 'Análise', 'Conclusão'].map((t, i) =>
      '<div class="tab ' + (i === 0 ? 'active' : '') + '" onclick="goTo(' + i + ')"><span class="tab-num">' + (i + 1) + '</span> ' + t + '</div>'
    ).join('') +
    '</div>'
  );

  // section 1 — Escopo
  parts.push(
    '<div class="section active">' +
    '<div class="section-title">Escopo do Projeto</div>' +
    '<div class="section-subtitle">' + esc(data.client.name) + ' · ' + esc(data.client.location || 'São Paulo-SP') + (data.client.area ? ' · ' + esc(String(data.client.area)) + 'm²' : '') + ' · ' + esc(data.client.purpose || '') + ' · Consultor ' + esc(data.client.consultant || 'Reforma100') + '</div>' +
    buildCards(data.summaryCards || []) +
    '<div class="alert al-b"><strong>ℹ Natureza das propostas:</strong> ' + esc(data.scopeAlert || '') + '</div>' +
    '<h3 style="margin-top:0">Escopo solicitado</h3>' +
    buildTable(proposalHeaders, scopeRows, proposalHeaderColors) +
    '<h3>Condições de pagamento</h3>' +
    buildCards(paymentCards) +
    '</div>'
  );

  // section 2 — Gráfico
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Gráfico Comparativo</div>' +
    '<div class="section-subtitle">Cada proposta comparada com sua referência de mercado' + (data.client.area ? ' — ' + esc(String(data.client.area)) + 'm²' : '') + (data.client.monthLabel ? ', SP, ' + esc(data.client.monthLabel) : '') + '</div>' +
    (data.chartGroups || []).map(buildVerticalChart).join('') +
    '<div class="alert al-a"><strong>⚠ Escopos diferentes:</strong> compare valores considerando o que cada pacote já inclui e o que ainda precisa ser contratado por fora.</div>' +
    '</div>'
  );

  // section 3 — Comparativo
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Comparativo Técnico</div>' +
    '<div class="section-subtitle">O que cada proposta inclui e como se posiciona no mercado.</div>' +
    buildCards(activeProposals.map(p => ({ label: (p.shortName || '') + ' — ' + (p.type || ''), value: p.valueLabel || moneyBR(p.value), desc: p.summary, class: p.colorClass }))) +
    buildTable(comparisonHeaders, comparisonRows, comparisonHeaderColors) +
    '<div class="alert al-a"><strong>⚠ Itens fora do escopo comum:</strong> confirme marcenaria, iluminação decorativa, ar-condicionado e demais complementos antes da contratação final.</div>' +
    '</div>'
  );

  // section 4 — Tabela Técnica
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Tabela Técnica</div>' +
    '<div class="section-subtitle">Comparativo técnico completo — ' + activeProposals.length + ' empresa' + (activeProposals.length !== 1 ? 's' : '') + '.</div>' +
    buildTable(comparisonHeaders, technicalRows, comparisonHeaderColors) +
    '</div>'
  );

  // section 5 — Mercado
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Mercado</div>' +
    '<div class="section-subtitle">Posicionamento vs. SINAPI-SP e CUB-SP' + (data.client.monthLabel ? ' — ' + esc(data.client.monthLabel) : '') + (data.client.area ? ' · ' + esc(String(data.client.area)) + 'm²' : '') + (data.client.location ? ' · ' + esc(data.client.location) : '') + '</div>' +
    '<div class="alert al-b"><strong>ℹ Metodologia:</strong> ' + esc(data.marketMethodology || '') + '</div>' +
    (marketRows.length
      ? '<h3>Tipologias de referência — SP ' + (data.client.monthLabel || '').slice(-4) + '</h3>' + buildMarketTable(marketRows, clientArea)
      : '') +
    buildSinapiBars(data) +
    (sinapiBreakRows.length
      ? '<h3 style="margin-top:24px">Validação SINAPI por disciplina</h3>' + buildTable(sinapiBreakHeaders, sinapiBreakRows, sinapiBreakColors)
      : '') +
    '</div>'
  );

  // section 6 — Análise
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Análise</div>' +
    '<div class="section-subtitle">Leitura qualitativa de cada proposta.</div>' +
    (data.analyses || []).map(a =>
      '<div class="card ' + esc(a.class || 'cb') + '"><h3 style="margin-top:0">' + esc(a.title) + '</h3>' +
      '<div class="analysis-text">' + (a.paragraphs || []).map(p => '<p>' + esc(p) + '</p>').join('') + '</div></div>'
    ).join('<div style="height:16px"></div>') +
    (data.analysisAlerts || []).map(a => '<div class="alert ' + esc(a.class || 'al-b') + '">' + esc(a.text || '') + '</div>').join('') +
    '</div>'
  );

  // section 7 — Conclusão
  parts.push(
    '<div class="section">' +
    '<div class="section-title">Conclusão</div>' +
    '<div class="section-subtitle">Resumo final no padrão cliente-facing.</div>' +
    budgetBlock +
    buildCards(conclusionCards) +
    '<div class="alert al-g">' + esc(data.conclusionIntro || '') + '</div>' +
    '<div class="g3">' + activeProposals.map(p =>
      '<div class="card ' + esc(p.colorClass || 'cb') + '">' +
      '<div class="card-label">' + esc(p.shortName) + '</div>' +
      '<div class="card-value">' + esc(p.valueLabel || moneyBR(p.value)) + '</div>' +
      '<div style="margin:10px 0"><span class="badge ' + esc(p.marketBadgeClass || 'bg') + '">' + esc(p.marketBadge || '') + '</span></div>' +
      '<div class="card-desc" style="margin-top:10px;font-size:.82rem;line-height:1.7;color:#333">' +
      (p.includes || []).slice(0, 4).map(s => '<div>✔ ' + esc(s.slice(0, 70)) + '</div>').join('') +
      (p.alerts   || []).slice(0, 2).map(s => '<div style="color:#8a5a00">⚠ ' + esc(s.slice(0, 70)) + '</div>').join('') +
      (p.excludes || []).slice(0, 2).map(s => '<div style="color:#8a1f1f">✗ ' + esc(s.slice(0, 70)) + '</div>').join('') +
      '</div></div>'
    ).join('') + '</div>' +
    '<div class="divider"></div>' +
    '<h3 style="margin-top:0">Com qual empresa você quer seguir?</h3>' +
    buildDecisionCards(data) +
    '<div class="center-note">Compartilhe com seu consultor Reforma100 qual empresa você deseja seguir para darmos os próximos passos juntos.</div>' +
    '<div class="divider"></div>' +
    '<div class="alert al-b">' + esc(data.footerTech || '') + '</div>' +
    '</div>'
  );

  // footer nav + brand
  parts.push(
    '<div class="footer-nav">' +
    '<button class="nav-btn" id="prevBtn" onclick="goTo(currentSection-1)">← Anterior</button>' +
    '<div class="nav-counter" id="navCounter">1 de 7</div>' +
    '<button class="nav-btn" id="nextBtn" onclick="goTo(currentSection+1)">Próxima →</button>' +
    '</div>' +
    '<div class="brand-footer">' +
    '<svg class="brand-footer-icon" viewBox="0 0 148 110" width="34" height="24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="16" height="72" rx="8" fill="#F7A226"/><circle cx="65" cy="38" r="30" fill="#F7A226"/><circle cx="100" cy="38" r="30" fill="#F7A226"/><path d="M 44 80 Q 74 102 108 84 L 113 92" stroke="#F7A226" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<span style="font-family:\'Nunito\',sans-serif;font-weight:300">reforma</span><strong>100</strong>' +
    '<span>Seu hub de reformas 100% seguro e confiável</span>' +
    '</div>'
  );

  // inline script
  parts.push('<script>' + CLIENT_SCRIPT.replace(/<\//g, '<\\/') + '<\/script></body></html>');

  return parts.join('');
}
