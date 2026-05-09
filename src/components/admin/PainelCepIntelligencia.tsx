import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
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
  created_at: string;
}

const CLASS_CORES: Record<string, { bg: string; clr: string }> = {
  'Premium A+':             { bg: '#F5EEF8', clr: '#6B21A8' },
  'Premium A':              { bg: '#EEF0FF', clr: '#3B35B7' },
  'A-':                     { bg: '#E8F5EE', clr: '#1A7A4A' },
  'B+':                     { bg: '#FFF5DC', clr: '#9A6200' },
  'B':                      { bg: '#F5F3EF', clr: '#6B6760' },
  'Oportunidade':           { bg: '#FFF0E8', clr: '#E8510A' },
  'Periférico com potencial':{ bg: '#FEF9C3', clr: '#854D0E' },
};

const POTENCIAL_COR: Record<string, string> = { alto: '#1A7A4A', médio: '#9A6200', baixo: '#6B6760' };
const POTENCIAL_EMOJI: Record<string, string> = { alto: '🔥', médio: '⚡', baixo: '○' };

const PERIODOS = [
  { label: 'Hoje',       days: 0 },
  { label: 'Últimos 7d', days: 7 },
  { label: 'Últimos 30d',days: 30 },
  { label: 'Últimos 90d',days: 90 },
  { label: 'Tudo',       days: -1 },
];

const CLASSIFICACOES = ['Premium A+', 'Premium A', 'A-', 'B+', 'B', 'Oportunidade', 'Periférico com potencial'];
const POTENCIAIS     = ['alto', 'médio', 'baixo'];

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

export function PainelCepIntelligencia() {
  const [pesquisas, setPesquisas]     = useState<CepPesquisa[]>([]);
  const [loading, setLoading]         = useState(true);
  const [exportando, setExportando]   = useState(false);

  // Filtros
  const [periodo, setPeriodo]         = useState(30);
  const [filtroCidade, setFiltroCidade]       = useState('');
  const [filtroClass, setFiltroClass]         = useState('');
  const [filtroPotencial, setFiltroPotencial] = useState('');

  const fetchPesquisas = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('cep_pesquisas')
        .select('id, cep, bairro, cidade, uf, zona, classificacao, potencial, status_regiao, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (periodo >= 0) {
        const desde = startOfDay(subDays(new Date(), periodo)).toISOString();
        query = query.gte('created_at', desde);
      }
      if (filtroClass)   query = query.eq('classificacao', filtroClass);
      if (filtroPotencial) query = query.eq('potencial', filtroPotencial);
      if (filtroCidade)  query = query.ilike('cidade', `%${filtroCidade}%`);

      const { data } = await query;
      setPesquisas(data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [periodo, filtroClass, filtroPotencial, filtroCidade]);

  useEffect(() => { fetchPesquisas(); }, [fetchPesquisas]);

  // ── Métricas de resumo ────────────────────────────────────────────────────
  const totalConsultas  = pesquisas.length;
  const totalAlto       = pesquisas.filter(p => p.potencial === 'alto').length;
  const totalPremium    = pesquisas.filter(p => p.classificacao?.startsWith('Premium')).length;
  const totalFora       = pesquisas.filter(p => p.status_regiao === 'fora').length;

  const cidadesUnicas = [...new Set(
    pesquisas.map(p => p.cidade).filter(Boolean)
  )].sort() as string[];

  // ── Exportação Excel ──────────────────────────────────────────────────────
  const handleExportar = useCallback(async () => {
    if (pesquisas.length === 0) return;
    setExportando(true);
    try {
      const linhas = pesquisas.map(p => ({
        'Data':           p.created_at ? format(parseISO(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        'CEP':            p.cep || '',
        'Bairro':         p.bairro || '',
        'Cidade':         p.cidade || '',
        'UF':             p.uf || '',
        'Classificação':  p.classificacao || '',
        'Potencial':      p.potencial || '',
        'Zona':           p.zona || '',
        'Status Região':  p.status_regiao || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(linhas);

      // Larguras
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 22 },
        { wch: 5  }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Consultas CEP');
      XLSX.writeFile(wb, `cep_inteligencia_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } finally {
      setExportando(false);
    }
  }, [pesquisas]);

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
            Histórico de consultas de CEP pelo SDR
          </p>
        </div>
        <button
          onClick={handleExportar}
          disabled={exportando || pesquisas.length === 0}
          style={{
            background: C.green,
            color: C.white,
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: pesquisas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: pesquisas.length === 0 ? 0.5 : 1,
            fontFamily: '"Syne", sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {exportando ? 'Exportando...' : '↓ Exportar Excel'}
        </button>
      </div>

      {/* Cards de resumo */}
      {(() => {
        const cards = [
          { label: 'Total de consultas', value: totalConsultas, bg: C.NV,       clr: C.white  },
          { label: 'Alto potencial',     value: totalAlto,      bg: C.greenBg,  clr: C.green  },
          { label: 'Premium (A+ / A)',   value: totalPremium,   bg: '#EEF0FF',  clr: '#3B35B7' },
          { label: 'Fora de cobertura',  value: totalFora,      bg: '#F5F3EF',  clr: C.CZ     },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {cards.map(card => (
              <div key={card.label} style={{
                background: card.bg,
                borderRadius: 10,
                padding: '14px 16px',
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
        background: C.white,
        border: `1px solid ${C.BD}`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.NV, whiteSpace: 'nowrap' }}>Filtros</span>

        {/* Período */}
        <select value={periodo} onChange={e => setPeriodo(Number(e.target.value))} style={mkSelect({ minWidth: 130 })}>
          {PERIODOS.map(p => (
            <option key={p.days} value={p.days}>{p.label}</option>
          ))}
        </select>

        {/* Cidade */}
        <input
          type="text"
          value={filtroCidade}
          onChange={e => setFiltroCidade(e.target.value)}
          placeholder="Cidade..."
          style={mkInput({ width: 150 })}
        />

        {/* Classificação */}
        <select value={filtroClass} onChange={e => setFiltroClass(e.target.value)} style={mkSelect({ minWidth: 140 })}>
          <option value="">Todas classes</option>
          {CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Potencial */}
        <select value={filtroPotencial} onChange={e => setFiltroPotencial(e.target.value)} style={mkSelect({ minWidth: 130 })}>
          <option value="">Todo potencial</option>
          {POTENCIAIS.map(p => <option key={p} value={p}>{POTENCIAL_EMOJI[p]} {p}</option>)}
        </select>

        {(filtroCidade || filtroClass || filtroPotencial || periodo !== 30) && (
          <button
            onClick={() => { setFiltroCidade(''); setFiltroClass(''); setFiltroPotencial(''); setPeriodo(30); }}
            style={{
              background: 'none',
              border: `1px solid ${C.BD}`,
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              color: C.CZ,
              cursor: 'pointer',
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
          textAlign: 'center',
          padding: 60,
          background: C.white,
          borderRadius: 12,
          border: `1px solid ${C.BD}`,
          color: C.CZ,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.NV }}>Nenhuma consulta encontrada</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Ajuste os filtros ou aguarde novas consultas.</div>
        </div>
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Cabeçalho da tabela */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 120px 80px 110px 90px 120px',
            gap: 0,
            padding: '10px 16px',
            background: C.FD,
            borderBottom: `1px solid ${C.BD}`,
            fontSize: 11,
            fontWeight: 700,
            color: C.CZ,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}>
            <span>Local</span>
            <span>Classificação</span>
            <span>Potencial</span>
            <span>UF</span>
            <span>Zona</span>
            <span>Status</span>
            <span>Data</span>
          </div>

          {/* Linhas */}
          {pesquisas.map((p, i) => {
            const cores = CLASS_CORES[p.classificacao || ''] || { bg: '#F5F3EF', clr: C.CZ };
            const statusCor = p.status_regiao === 'ativa' ? C.green : p.status_regiao === 'expansão' ? '#9A6200' : C.CZ;
            return (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 120px 80px 110px 90px 120px',
                  gap: 0,
                  padding: '11px 16px',
                  borderBottom: i < pesquisas.length - 1 ? `1px solid ${C.BD}` : 'none',
                  fontSize: 12,
                  background: i % 2 === 0 ? C.white : C.FD,
                  alignItems: 'center',
                }}
              >
                {/* Local */}
                <div>
                  <div style={{ fontWeight: 600, color: C.NV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.bairro || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: C.CZ }}>{p.cidade || '—'}</div>
                </div>

                {/* Classificação */}
                <div>
                  <span style={{
                    background: cores.bg,
                    color: cores.clr,
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {p.classificacao || '—'}
                  </span>
                </div>

                {/* Potencial */}
                <div style={{ color: POTENCIAL_COR[p.potencial || ''] || C.CZ, fontWeight: 600 }}>
                  {POTENCIAL_EMOJI[p.potencial || ''] || ''} {p.potencial || '—'}
                </div>

                {/* UF */}
                <div style={{ color: C.CZ }}>{p.uf || '—'}</div>

                {/* Zona */}
                <div style={{ color: C.CZ, textTransform: 'capitalize' }}>{p.zona || '—'}</div>

                {/* Status */}
                <div style={{ color: statusCor, fontWeight: 600, fontSize: 11 }}>
                  {p.status_regiao === 'ativa'    ? '✓ Ativa'     :
                   p.status_regiao === 'expansão' ? '→ Expansão'  :
                   p.status_regiao === 'fora'     ? '✗ Fora'      : p.status_regiao || '—'}
                </div>

                {/* Data */}
                <div style={{ color: C.CZ, fontSize: 11 }}>
                  {p.created_at
                    ? format(parseISO(p.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                    : '—'}
                </div>
              </div>
            );
          })}

          {/* Rodapé com total */}
          <div style={{
            padding: '10px 16px',
            borderTop: `1px solid ${C.BD}`,
            background: C.FD,
            fontSize: 12,
            color: C.CZ,
            display: 'flex',
            justifyContent: 'space-between',
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
