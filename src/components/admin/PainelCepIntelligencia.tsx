import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const C = {
  NV:      '#0D1B2A',
  NV2:     '#1A2E42',
  LJ:      '#E8510A',
  FD:      '#F5F3EF',
  BD:      '#E0DDD7',
  CZ:      '#6B6760',
  text:    '#1A1A1A',
  white:   '#FFFFFF',
  green:   '#1A7A4A',
  greenBg: '#E8F5EE',
};

interface CepPesquisa {
  id: string;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  zona: string | null;
  classificacao: string | null;
  potencial: string | null;
  status_regiao: string | null;
  sdr_id: string | null;
  lead_id: string | null;
  created_at: string;
}

interface RegiaoExtra {
  faixa_min: number | null;
  faixa_max: number | null;
  descricao: string | null;
  fonte: 'manual' | 'ia_cache' | 'desconhecida';
  confianca?: string | null;
}

// ── Badges de classificação — todos os valores canônicos + legados ─────────
const CLASS_CORES: Record<string, { bg: string; clr: string }> = {
  // Canônicos novos
  'A+':   { bg: '#F5EEF8', clr: '#6B21A8' },
  'A':    { bg: '#EEF0FF', clr: '#3B35B7' },
  'A-':   { bg: '#E8F5EE', clr: '#1A7A4A' },
  'B+':   { bg: '#FFF5DC', clr: '#9A6200' },
  'B':    { bg: '#F5F3EF', clr: '#6B6760' },
  'B-':   { bg: '#F5EEE8', clr: '#8B5E3C' },
  'C+':   { bg: '#FFF0E8', clr: '#E8510A' },
  'C':    { bg: '#FEF9C3', clr: '#854D0E' },
  'C/D':  { bg: '#FEE2E2', clr: '#B91C1C' },
  'D':    { bg: '#FECACA', clr: '#991B1B' },
  // Legados (backward compat — registros antigos)
  'Premium A+':              { bg: '#F5EEF8', clr: '#6B21A8' },
  'Premium A':               { bg: '#EEF0FF', clr: '#3B35B7' },
  'Oportunidade':            { bg: '#FFF0E8', clr: '#E8510A' },
  'Periférico com potencial':{ bg: '#FEF9C3', clr: '#854D0E' },
};

const POTENCIAL_COR: Record<string, string> = {
  'alto':        '#1A7A4A',
  'médio':       '#9A6200',
  'médio-baixo': '#C05621',
  'baixo':       '#6B6760',
};
const POTENCIAL_EMOJI: Record<string, string> = {
  'alto':        '🔥',
  'médio':       '⚡',
  'médio-baixo': '↓',
  'baixo':       '○',
};

const PERIODOS = [
  { label: 'Hoje',        days: 0  },
  { label: 'Últimos 7d',  days: 7  },
  { label: 'Últimos 30d', days: 30 },
  { label: 'Últimos 90d', days: 90 },
  { label: 'Tudo',        days: -1 },
];

// Apenas valores canônicos novos no filtro
const CLASSIFICACOES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C/D', 'D'];
const POTENCIAIS      = ['alto', 'médio', 'médio-baixo', 'baixo'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeGeo(s: string): string {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function fmtFaixa(min: number | null, max: number | null): string {
  if (!min && !max) return '';
  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${Math.round(v / 1000)}k` : `R$ ${v.toLocaleString('pt-BR')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `até ${fmt(max)}`;
  return `a partir de ${fmt(min!)}`;
}

function mkInput(style?: React.CSSProperties): React.CSSProperties {
  return {
    fontSize: 13,
    padding: '7px 10px',
    border: `1px solid ${C.BD}`,
    borderRadius: 7,
    background: C.white,
    fontFamily: '"DM Sans", sans-serif',
    color: C.text,
    ...style,
  };
}
function mkSelect(style?: React.CSSProperties): React.CSSProperties {
  return { ...mkInput(), cursor: 'pointer', ...style };
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PainelCepIntelligencia() {
  const [pesquisas, setPesquisas]       = useState<CepPesquisa[]>([]);
  const [extras, setExtras]             = useState<Map<string, RegiaoExtra>>(new Map());
  const [sdrNomes, setSdrNomes]         = useState<Map<string, string>>(new Map());
  const [expandido, setExpandido]       = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [exportando, setExportando]     = useState(false);

  const [periodo, setPeriodo]           = useState(30);
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroClass, setFiltroClass]   = useState('');
  const [filtroPotencial, setFiltroPotencial] = useState('');

  // ── Enriquecimento via lookup nas tabelas de origem ──────────────────────
  const fetchExtras = useCallback(async (items: CepPesquisa[]) => {
    if (items.length === 0) return;

    const uniqueSdrIds = [...new Set(items.map(p => p.sdr_id).filter(Boolean))] as string[];

    const [regioes, iaCache, profiles] = await Promise.all([
      // Carregar toda regioes_estrategicas (tabela pequena, gerenciada manualmente)
      (supabase as any)
        .from('regioes_estrategicas')
        .select('bairro, cidade, faixa_valor_min, faixa_valor_max, descricao')
        .eq('ativo', true)
        .then((r: any) => r.data || []),

      // Cache IA para as UFs consultadas
      (() => {
        const ufs = [...new Set(items.map(p => (p.uf || '').toUpperCase()).filter(Boolean))];
        return ufs.length > 0
          ? (supabase as any)
              .from('cep_classificacoes_ia')
              .select('bairro_norm, cidade_norm, uf, ticket_min, ticket_max, justificativa, confianca')
              .in('uf', ufs)
              .then((r: any) => r.data || [])
          : Promise.resolve([]);
      })(),

      // Nomes dos SDRs
      uniqueSdrIds.length > 0
        ? (supabase as any)
            .from('profiles')
            .select('id, nome')
            .in('id', uniqueSdrIds)
            .then((r: any) => r.data || [])
        : Promise.resolve([]),
    ]);

    // Map de regiões manuais: bairroNorm|cidadeNorm → dado
    const manualMap = new Map<string, any>();
    for (const r of regioes) {
      const key = `${normalizeGeo(r.bairro || '')}|${normalizeGeo(r.cidade || '')}`;
      manualMap.set(key, r);
    }

    // Map de cache IA: bairroNorm|cidadeNorm|UF → dado
    const iaMap = new Map<string, any>();
    for (const c of iaCache) {
      const key = `${c.bairro_norm}|${c.cidade_norm}|${(c.uf || '').toUpperCase()}`;
      iaMap.set(key, c);
    }

    // Map de SDR id → nome
    const nomeMap = new Map<string, string>();
    for (const p of profiles) nomeMap.set(p.id, p.nome);
    setSdrNomes(nomeMap);

    // Associar enriquecimento a cada pesquisa
    const extraMap = new Map<string, RegiaoExtra>();
    for (const p of items) {
      const bN  = normalizeGeo(p.bairro || '');
      const cN  = normalizeGeo(p.cidade || '');
      const uf  = (p.uf || '').toUpperCase();

      const manual = manualMap.get(`${bN}|${cN}`) || manualMap.get(`|${cN}`);
      const ia     = iaMap.get(`${bN}|${cN}|${uf}`);

      if (manual) {
        extraMap.set(p.id, {
          faixa_min: manual.faixa_valor_min ?? null,
          faixa_max: manual.faixa_valor_max ?? null,
          descricao: manual.descricao ?? null,
          fonte: 'manual',
        });
      } else if (ia) {
        extraMap.set(p.id, {
          faixa_min: ia.ticket_min ?? null,
          faixa_max: ia.ticket_max ?? null,
          descricao: ia.justificativa ?? null,
          fonte: 'ia_cache',
          confianca: ia.confianca ?? null,
        });
      } else {
        extraMap.set(p.id, { faixa_min: null, faixa_max: null, descricao: null, fonte: 'desconhecida' });
      }
    }

    setExtras(extraMap);
  }, []);

  // ── Fetch principal ──────────────────────────────────────────────────────
  const fetchPesquisas = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('cep_pesquisas')
        .select('id, cep, bairro, cidade, uf, zona, classificacao, potencial, status_regiao, sdr_id, lead_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (periodo >= 0) {
        query = query.gte('created_at', startOfDay(subDays(new Date(), periodo)).toISOString());
      }
      if (filtroClass)      query = query.eq('classificacao', filtroClass);
      if (filtroPotencial)  query = query.eq('potencial', filtroPotencial);
      if (filtroCidade)     query = query.ilike('cidade', `%${filtroCidade}%`);

      const { data } = await query;
      const items: CepPesquisa[] = data || [];
      setPesquisas(items);
      fetchExtras(items);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [periodo, filtroClass, filtroPotencial, filtroCidade, fetchExtras]);

  useEffect(() => { fetchPesquisas(); }, [fetchPesquisas]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalConsultas = pesquisas.length;
  const totalAlto      = pesquisas.filter(p => p.potencial === 'alto').length;
  // A+ e A incluem tanto os novos canônicos quanto os legados
  const totalPremium   = pesquisas.filter(p =>
    p.classificacao === 'A+' || p.classificacao === 'A' ||
    p.classificacao === 'Premium A+' || p.classificacao === 'Premium A'
  ).length;
  const totalFora      = pesquisas.filter(p => p.status_regiao === 'fora').length;
  const totalComFaixa  = [...extras.values()].filter(e => e.faixa_min || e.faixa_max).length;

  const cidadesUnicas = [...new Set(pesquisas.map(p => p.cidade).filter(Boolean))].sort() as string[];

  // ── Exportação Excel ──────────────────────────────────────────────────────
  const handleExportar = useCallback(async () => {
    if (pesquisas.length === 0) return;
    setExportando(true);
    try {
      const linhas = pesquisas.map(p => {
        const ex = extras.get(p.id);
        return {
          'Data':           p.created_at ? format(parseISO(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
          'CEP':            p.cep || '',
          'Bairro':         p.bairro || '',
          'Cidade':         p.cidade || '',
          'UF':             p.uf || '',
          'Classificação':  p.classificacao || '',
          'Potencial':      p.potencial || '',
          'Zona':           p.zona || '',
          'Status Região':  p.status_regiao || '',
          'Faixa Estimada': ex ? fmtFaixa(ex.faixa_min, ex.faixa_max) : '',
          'Fonte':          ex?.fonte || '',
          'SDR':            p.sdr_id ? (sdrNomes.get(p.sdr_id) || p.sdr_id.slice(0, 8)) : '',
        };
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(linhas);
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 5 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
        { wch: 12 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Consultas CEP');
      XLSX.writeFile(wb, `cep_inteligencia_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } finally {
      setExportando(false);
    }
  }, [pesquisas, extras, sdrNomes]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', color: C.text }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 22, color: C.NV, margin: 0 }}>
            Inteligência de Regiões
          </h1>
          <p style={{ fontSize: 13, color: C.CZ, marginTop: 4, margin: 0 }}>
            Histórico de consultas de CEP — clique em um registro para ver detalhes
          </p>
        </div>
        <button
          onClick={handleExportar}
          disabled={exportando || pesquisas.length === 0}
          style={{
            background: C.green, color: C.white, border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 13, fontWeight: 700,
            cursor: pesquisas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: pesquisas.length === 0 ? 0.5 : 1,
            fontFamily: '"Syne", sans-serif', whiteSpace: 'nowrap',
          }}
        >
          {exportando ? 'Exportando...' : '↓ Exportar Excel'}
        </button>
      </div>

      {/* Cards de resumo */}
      {(() => {
        const cards = [
          { label: 'Total de consultas', value: totalConsultas, bg: C.NV,       clr: C.white   },
          { label: 'Alto potencial',     value: totalAlto,      bg: C.greenBg,  clr: C.green   },
          { label: 'A+ e A',             value: totalPremium,   bg: '#EEF0FF',  clr: '#3B35B7' },
          { label: 'Com faixa',          value: totalComFaixa,  bg: '#FFF5DC',  clr: '#9A6200' },
          { label: 'Fora de cobertura',  value: totalFora,      bg: '#F5F3EF',  clr: C.CZ      },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {cards.map(card => (
              <div key={card.label} style={{
                background: card.bg, borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${C.BD}`,
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: card.clr, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: card.bg === C.NV ? '#B0B8C1' : C.CZ, marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filtros */}
      <div style={{
        background: C.white, border: `1px solid ${C.BD}`, borderRadius: 10,
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.NV, whiteSpace: 'nowrap' }}>Filtros</span>

        <select value={periodo} onChange={e => setPeriodo(Number(e.target.value))} style={mkSelect({ minWidth: 130 })}>
          {PERIODOS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>

        <input
          type="text"
          value={filtroCidade}
          onChange={e => setFiltroCidade(e.target.value)}
          placeholder="Cidade..."
          style={mkInput({ width: 150 })}
        />

        <select value={filtroClass} onChange={e => setFiltroClass(e.target.value)} style={mkSelect({ minWidth: 120 })}>
          <option value="">Todas classes</option>
          {CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filtroPotencial} onChange={e => setFiltroPotencial(e.target.value)} style={mkSelect({ minWidth: 130 })}>
          <option value="">Todo potencial</option>
          {POTENCIAIS.map(p => <option key={p} value={p}>{POTENCIAL_EMOJI[p]} {p}</option>)}
        </select>

        {(filtroCidade || filtroClass || filtroPotencial || periodo !== 30) && (
          <button
            onClick={() => { setFiltroCidade(''); setFiltroClass(''); setFiltroPotencial(''); setPeriodo(30); }}
            style={{
              background: 'none', border: `1px solid ${C.BD}`, borderRadius: 6,
              padding: '6px 10px', fontSize: 12, color: C.CZ, cursor: 'pointer',
            }}
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.CZ, fontSize: 13 }}>Carregando...</div>
      ) : pesquisas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: C.white, borderRadius: 12, border: `1px solid ${C.BD}`, color: C.CZ,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.NV }}>Nenhuma consulta encontrada</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Ajuste os filtros ou aguarde novas consultas.</div>
        </div>
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Cabeçalho */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 90px 90px 140px 90px 80px 110px',
            padding: '10px 16px',
            background: C.FD,
            borderBottom: `1px solid ${C.BD}`,
            fontSize: 11, fontWeight: 700, color: C.CZ,
            textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>
            <span>Local</span>
            <span>Classe</span>
            <span>Potencial</span>
            <span>Faixa estimada</span>
            <span>Zona</span>
            <span>Status</span>
            <span>Data / SDR</span>
          </div>

          {/* Linhas */}
          {pesquisas.map((p, i) => {
            const cores      = CLASS_CORES[p.classificacao || ''] ?? { bg: '#F5F3EF', clr: C.CZ };
            const statusCor  = p.status_regiao === 'ativa' ? C.green
                             : p.status_regiao === 'expansão' ? '#9A6200' : C.CZ;
            const ex         = extras.get(p.id);
            const faixaTxt   = ex ? fmtFaixa(ex.faixa_min, ex.faixa_max) : '';
            const sdrNome    = p.sdr_id ? (sdrNomes.get(p.sdr_id) || null) : null;
            const isOpen     = expandido === p.id;

            return (
              <React.Fragment key={p.id}>
                {/* Linha principal */}
                <div
                  onClick={() => setExpandido(isOpen ? null : p.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 90px 90px 140px 90px 80px 110px',
                    padding: '11px 16px',
                    borderBottom: `1px solid ${C.BD}`,
                    fontSize: 12,
                    background: isOpen ? '#F0F4FF' : i % 2 === 0 ? C.white : C.FD,
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Local */}
                  <div>
                    <div style={{ fontWeight: 600, color: C.NV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.bairro || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: C.CZ }}>{p.cidade}{p.uf ? ` · ${p.uf}` : ''}</div>
                  </div>

                  {/* Classe */}
                  <div>
                    <span style={{
                      background: cores.bg, color: cores.clr,
                      borderRadius: 999, padding: '2px 8px',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {p.classificacao || '—'}
                    </span>
                    {ex?.fonte && ex.fonte !== 'desconhecida' && (
                      <div style={{ fontSize: 10, color: ex.fonte === 'manual' ? '#3B35B7' : '#6B21A8', marginTop: 2 }}>
                        {ex.fonte === 'manual' ? '● Manual' : '◇ IA Cache'}
                        {ex.confianca && ex.fonte === 'ia_cache' ? ` · ${ex.confianca}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Potencial */}
                  <div style={{ color: POTENCIAL_COR[p.potencial || ''] || C.CZ, fontWeight: 600 }}>
                    {POTENCIAL_EMOJI[p.potencial || ''] || ''} {p.potencial || '—'}
                  </div>

                  {/* Faixa estimada */}
                  <div style={{ color: faixaTxt ? '#9A6200' : C.CZ, fontWeight: faixaTxt ? 600 : 400, fontSize: 11 }}>
                    {faixaTxt || <span style={{ color: C.BD }}>—</span>}
                  </div>

                  {/* Zona */}
                  <div style={{ color: C.CZ, textTransform: 'capitalize', fontSize: 11 }}>{p.zona || '—'}</div>

                  {/* Status */}
                  <div style={{ color: statusCor, fontWeight: 600, fontSize: 11 }}>
                    {p.status_regiao === 'ativa'    ? '✓ Ativa'
                   : p.status_regiao === 'expansão' ? '→ Expansão'
                   : p.status_regiao === 'fora'     ? '✗ Fora'
                   : p.status_regiao || '—'}
                  </div>

                  {/* Data / SDR */}
                  <div>
                    <div style={{ color: C.CZ, fontSize: 11 }}>
                      {p.created_at ? format(parseISO(p.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                    </div>
                    {sdrNome && (
                      <div style={{ fontSize: 10, color: C.NV2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sdrNome}
                      </div>
                    )}
                  </div>
                </div>

                {/* Linha expandida */}
                {isOpen && (
                  <div style={{
                    padding: '12px 16px 14px',
                    background: '#F0F4FF',
                    borderBottom: `1px solid ${C.BD}`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                  }}>
                    {/* Coluna esquerda: contexto regional */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.NV, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                        Contexto regional
                      </div>
                      {ex?.descricao ? (
                        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: 0 }}>{ex.descricao}</p>
                      ) : (
                        <p style={{ fontSize: 12, color: C.CZ, margin: 0, fontStyle: 'italic' }}>
                          Descrição não disponível para este registro.
                        </p>
                      )}
                      {ex?.fonte === 'desconhecida' && (
                        <p style={{ fontSize: 11, color: C.CZ, marginTop: 6, margin: 0 }}>
                          ⚠ Enriquecimento não encontrado — registro pode ser fallback ou de período anterior ao cache IA.
                        </p>
                      )}
                    </div>

                    {/* Coluna direita: dados técnicos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.CZ }}>
                      <div><strong style={{ color: C.NV }}>CEP:</strong> {p.cep || '—'}</div>
                      {faixaTxt && <div><strong style={{ color: C.NV }}>Faixa estimada:</strong> {faixaTxt}</div>}
                      {ex?.fonte && ex.fonte !== 'desconhecida' && (
                        <div>
                          <strong style={{ color: C.NV }}>Fonte:</strong>{' '}
                          {ex.fonte === 'manual' ? 'Base manual validada' : 'Cache de IA'}
                          {ex.confianca ? ` · confiança ${ex.confianca}` : ''}
                        </div>
                      )}
                      {p.zona && <div><strong style={{ color: C.NV }}>Zona:</strong> {p.zona}</div>}
                      {p.sdr_id && (
                        <div>
                          <strong style={{ color: C.NV }}>Consultado por:</strong>{' '}
                          {sdrNome || `SDR ${p.sdr_id.slice(0, 8)}...`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Rodapé */}
          <div style={{
            padding: '10px 16px', borderTop: `1px solid ${C.BD}`,
            background: C.FD, fontSize: 12, color: C.CZ,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{pesquisas.length} registro{pesquisas.length !== 1 ? 's' : ''} exibido{pesquisas.length !== 1 ? 's' : ''}</span>
            {cidadesUnicas.length > 0 && (
              <span>{cidadesUnicas.length} cidade{cidadesUnicas.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
