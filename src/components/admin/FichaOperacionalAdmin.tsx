// FichaOperacionalAdmin — drawer lateral premium para admin/consultor.
// Fase B do sprint admin UX. Espelha o padrão visual da Ficha do fornecedor:
// header gradient, banner Próxima ação, timeline operacional e seções
// compactas. Apenas leitura + dispatcher de modais filhos via callbacks.

import { useState, useEffect, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { R as I } from '@/styles/tokens';
import type { Orcamento } from '@/types';
import { Copy, ExternalLink, Edit, UserCheck, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function fmtRelativo(d: Date): string {
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000, hora = 3_600_000, dia = 86_400_000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (abs < hora)      return rtf.format(Math.round(diff / min),  'minute');
  if (abs < dia)       return rtf.format(Math.round(diff / hora), 'hour');
  if (abs < dia * 30)  return rtf.format(Math.round(diff / dia),  'day');
  if (abs < dia * 365) return rtf.format(Math.round(diff / (dia * 30)),  'month');
  return rtf.format(Math.round(diff / (dia * 365)), 'year');
}

function diasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// ── Tipos de dados puxados pela ficha ────────────────────────────────────────
interface CandidaturaResumo {
  id: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  proposta_enviada: boolean;
  status_acompanhamento: string | null;
  data_candidatura: string;
}

interface CompatResumo {
  id: string;
  status: string;
  created_at: string;
  aprovado_em: string | null;
  empresa_recomendada_id: string | null;
  total: number;
}

// ── Próxima ação derivada (regras admin) ─────────────────────────────────────
type TomAdmin = 'urgent' | 'action' | 'wait' | 'done' | 'neutral';

interface ProximaAcaoAdmin {
  tom: TomAdmin;
  icone: string;
  titulo: string;
}

function deriveProximaAcaoAdmin(args: {
  orcamento: Orcamento;
  etapaCrm: string | null;
  candidaturas: CandidaturaResumo[];
  compat: CompatResumo | null;
}): ProximaAcaoAdmin {
  const { orcamento, etapaCrm, candidaturas, compat } = args;

  if (orcamento.status === 'fechado') {
    return { tom: 'done', icone: '🎉', titulo: 'Orçamento fechado' };
  }
  if (orcamento.status === 'pausado') {
    return { tom: 'neutral', icone: '⏸', titulo: 'Orçamento pausado' };
  }

  const diasPublicado = diasDesde(orcamento.dataPublicacao.toString());

  // Pré-SDR
  if (!etapaCrm || etapaCrm === 'orcamento_postado') {
    return diasPublicado >= 1
      ? { tom: 'urgent', icone: '⚡', titulo: 'Aguardando atribuição/contato do SDR' }
      : { tom: 'action', icone: '📞', titulo: 'Atribuir SDR para iniciar contato' };
  }

  // Inscrições
  const totalInscritos = candidaturas.length;
  const propostasEnviadas = candidaturas.filter(c => c.proposta_enviada).length;

  if (totalInscritos === 0) {
    return diasPublicado >= 3
      ? { tom: 'urgent', icone: '⚡', titulo: `Sem inscrições há ${Math.floor(diasPublicado)} dias` }
      : { tom: 'wait', icone: '⏳', titulo: 'Aguardando primeiros fornecedores' };
  }

  // Compat
  if (compat) {
    const dias = diasDesde(compat.created_at);
    if (compat.status === 'erro' || compat.status === 'failed') {
      return { tom: 'urgent', icone: '⚠️', titulo: 'Compatibilização com erro — revisar' };
    }
    if (['pending', 'processando', 'compatibilizando'].includes(compat.status)) {
      return dias > 1
        ? { tom: 'urgent', icone: '⚡', titulo: `Compat. travada há ${Math.floor(dias)}d` }
        : { tom: 'wait', icone: '🔍', titulo: 'Compatibilização em andamento' };
    }
    if (['concluida', 'completed', 'pendente_revisao', 'revisado'].includes(compat.status)) {
      return { tom: 'action', icone: '👁️', titulo: 'Compatibilização pronta para revisão' };
    }
    if (compat.status === 'aprovado') {
      return { tom: 'action', icone: '📤', titulo: 'Aprovada — enviar ao cliente' };
    }
    if (compat.status === 'enviado') {
      return dias > 5
        ? { tom: 'urgent', icone: '⚡', titulo: `Cliente sem resposta há ${Math.floor(dias)}d` }
        : { tom: 'wait', icone: '🤔', titulo: 'Cliente analisando a compatibilização' };
    }
  }

  // Sem compat ainda — depende das propostas
  if (propostasEnviadas >= 1) {
    return { tom: 'action', icone: '🔍', titulo: 'Gerar compatibilização das propostas' };
  }

  return { tom: 'wait', icone: '📋', titulo: `${totalInscritos} inscrito(s) — aguardando propostas` };
}

const TOM_COLORS_ADMIN: Record<TomAdmin, { bg: string; bd: string; fg: string }> = {
  urgent:  { bg: I.vm2,   bd: I.vm,   fg: I.vm   },
  action:  { bg: I.azul3, bd: I.azul, fg: I.azul },
  wait:    { bg: I.am2,   bd: I.am,   fg: I.am   },
  done:    { bg: I.vd2,   bd: I.vd,   fg: I.vd   },
  neutral: { bg: I.cz2,   bd: I.bd,   fg: I.cz   },
};

// ── Timeline operacional (eventos com timestamp real quando disponível) ──────
interface EventoAdmin {
  tipo: string;
  label: string;
  data: Date | null;
  icone: string;
  cor: string;
}

function deriveEventosAdmin(args: {
  orcamento: Orcamento;
  candidaturas: CandidaturaResumo[];
  compat: CompatResumo | null;
}): EventoAdmin[] {
  const { orcamento, candidaturas, compat } = args;
  const out: EventoAdmin[] = [];

  out.push({
    tipo: 'orcamento_publicado',
    label: 'Orçamento publicado',
    data: orcamento.dataPublicacao,
    icone: '📣',
    cor: I.azul,
  });

  // Agrupamento de inscrições: se ≥3 no mesmo dia, mostra uma linha "N fornecedores inscritos"
  const inscricoesPorDia = new Map<string, CandidaturaResumo[]>();
  candidaturas.forEach(c => {
    const dia = c.data_candidatura.slice(0, 10);
    const arr = inscricoesPorDia.get(dia) ?? [];
    arr.push(c);
    inscricoesPorDia.set(dia, arr);
  });
  inscricoesPorDia.forEach((arr, dia) => {
    if (arr.length >= 3) {
      out.push({
        tipo: 'inscricoes_dia',
        label: `${arr.length} fornecedores se inscreveram`,
        data: new Date(`${dia}T12:00:00`),
        icone: '✋',
        cor: I.lj,
      });
    } else {
      arr.forEach(c => {
        out.push({
          tipo: 'fornecedor_inscrito',
          label: `${c.fornecedor_nome ?? 'Fornecedor'} se candidatou`,
          data: new Date(c.data_candidatura),
          icone: '✋',
          cor: I.lj,
        });
      });
    }
  });

  if (compat) {
    out.push({
      tipo: 'compat_iniciada',
      label: 'Compatibilização iniciada',
      data: new Date(compat.created_at),
      icone: '🔍',
      cor: I.am,
    });
    if (compat.aprovado_em) {
      out.push({
        tipo: 'compat_aprovada',
        label: 'Compatibilização aprovada',
        data: new Date(compat.aprovado_em),
        icone: '✓',
        cor: I.vd,
      });
    }
    if (compat.status === 'enviado') {
      out.push({
        tipo: 'compat_enviada',
        label: 'Enviada ao cliente',
        data: null,
        icone: '📤',
        cor: I.rx,
      });
    }
    if (compat.status === 'erro' || compat.status === 'failed') {
      out.push({
        tipo: 'compat_erro',
        label: 'Falha na compatibilização',
        data: null,
        icone: '⚠️',
        cor: I.vm,
      });
    }
  }

  if (orcamento.status === 'fechado') {
    out.push({ tipo: 'fechado', label: 'Orçamento fechado', data: null, icone: '🎉', cor: I.vd });
  }
  if (orcamento.status === 'pausado') {
    out.push({ tipo: 'pausado', label: 'Orçamento pausado', data: null, icone: '⏸', cor: I.cz });
  }

  return out;
}

// ── Sub-componente: Header ───────────────────────────────────────────────────
function FichaAdminHeader({ orcamento }: { orcamento: Orcamento }) {
  const nome = orcamento.dadosContato?.nome ?? 'Cliente sem nome';
  const codigo = orcamento.id.slice(0, 8);

  return (
    <div style={{
      background: `linear-gradient(150deg, ${I.azul} 0%, ${I.azul2} 100%)`,
      padding: '20px 20px 16px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: .6, color: '#fff', marginBottom: 6 }}>
        Ficha Operacional · #{codigo}
      </div>
      <div className="r100-clamp-2" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.35, marginBottom: 10, paddingRight: 44 }}>
        {nome}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {orcamento.status === 'aberto' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vd2, color: I.vd }}>
            ● Aberto
          </span>
        )}
        {orcamento.status === 'pausado' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.am2, color: I.am }}>
            ⏸ Pausado
          </span>
        )}
        {orcamento.status === 'fechado' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.cz2, color: I.cz }}>
            ✓ Fechado
          </span>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.85)' }}>
          📍 {orcamento.local || 'Localização não informada'}
          {orcamento.tamanhoImovel > 0 && ` · ${orcamento.tamanhoImovel} m²`}
        </span>
      </div>
    </div>
  );
}

// ── Sub-componente: Banner Próxima ação ──────────────────────────────────────
function ProximaAcaoAdminBanner({ acao }: { acao: ProximaAcaoAdmin }) {
  const c = TOM_COLORS_ADMIN[acao.tom];
  return (
    <div style={{
      marginBottom: 16,
      background: c.bg,
      border: `1.5px solid ${c.bd}`,
      borderLeft: `4px solid ${c.bd}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{acao.icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: c.fg, opacity: .75, marginBottom: 2 }}>
          Próxima ação
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.fg, fontFamily: "'Syne',sans-serif", lineHeight: 1.35 }}>
          {acao.titulo}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: Timeline ─────────────────────────────────────────────────
function TimelineAdmin({ eventos }: { eventos: EventoAdmin[] }) {
  const sorted = useMemo(() => {
    const arr = [...eventos];
    return arr.sort((a, b) => {
      if (!a.data && !b.data) return 0;
      if (!a.data) return -1;
      if (!b.data) return 1;
      return b.data.getTime() - a.data.getTime();
    });
  }, [eventos]);

  if (sorted.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 12 }}>
        Histórico do processo
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sorted.map((ev, i) => {
          const ehUltimo = i === sorted.length - 1;
          return (
            <li key={`${ev.tipo}-${i}`} style={{ position: 'relative', paddingLeft: 32, paddingBottom: ehUltimo ? 0 : 14 }}>
              {!ehUltimo && (
                <span style={{ position: 'absolute', left: 11, top: 22, bottom: 0, width: 2, background: I.bd }} />
              )}
              <span style={{
                position: 'absolute', left: 0, top: 2,
                width: 22, height: 22, borderRadius: '50%',
                background: '#fff', border: `2px solid ${ev.cor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, lineHeight: 1,
              }}>
                {ev.icone}
              </span>
              <div style={{ fontSize: 13, fontWeight: 700, color: I.nv, lineHeight: 1.35, fontFamily: "'Syne',sans-serif" }}>
                {ev.label}
              </div>
              {ev.data ? (
                <div style={{ fontSize: 11, color: I.cz, marginTop: 2 }}>
                  {fmtRelativo(ev.data)} · {fmtDt(ev.data.toISOString())} {fmtTm(ev.data.toISOString())}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: I.cz, marginTop: 2, fontStyle: 'italic' }}>
                  data não registrada
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Sub-componente: Resumo ───────────────────────────────────────────────────
function SecaoResumo({ orcamento }: { orcamento: Orcamento }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Resumo do orçamento
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 4 }}>Necessidade</div>
          <div style={{ fontSize: 12, color: I.nv, lineHeight: 1.5 }}>{orcamento.necessidade}</div>
        </div>
        {orcamento.categorias?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 4 }}>Categorias</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {orcamento.categorias.map(cat => (
                <span key={cat} style={{ fontSize: 11, background: I.azul3, color: I.azul, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Prazo</div>
            <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>{orcamento.prazoInicioTexto || '—'}</div>
          </div>
          {orcamento.gestor_conta && (
            <div>
              <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Gestor de conta</div>
              <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>👤 {orcamento.gestor_conta.nome}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: Fornecedores inscritos ───────────────────────────────────
function SecaoFornecedores({ candidaturas }: { candidaturas: CandidaturaResumo[] }) {
  const enviadas = candidaturas.filter(c => c.proposta_enviada).length;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        Fornecedores inscritos
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: I.azul3, color: I.azul }}>
          {candidaturas.length}
        </span>
      </div>

      {candidaturas.length === 0 ? (
        <div style={{ background: I.cz2, borderRadius: 8, padding: '12px 14px', fontSize: 12, color: I.cz, textAlign: 'center' }}>
          Nenhum fornecedor inscrito ainda.
        </div>
      ) : (
        <div style={{ background: I.bg, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: I.cz, marginBottom: 8 }}>
            <strong style={{ color: I.vd }}>{enviadas}</strong> de {candidaturas.length} já enviaram proposta
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {candidaturas.map(c => (
              <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: I.nv }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: c.proposta_enviada ? I.vd : I.cz,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.fornecedor_nome ?? 'Fornecedor sem nome'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 10,
                  background: c.proposta_enviada ? I.vd2 : I.cz2,
                  color: c.proposta_enviada ? I.vd : I.cz,
                  whiteSpace: 'nowrap',
                }}>
                  {c.proposta_enviada ? 'Proposta enviada' : 'Sem proposta'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: Compatibilização ─────────────────────────────────────────
function SecaoCompat({
  compat, onAbrir,
}: {
  compat: CompatResumo | null;
  onAbrir?: () => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Compatibilização IA
      </div>

      {!compat ? (
        <div style={{ background: I.cz2, borderRadius: 8, padding: '12px 14px', fontSize: 12, color: I.cz, textAlign: 'center' }}>
          Nenhuma compatibilização gerada para este orçamento ainda.
        </div>
      ) : (
        <div style={{ background: I.bg, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <CompatStatusInline status={compat.status} />
            <span style={{ fontSize: 11, color: I.cz }}>
              {compat.total} propostas
            </span>
          </div>
          <div style={{ fontSize: 11, color: I.cz, marginBottom: 8 }}>
            Iniciada em {fmtDt(compat.created_at)} {fmtTm(compat.created_at)} ({fmtRelativo(new Date(compat.created_at))})
          </div>
          {onAbrir && (
            <button
              type="button"
              onClick={onAbrir}
              style={{
                background: I.azul, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, fontWeight: 700,
                fontFamily: "'Syne',sans-serif",
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <BarChart2 className="h-3 w-3" /> Abrir compatibilização
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CompatStatusInline({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    pending:          { label: 'Processando',     bg: I.am2,   fg: I.am   },
    processando:      { label: 'Processando',     bg: I.am2,   fg: I.am   },
    compatibilizando: { label: 'Compatibilizando', bg: I.azul3, fg: I.azul },
    completed:        { label: 'Pronta',          bg: I.azul3, fg: I.azul },
    concluida:        { label: 'Pronta',          bg: I.azul3, fg: I.azul },
    pendente_revisao: { label: 'Pend. revisão',   bg: I.am2,   fg: I.am   },
    revisado:         { label: 'Revisada',        bg: I.rx2,   fg: I.rx   },
    aprovado:         { label: 'Aprovada',        bg: I.vd2,   fg: I.vd   },
    enviado:          { label: 'Enviada cliente', bg: I.cz2,   fg: I.cz   },
    erro:             { label: 'Erro',            bg: I.vm2,   fg: I.vm   },
    failed:           { label: 'Erro',            bg: I.vm2,   fg: I.vm   },
    cancelada:        { label: 'Cancelada',       bg: I.cz2,   fg: I.cz   },
  };
  const s = map[status] ?? { label: status, bg: I.cz2, fg: I.cz };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

// ── Sub-componente: Visita técnica ───────────────────────────────────────────
function SecaoVisitaTecnica({ orcamento }: { orcamento: Orcamento }) {
  const horarios = orcamento.horariosVisita ?? [];
  if (horarios.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Visita técnica
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {horarios.map(h => {
          const ocupado = !!h.fornecedor_id;
          return (
            <li key={h.id} style={{
              background: ocupado ? I.vd2 : I.am2,
              border: `1.5px solid ${ocupado ? I.vd : I.am}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              color: ocupado ? I.vd : I.am,
              fontWeight: 600,
            }}>
              {ocupado ? '✅' : '⏳'} {fmtDt(h.data_hora)} {fmtTm(h.data_hora)}
              {ocupado && h.fornecedor_nome && ` — ${h.fornecedor_nome}`}
              {!ocupado && ' — Disponível'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Sub-componente: Rota100 ──────────────────────────────────────────────────
function SecaoRota100({ orcamento }: { orcamento: Orcamento }) {
  if (!orcamento.rota100_token) return null;
  const url = `${window.location.origin}/rota100/${orcamento.rota100_token}`;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Rota100 do cliente
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: I.cz, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
          {url}
        </span>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado'); }}
          aria-label="Copiar link Rota100"
          style={{
            background: 'transparent', border: 'none', color: I.azul,
            cursor: 'pointer', padding: 6, borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
          }}
        >
          <Copy className="h-3 w-3" /> Copiar
        </button>
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          aria-label="Abrir Rota100 em nova aba"
          style={{
            color: I.azul, padding: 6, borderRadius: 6,
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ── Sub-componente: Contato ──────────────────────────────────────────────────
function SecaoContato({ orcamento }: { orcamento: Orcamento }) {
  const d = orcamento.dadosContato;
  if (!d?.nome && !d?.telefone && !d?.email) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Contato do cliente
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {d?.nome && <div><span style={{ color: I.cz }}>Nome: </span><span style={{ color: I.nv, fontWeight: 600 }}>{d.nome}</span></div>}
        {d?.telefone && <div><span style={{ color: I.cz }}>Telefone: </span><span style={{ color: I.nv, fontWeight: 600 }}>{d.telefone}</span></div>}
        {d?.email && <div><span style={{ color: I.cz }}>Email: </span><span style={{ color: I.nv, fontWeight: 600 }}>{d.email}</span></div>}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export interface FichaOperacionalAdminProps {
  orcamento: Orcamento | null;
  onClose: () => void;
  onEditar?: () => void;
  onApropriar?: () => void;
  onAbrirCompat?: () => void;
}

export function FichaOperacionalAdmin({
  orcamento, onClose, onEditar, onApropriar, onAbrirCompat,
}: FichaOperacionalAdminProps) {
  const [candidaturas, setCandidaturas] = useState<CandidaturaResumo[]>([]);
  const [compat, setCompat] = useState<CompatResumo | null>(null);
  const [etapaCrm, setEtapaCrm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOpen = orcamento !== null;
  const orcId = orcamento?.id;

  useEffect(() => {
    if (!orcId) {
      setCandidaturas([]);
      setCompat(null);
      setEtapaCrm(null);
      return;
    }
    let cancelado = false;
    setLoading(true);
    (async () => {
      try {
        const [candRes, compatRes, crmRes] = await Promise.all([
          (supabase as any)
            .from('candidaturas_fornecedores')
            .select('id, fornecedor_id, proposta_enviada, status_acompanhamento, data_candidatura, profiles!fornecedor_id(nome, empresa)')
            .eq('orcamento_id', orcId)
            .order('data_candidatura', { ascending: false }),
          (supabase as any)
            .from('compatibilizacoes_analises_ia')
            .select('id, status, created_at, aprovado_em, candidaturas_ids, analise_completa')
            .eq('orcamento_id', orcId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('orcamentos_crm_tracking')
            .select('etapa_crm')
            .eq('orcamento_id', orcId)
            .maybeSingle(),
        ]);

        if (cancelado) return;

        // Candidaturas
        if (!candRes.error && candRes.data) {
          setCandidaturas(candRes.data.map((row: any) => ({
            id: row.id,
            fornecedor_id: row.fornecedor_id ?? null,
            fornecedor_nome: row.profiles?.empresa || row.profiles?.nome || null,
            proposta_enviada: !!row.proposta_enviada,
            status_acompanhamento: row.status_acompanhamento ?? null,
            data_candidatura: row.data_candidatura,
          })));
        }

        // Compat
        if (!compatRes.error && compatRes.data) {
          const row: any = compatRes.data;
          setCompat({
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            aprovado_em: row.aprovado_em ?? null,
            empresa_recomendada_id: row.analise_completa?.empresa_recomendada_id ?? null,
            total: Array.isArray(row.candidaturas_ids) ? row.candidaturas_ids.length : 0,
          });
        } else {
          setCompat(null);
        }

        // CRM
        if (!crmRes.error && crmRes.data) {
          setEtapaCrm((crmRes.data as any).etapa_crm ?? null);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [orcId]);

  const acao = useMemo(() => {
    if (!orcamento) return null;
    return deriveProximaAcaoAdmin({ orcamento, etapaCrm, candidaturas, compat });
  }, [orcamento, etapaCrm, candidaturas, compat]);

  const eventos = useMemo(() => {
    if (!orcamento) return [];
    return deriveEventosAdmin({ orcamento, candidaturas, compat });
  }, [orcamento, candidaturas, compat]);

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[700px] max-w-full p-0 flex flex-col overflow-hidden [&>button]:text-white [&>button]:opacity-90 [&>button]:bg-white/20 [&>button]:rounded-lg [&>button]:w-11 [&>button]:h-11 [&>button]:top-3 [&>button]:right-3"
      >
        <SheetTitle className="sr-only">Ficha Operacional Admin</SheetTitle>
        <SheetDescription className="sr-only">Detalhes operacionais do orçamento</SheetDescription>

        {orcamento && (
          <>
            <FichaAdminHeader orcamento={orcamento} />

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 20px' }}>
              {acao && <ProximaAcaoAdminBanner acao={acao} />}

              <TimelineAdmin eventos={eventos} />

              <SecaoResumo orcamento={orcamento} />

              <SecaoFornecedores candidaturas={candidaturas} />

              <SecaoCompat compat={compat} onAbrir={onAbrirCompat} />

              <SecaoVisitaTecnica orcamento={orcamento} />

              <SecaoRota100 orcamento={orcamento} />

              <SecaoContato orcamento={orcamento} />

              {loading && (
                <div style={{ fontSize: 11, color: I.cz, textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>
                  Atualizando dados…
                </div>
              )}
            </div>

            {/* Rodapé com CTAs operacionais (sem ações destrutivas — essas ficam em dropdown contextual da lista) */}
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${I.bd}`,
              padding: '12px 16px',
              background: '#fff',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              {onEditar && (
                <button
                  type="button"
                  onClick={onEditar}
                  style={ctaSecondaryStyle}
                >
                  <Edit className="h-3.5 w-3.5" /> Editar
                </button>
              )}
              {onApropriar && (
                <button
                  type="button"
                  onClick={onApropriar}
                  style={ctaSecondaryStyle}
                >
                  <UserCheck className="h-3.5 w-3.5" /> {orcamento.gestor_conta ? 'Alterar gestor' : 'Apropriar gestor'}
                </button>
              )}
              {onAbrirCompat && (
                <button
                  type="button"
                  onClick={onAbrirCompat}
                  style={ctaPrimaryStyle}
                >
                  <BarChart2 className="h-3.5 w-3.5" /> Compatibilização IA
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const ctaPrimaryStyle = {
  background: I.azul, color: '#fff', border: 'none',
  borderRadius: 8, padding: '9px 14px',
  fontSize: 12, fontWeight: 700,
  fontFamily: "'Syne',sans-serif",
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 38,
} as const;

const ctaSecondaryStyle = {
  background: '#fff', color: I.nv,
  border: `1.5px solid ${I.bd}`,
  borderRadius: 8, padding: '9px 14px',
  fontSize: 12, fontWeight: 700,
  fontFamily: "'Syne',sans-serif",
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 38,
} as const;
