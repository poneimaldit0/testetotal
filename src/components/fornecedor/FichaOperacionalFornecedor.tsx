import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import type { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { usePropostasArquivos, type PropostaArquivo } from '@/hooks/usePropostasArquivos';
import {
  useCompatStatusFornecedor,
  deriveFasePropostaFromCompat,
  type PropostaFase,
  type CompatStatusFornecedor,
} from '@/hooks/useCompatStatusFornecedor';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { R as I } from '@/styles/tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function horasRestantes(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Atenção pós-atendimento: visita/reunião realizada, sem proposta, ≥3 dias do horário
const ATENCAO_POS_ATENDIMENTO_DIAS = 3;

function diasDesdeAtendimento(c: CandidaturaOrcamento): number | null {
  if (!c.horarioVisitaAgendado) return null;
  return (Date.now() - new Date(c.horarioVisitaAgendado).getTime()) / 86_400_000;
}

function isAtencaoPosAtendimento(c: CandidaturaOrcamento): boolean {
  const s = c.statusAcompanhamento;
  if (s !== 'visita_realizada' && s !== 'reuniao_realizada') return false;
  if (c.propostaEnviada) return false;
  const dias = diasDesdeAtendimento(c);
  return dias !== null && dias >= ATENCAO_POS_ATENDIMENTO_DIAS;
}

// ── Sprint S2: fases da proposta + SLA ────────────────────────────────────────
type FaseVisual = {
  tom: 'urgent' | 'action' | 'wait' | 'done' | 'neutral' | 'error';
  icone: string;
  titulo: string;
  descricao: string;
};

const FASE_VISUAL: Record<PropostaFase, FaseVisual> = {
  sem_proposta: {
    tom: 'action', icone: '📋',
    titulo: 'Proposta ainda não enviada',
    descricao: 'Envie sua proposta comercial para avançar no processo.',
  },
  enviada_aguardando_analise: {
    tom: 'wait', icone: '⏳',
    titulo: 'Proposta enviada — aguardando análise',
    descricao: 'A Reforma100 vai analisar sua proposta antes de prosseguir.',
  },
  em_compatibilizacao: {
    tom: 'wait', icone: '🔍',
    titulo: 'Em compatibilização',
    descricao: 'A Reforma100 está comparando sua proposta às demais para o cliente.',
  },
  em_revisao_consultor: {
    tom: 'wait', icone: '👁️',
    titulo: 'Em revisão pelo consultor',
    descricao: 'O consultor está revisando a compatibilização antes de liberar ao cliente.',
  },
  aguardando_cliente: {
    tom: 'wait', icone: '🤔',
    titulo: 'Cliente analisando',
    descricao: 'O comparativo foi enviado ao cliente. Aguarde a decisão.',
  },
  vencedor: {
    tom: 'done', icone: '🏆',
    titulo: 'Você foi recomendado para esta obra',
    descricao: 'O cliente recebeu seu nome como fornecedor recomendado. Aguarde o contato para fechamento.',
  },
  aprovada: {
    tom: 'done', icone: '✅',
    titulo: 'Compatibilização aprovada',
    descricao: 'A análise foi concluída e enviada ao cliente. Aguarde a decisão final.',
  },
  recusada: {
    tom: 'neutral', icone: '⚫',
    titulo: 'Proposta não selecionada',
    descricao: 'Esta proposta não foi a escolhida pelo cliente neste processo.',
  },
  erro: {
    tom: 'error', icone: '⚠️',
    titulo: 'Falha na análise',
    descricao: 'Houve um problema técnico ao analisar a proposta. A Reforma100 já foi avisada.',
  },
};

const TOM_COLORS_FASE: Record<FaseVisual['tom'], { bg: string; bd: string; fg: string }> = {
  urgent:  { bg: I.vm2,   bd: I.vm,   fg: I.vm   },
  action:  { bg: I.azul3, bd: I.azul, fg: I.azul },
  wait:    { bg: I.am2,   bd: I.am,   fg: I.am   },
  done:    { bg: I.vd2,   bd: I.vd,   fg: I.vd   },
  neutral: { bg: I.cz2,   bd: I.bd,   fg: I.cz   },
  error:   { bg: I.vm2,   bd: I.vm,   fg: I.vm   },
};

// SLA: tempo desde o último marcador relevante para a fase atual.
// Usa propostaArquivos (created_at do mais recente) + compat.created_at + compat.aprovado_em.
function deriveSLA(
  fase: PropostaFase,
  propostaArquivos: PropostaArquivo[],
  compat: CompatStatusFornecedor | null,
): { texto: string; dias: number } | null {
  const ultimaProposta = propostaArquivos[0]?.created_at;
  const fmtDias = (ms: number): { texto: string; dias: number } => {
    const dias = Math.floor(ms / 86_400_000);
    const horas = Math.floor(ms / 3_600_000);
    if (dias >= 1) return { texto: dias === 1 ? 'há 1 dia' : `há ${dias} dias`, dias };
    if (horas >= 1) return { texto: horas === 1 ? 'há 1 hora' : `há ${horas} horas`, dias: 0 };
    return { texto: 'há pouco', dias: 0 };
  };

  switch (fase) {
    case 'enviada_aguardando_analise':
      return ultimaProposta ? fmtDias(Date.now() - new Date(ultimaProposta).getTime()) : null;
    case 'em_compatibilizacao':
    case 'em_revisao_consultor':
      return compat ? fmtDias(Date.now() - new Date(compat.created_at).getTime()) : null;
    case 'aguardando_cliente':
      return compat?.aprovado_em
        ? fmtDias(Date.now() - new Date(compat.aprovado_em).getTime())
        : compat ? fmtDias(Date.now() - new Date(compat.created_at).getTime()) : null;
    default:
      return null;
  }
}

// ── Próxima ação ──────────────────────────────────────────────────────────────
// Deriva visualmente o que o fornecedor deve fazer a seguir.
// Não altera backend nem status — apenas UI de orientação.
type ProximaAcaoTom = 'urgent' | 'action' | 'wait' | 'done' | 'neutral';
type AncoraSecao = 'atendimento' | 'proposta' | 'escopo';

interface ProximaAcao {
  tom: ProximaAcaoTom;
  icone: string;
  titulo: string;
  ancora?: AncoraSecao;
}

function deriveProximaAcao(c: CandidaturaOrcamento, fase: PropostaFase): ProximaAcao {
  const s = c.statusAcompanhamento;
  if (s === 'visita_agendada' || s === 'reuniao_agendada') {
    return { tom: 'urgent', icone: '⚡', titulo: 'Confirme sua presença no atendimento', ancora: 'atendimento' };
  }
  if ((s === 'visita_realizada' || s === 'reuniao_realizada') && !c.propostaEnviada) {
    // B5.15: pós-atendimento sem proposta há ≥3 dias vira urgente
    if (isAtencaoPosAtendimento(c)) {
      const dias = Math.floor(diasDesdeAtendimento(c) ?? 0);
      return {
        tom: 'urgent',
        icone: '⚡',
        titulo: `Envie sua proposta — atendimento realizado há ${dias} dias`,
        ancora: 'proposta',
      };
    }
    return { tom: 'action', icone: '📋', titulo: 'Envie sua proposta para avançar no processo', ancora: 'proposta' };
  }
  if (s === 'em_orcamento') {
    return { tom: 'action', icone: '✍️', titulo: 'Prepare e anexe sua proposta', ancora: 'proposta' };
  }
  // Pós-envio: usar a fase real (compat) quando disponível
  if (fase === 'em_compatibilizacao') {
    return { tom: 'wait', icone: '🔍', titulo: 'Em compatibilização — Reforma100 analisando', ancora: 'proposta' };
  }
  if (fase === 'em_revisao_consultor') {
    return { tom: 'wait', icone: '👁️', titulo: 'Em revisão pelo consultor', ancora: 'proposta' };
  }
  if (fase === 'aguardando_cliente') {
    return { tom: 'wait', icone: '🤔', titulo: 'Cliente analisando — aguarde a decisão', ancora: 'proposta' };
  }
  if (fase === 'vencedor') {
    return { tom: 'done', icone: '🏆', titulo: 'Você foi recomendado para esta obra — aguarde contato' };
  }
  if (fase === 'aprovada') {
    return { tom: 'done', icone: '✅', titulo: 'Compatibilização aprovada — cliente decidindo' };
  }
  if (fase === 'recusada' || s === 'negocio_perdido') {
    return { tom: 'neutral', icone: '⚫', titulo: 'Processo encerrado' };
  }
  if (fase === 'erro') {
    return { tom: 'urgent', icone: '⚠️', titulo: 'Houve um problema na análise — Reforma100 foi avisada', ancora: 'proposta' };
  }
  if (s === 'orcamento_enviado') {
    return { tom: 'wait', icone: '⏳', titulo: 'Proposta enviada — aguardando análise', ancora: 'proposta' };
  }
  if (s === 'negocio_fechado') {
    return { tom: 'done', icone: '🎉', titulo: 'Negócio fechado — aguarde próximos passos' };
  }
  return { tom: 'neutral', icone: '📌', titulo: 'Acompanhe o andamento deste processo', ancora: 'escopo' };
}

const TOM_COLORS: Record<ProximaAcaoTom, { bg: string; bd: string; fg: string }> = {
  urgent:  { bg: I.vm2,   bd: I.vm,   fg: I.vm   },
  action:  { bg: I.azul3, bd: I.azul, fg: I.azul },
  wait:    { bg: I.am2,   bd: I.am,   fg: I.am   },
  done:    { bg: I.vd2,   bd: I.vd,   fg: I.vd   },
  neutral: { bg: I.cz2,   bd: I.bd,   fg: I.cz   },
};

function ProximaAcaoBanner({ candidatura, fase }: { candidatura: CandidaturaOrcamento; fase: PropostaFase }) {
  const acao = deriveProximaAcao(candidatura, fase);
  const c = TOM_COLORS[acao.tom];
  const clicavel = !!acao.ancora;

  const handleClick = () => {
    if (!acao.ancora) return;
    const el = document.getElementById(`ficha-secao-${acao.ancora}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      role={clicavel ? 'button' : undefined}
      onClick={clicavel ? handleClick : undefined}
      style={{
        marginBottom: 16,
        background: c.bg,
        border: `1.5px solid ${c.bd}`,
        borderLeft: `4px solid ${c.bd}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: clicavel ? 'pointer' : 'default',
        transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={e => { if (clicavel) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { if (clicavel) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{acao.icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: c.fg, opacity: .75, marginBottom: 2 }}>
          Próxima ação
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.fg, fontFamily: "'Syne',sans-serif", lineHeight: 1.35 }}>
          {acao.titulo}
        </div>
      </div>
      {clicavel && (
        <span style={{ fontSize: 16, color: c.fg, fontWeight: 700, lineHeight: 1 }}>→</span>
      )}
    </div>
  );
}

// ── Timeline operacional ──────────────────────────────────────────────────────
// Cronologia derivada APENAS de timestamps reais já presentes em CandidaturaOrcamento.
// Eventos sem timestamp dedicado (proposta enviada, visita realizada, fechamento)
// aparecem no topo sem data — não inventamos timestamps.
type EventoTipo =
  | 'orcamento_publicado'
  | 'candidatura'
  | 'atendimento_agendado'
  | 'presenca_confirmada'
  | 'cliente_confirmou'
  | 'lembrete_24h'
  | 'lembrete_12h'
  | 'lembrete_6h'
  | 'visita_realizada'
  | 'proposta_pendente_atencao'
  | 'proposta_enviada'
  | 'compat_iniciada'
  | 'compat_em_revisao'
  | 'compat_aprovada'
  | 'aguardando_cliente'
  | 'compat_erro'
  | 'negocio_fechado'
  | 'negocio_perdido';

interface EventoTimeline {
  tipo: EventoTipo;
  label: string;
  data: Date | null;
  icone: string;
  cor: string;
}

function deriveEventos(c: CandidaturaOrcamento, compat: CompatStatusFornecedor | null): EventoTimeline[] {
  const out: EventoTimeline[] = [];
  const s = c.statusAcompanhamento;
  const isReu = s === 'reuniao_agendada' || s === 'reuniao_realizada';

  // Eventos com timestamp
  out.push({
    tipo: 'orcamento_publicado',
    label: 'Orçamento publicado pela Reforma100',
    data: c.dataPublicacao,
    icone: '📣',
    cor: I.azul,
  });
  out.push({
    tipo: 'candidatura',
    label: 'Você se candidatou',
    data: c.dataCandidatura,
    icone: '✋',
    cor: I.azul,
  });
  if (c.horarioVisitaAgendado) {
    out.push({
      tipo: 'atendimento_agendado',
      label: isReu ? 'Reunião online marcada' : 'Visita presencial marcada',
      data: new Date(c.horarioVisitaAgendado),
      icone: isReu ? '🎥' : '📅',
      cor: I.lj,
    });
  }
  if (c.preConfirmadoEm) {
    out.push({
      tipo: 'presenca_confirmada',
      label: 'Presença confirmada na plataforma',
      data: new Date(c.preConfirmadoEm),
      icone: '✅',
      cor: I.vd,
    });
  }
  if (c.visitaConfirmadaEm) {
    out.push({
      tipo: 'cliente_confirmou',
      label: 'Cliente confirmou a visita',
      data: new Date(c.visitaConfirmadaEm),
      icone: '🙋',
      cor: I.vd,
    });
  }
  if (c.notif24hEm) out.push({ tipo: 'lembrete_24h', label: 'Lembrete 24h enviado', data: new Date(c.notif24hEm), icone: '🔔', cor: I.cz });
  if (c.notif12hEm) out.push({ tipo: 'lembrete_12h', label: 'Lembrete 12h enviado', data: new Date(c.notif12hEm), icone: '🔔', cor: I.cz });
  if (c.notif6hEm)  out.push({ tipo: 'lembrete_6h',  label: 'Lembrete 6h enviado',  data: new Date(c.notif6hEm),  icone: '🔔', cor: I.cz });

  // Eventos sem timestamp dedicado (derivados de status / propostaEnviada)
  if (s === 'visita_realizada' || s === 'reuniao_realizada' || s === 'em_orcamento' || s === 'orcamento_enviado' || s === 'negocio_fechado') {
    out.push({
      tipo: 'visita_realizada',
      label: isReu ? 'Reunião realizada' : 'Atendimento realizado',
      data: null,
      icone: '✓',
      cor: I.vd,
    });
  }
  // B5.15: sinal de atenção quando atendimento realizado e proposta não enviada há ≥3 dias
  if (isAtencaoPosAtendimento(c)) {
    const dias = Math.floor(diasDesdeAtendimento(c) ?? 0);
    out.push({
      tipo: 'proposta_pendente_atencao',
      label: `Proposta pendente após atendimento (${dias} dias)`,
      data: null,
      icone: '⚡',
      cor: I.vm,
    });
  }
  if (c.propostaEnviada || s === 'orcamento_enviado' || s === 'negocio_fechado') {
    out.push({
      tipo: 'proposta_enviada',
      label: 'Proposta enviada',
      data: null,
      icone: '📄',
      cor: I.rx,
    });
  }

  // Sprint S2: eventos derivados de compatibilizacoes_analises_ia (timestamp real)
  if (compat && compat.incluido) {
    const compatCreated = new Date(compat.created_at);
    const ativoIA = compat.status === 'processando' || compat.status === 'compatibilizando' || compat.status === 'pending';
    const concluido = compat.status === 'concluida' || compat.status === 'completed' || compat.status === 'pendente_revisao' || compat.status === 'revisado';

    if (ativoIA || concluido || compat.status === 'aprovado' || compat.status === 'enviado') {
      out.push({
        tipo: 'compat_iniciada',
        label: 'Compatibilização iniciada',
        data: compatCreated,
        icone: '🔍',
        cor: I.am,
      });
    }
    if (concluido) {
      out.push({
        tipo: 'compat_em_revisao',
        label: 'Em revisão pelo consultor',
        data: null,
        icone: '👁️',
        cor: I.rx,
      });
    }
    if (compat.status === 'aprovado' && compat.aprovado_em) {
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
        tipo: 'aguardando_cliente',
        label: 'Aguardando decisão do cliente',
        data: null,
        icone: '🤔',
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

  if (s === 'negocio_fechado') {
    out.push({ tipo: 'negocio_fechado', label: 'Negócio fechado', data: null, icone: '🎉', cor: I.vd });
  }
  if (s === 'negocio_perdido') {
    out.push({ tipo: 'negocio_perdido', label: 'Processo encerrado', data: null, icone: '⚫', cor: I.cz });
  }

  return out;
}

function fmtRelativo(d: Date): string {
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000, hora = 3_600_000, dia = 86_400_000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (abs < hora)        return rtf.format(Math.round(diff / min),  'minute');
  if (abs < dia)         return rtf.format(Math.round(diff / hora), 'hour');
  if (abs < dia * 30)    return rtf.format(Math.round(diff / dia),  'day');
  if (abs < dia * 365)   return rtf.format(Math.round(diff / (dia * 30)),  'month');
  return rtf.format(Math.round(diff / (dia * 365)), 'year');
}

function TimelineOperacional({ candidatura, compat, fase }: { candidatura: CandidaturaOrcamento; compat: CompatStatusFornecedor | null; fase: PropostaFase }) {
  // fase é recebida para futura expansão; hoje os eventos derivam de candidatura + compat
  void fase;
  const eventos = (() => {
    const arr = deriveEventos(candidatura, compat);
    return arr.sort((a, b) => {
      // Eventos sem data ficam no topo (representam o estado atual)
      if (!a.data && !b.data) return 0;
      if (!a.data) return -1;
      if (!b.data) return 1;
      return b.data.getTime() - a.data.getTime();
    });
  })();

  if (eventos.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 12 }}>
        Histórico do processo
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {eventos.map((ev, i) => {
          const ehUltimo = i === eventos.length - 1;
          return (
            <li
              key={`${ev.tipo}-${i}`}
              style={{
                position: 'relative',
                paddingLeft: 32,
                paddingBottom: ehUltimo ? 0 : 14,
              }}
            >
              {/* Linha vertical conectora */}
              {!ehUltimo && (
                <span style={{
                  position: 'absolute',
                  left: 11,
                  top: 22,
                  bottom: 0,
                  width: 2,
                  background: I.bd,
                }} />
              )}
              {/* Dot com ícone */}
              <span style={{
                position: 'absolute',
                left: 0,
                top: 2,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                border: `2px solid ${ev.cor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                lineHeight: 1,
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

// ── Seção header ──────────────────────────────────────────────────────────────
function FichaHeader({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const s = candidatura.statusAcompanhamento;
  const isReu = s === 'reuniao_agendada' || s === 'reuniao_realizada';
  const isVis = s === 'visita_agendada' || s === 'visita_realizada';
  const isUrgente = s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento';

  return (
    <div style={{
      background: `linear-gradient(150deg, ${I.azul} 0%, ${I.azul2} 100%)`,
      padding: '20px 20px 16px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: .6, color: '#fff', marginBottom: 6 }}>
        Ficha Operacional
      </div>

      {/* paddingRight reserva espaço para o botão × do Radix Sheet (absolute right-4 top-4) */}
      <div className="r100-clamp-2" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.4, marginBottom: 10, paddingRight: 44 }}>
        {candidatura.necessidade}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(isVis || isReu) && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: isVis ? I.lj2 : I.rx2,
            color: isVis ? I.am : I.rx,
          }}>
            {isVis ? '📅 Presencial' : '🎥 Online'}
          </span>
        )}
        {isUrgente && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: I.vm2, color: I.vm,
          }}>
            ⚡ Ação pendente
          </span>
        )}
        {candidatura.local && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
            📍 {candidatura.local}
            {candidatura.tamanhoImovel > 0 && ` · ${candidatura.tamanhoImovel} m²`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Seção: resultado final ────────────────────────────────────────────────────
function SecaoResultado({ s }: { s: string | null }) {
  const navigate = useNavigate();
  if (s === 'negocio_fechado') {
    return (
      <div style={{ borderRadius: 10, background: I.vd2, border: `1.5px solid ${I.vd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: I.vd, marginBottom: 4 }}>🎉 Negócio fechado</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.6 }}>Parabéns! O contrato está em preparação pela Reforma100.</div>
      </div>
    );
  }
  if (s === 'negocio_perdido') {
    return (
      <div style={{ borderRadius: 10, background: I.cz2, border: `1.5px solid ${I.bd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: I.cz, marginBottom: 2 }}>Proposta não selecionada</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.5, marginBottom: 12 }}>Este processo foi encerrado. Explore novas oportunidades para continuar crescendo.</div>
        <button
          onClick={() => navigate('/dashboard?view=disponiveis')}
          style={{
            background: I.azul, color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1,
            minHeight: 44,
          }}
        >
          Explorar novos orçamentos →
        </button>
      </div>
    );
  }
  return null;
}

// Fallback quando horarioVisitaAgendado é null — comum em candidaturas
// anteriores a 2026-03-26 (criação de horarios_visita_orcamento) ou casos em
// que o agendamento foi feito por canal externo (WhatsApp).
function FallbackHorario({
  statusAcompanhamento,
  preConfirmadoEm,
  dataCandidatura,
}: {
  statusAcompanhamento: string | null;
  preConfirmadoEm: string | null;
  dataCandidatura: Date | string;
}) {
  const s = statusAcompanhamento;
  const candDate = dataCandidatura instanceof Date
    ? dataCandidatura
    : new Date(dataCandidatura);

  // Caso 1: presença já confirmada mas horário não registrado.
  if (preConfirmadoEm) {
    return (
      <span style={{ fontWeight: 500, fontStyle: 'italic', color: I.cz, fontFamily: "'DM Sans',sans-serif" }}>
        Presença confirmada em {fmtDt(preConfirmadoEm)} às {fmtTm(preConfirmadoEm)} ·{' '}
        <span style={{ color: I.am }}>horário do atendimento a confirmar com a Reforma100</span>
      </span>
    );
  }

  // Caso 2: visita/reunião marcada mas sem slot registrado (candidatura legada).
  if (s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'visita_realizada' || s === 'reuniao_realizada') {
    return (
      <span style={{ fontWeight: 500, fontStyle: 'italic', color: I.cz, fontFamily: "'DM Sans',sans-serif" }}>
        Horário a confirmar com a Reforma100 ·{' '}
        <span style={{ color: I.cz }}>inscrito em {fmtDt(candDate.toISOString())}</span>
      </span>
    );
  }

  // Caso 3: candidatura recém-criada sem agendamento ainda.
  return (
    <span style={{ fontWeight: 500, fontStyle: 'italic', color: I.cz, fontFamily: "'DM Sans',sans-serif" }}>
      Aguardando agendamento pela Reforma100 ·{' '}
      <span style={{ color: I.cz }}>inscrito em {fmtDt(candDate.toISOString())}</span>
    </span>
  );
}

// ── Seção: ação urgente (visita / reunião) ────────────────────────────────────
function SecaoAtendimento({
  candidatura, preConfirmadoEm, onPreConfirmar,
}: {
  candidatura: CandidaturaOrcamento;
  preConfirmadoEm: string | null;
  onPreConfirmar: (via: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const s = candidatura.statusAcompanhamento;
  const isVA = s === 'visita_agendada';
  const isVR = s === 'visita_realizada';
  const isRA = s === 'reuniao_agendada';
  const isRR = s === 'reuniao_realizada';
  const dt = candidatura.horarioVisitaAgendado;

  // Mostra a seção sempre que o fornecedor já tem horário de atendimento,
  // mesmo que o statusAcompanhamento ainda não tenha avançado para
  // visita_agendada/reuniao_agendada (caso comum logo após a inscrição).
  const temHorarioMarcado = !!dt;
  if (!isVA && !isVR && !isRA && !isRR && !temHorarioMarcado) return null;

  // Tipo do atendimento — quando o status ainda não diferencia, decide pelo
  // sinal mais forte: linkReuniao → online; caso contrário, presencial.
  const isReuniao = isRA || isRR || (!isVA && !isVR && !!candidatura.linkReuniao);
  const isPresencial = !isReuniao;
  const feito = isVR || isRR;
  const horas = dt ? horasRestantes(dt) : null;
  const urgente = horas !== null && horas > 0 && horas <= 24;

  const acBg = isPresencial ? I.lj2 : I.rx2;
  const acBd = isPresencial ? I.lj : I.rx;
  const acFg = isPresencial ? I.am : I.rx;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        {feito ? 'Atendimento realizado' : 'Atendimento agendado'}
      </div>
      <div style={{ borderRadius: 10, background: feito ? I.vd2 : acBg, border: `1.5px solid ${feito ? I.vd : acBd}`, padding: '14px 16px' }}>
        {/* Linha 1: tipo + badges (Concluído / Hoje / Presença confirmada) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16 }}>{isPresencial ? '📅' : '🎥'}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: feito ? I.vd : acFg, fontFamily: "'Syne',sans-serif" }}>
            {isPresencial
              ? (feito ? 'Visita presencial realizada' : 'Visita presencial')
              : (feito ? 'Reunião online realizada' : 'Reunião online')}
          </span>
          {feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vd2, color: I.vd }}>✓ Concluído</span>}
          {urgente && !feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vm2, color: I.vm }}>⚡ Hoje</span>}
          {preConfirmadoEm && !feito && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vd2, color: I.vd }}>
              ✅ Presença confirmada
            </span>
          )}
        </div>

        {/* Linha 2: data + hora SEMPRE visíveis (Sprint S2 fix) */}
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: feito ? I.vd : acFg,
          marginBottom: !feito ? 12 : 0,
          fontFamily: "'Syne',sans-serif",
        }}>
          {dt ? (
            <>
              {fmtDt(dt)} às {fmtTm(dt)}
              {!feito && horas !== null && horas > 0 && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: horas <= 24 ? I.vm : I.cz, fontFamily: "'DM Sans',sans-serif" }}>
                  (em {horas < 24 ? `${horas}h` : `${Math.round(horas / 24)} dia(s)`})
                </span>
              )}
            </>
          ) : (
            <FallbackHorario
              statusAcompanhamento={s}
              preConfirmadoEm={preConfirmadoEm}
              dataCandidatura={candidatura.dataCandidatura}
            />
          )}
        </div>

        {/* CTA confirmar presença — apenas presencial, não realizada, não pré-confirmada */}
        {!feito && isPresencial && !preConfirmadoEm && (
          <button
            style={{ background: I.azul, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
            onClick={() => onPreConfirmar('plataforma')}
          >
            ✓ Confirmar presença na plataforma
          </button>
        )}

        {!feito && isReuniao && (
          candidatura.linkReuniao && candidatura.tokenVisita ? (
            <button
              style={{ background: I.azul, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
              onClick={() => navigate(`/entrar-reuniao/${candidatura.candidaturaId}/${candidatura.tokenVisita}`)}
            >
              🔗 Entrar na reunião agora
            </button>
          ) : (
            <div style={{ fontSize: 12, color: I.rx, background: I.rx2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
              🔗 O link de acesso será enviado pela Reforma100 antes da reunião.
            </div>
          )
        )}

        {!feito && (
          <LembretesAutomaticos
            dt={dt}
            notif24h={candidatura.notif24hEm ?? null}
            notif12h={candidatura.notif12hEm ?? null}
            notif6h={candidatura.notif6hEm ?? null}
          />
        )}
      </div>
    </div>
  );
}

// ── Lembretes automáticos (visual) ────────────────────────────────────────────
// Estrutura visual; o envio real será integrado pelo backend posteriormente.
// Quando ainda não há horário agendado, todos os chips aparecem como "pendente".
function LembretesAutomaticos({
  dt, notif24h, notif12h, notif6h,
}: {
  dt: string | null;
  notif24h: string | null;
  notif12h: string | null;
  notif6h: string | null;
}) {
  const horas = dt ? horasRestantes(dt) : Infinity;
  const itens: Array<{ janela: 24 | 12 | 6; enviadoEm: string | null }> = [
    { janela: 24, enviadoEm: notif24h },
    { janela: 12, enviadoEm: notif12h },
    { janela: 6,  enviadoEm: notif6h  },
  ];
  return (
    <div style={{ marginTop: 12, borderTop: `1px dashed ${I.bd}`, paddingTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 6 }}>
        Lembretes automáticos
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {itens.map(({ janela, enviadoEm }) => {
          const enviado = !!enviadoEm;
          const pendente = !enviado && horas > janela;
          const bg = enviado ? I.vd2 : pendente ? I.azul + '11' : I.cz2;
          const fg = enviado ? I.vd  : pendente ? I.azul       : I.cz;
          const icone = enviado ? '✓' : pendente ? '⏳' : '–';
          const sufixo = enviado ? 'enviado' : pendente ? 'pendente' : 'fora da janela';
          return (
            <span
              key={janela}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: bg, color: fg,
                fontSize: 11, fontWeight: 700,
                padding: '4px 9px', borderRadius: 999,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              <span>{icone}</span>
              <span>{janela}h {sufixo}</span>
            </span>
          );
        })}
      </div>
      {!dt && (
        <div style={{ fontSize: 10, color: I.cz, marginTop: 6, lineHeight: 1.4 }}>
          Os lembretes serão enviados automaticamente assim que o horário do atendimento for definido.
        </div>
      )}
    </div>
  );
}

// ── Seção: proposta (Sprint S2) ───────────────────────────────────────────────
// Reescrita para suportar fases visuais, preview, versionamento e SLA.
// Não toca em backend — usa hooks readonly já existentes + usePropostasArquivos.
function SecaoProposta({
  candidatura, fase, compat,
}: {
  candidatura: CandidaturaOrcamento;
  fase: PropostaFase;
  compat: CompatStatusFornecedor | null;
}) {
  const s = candidatura.statusAcompanhamento;
  const isDone = s === 'negocio_fechado' || s === 'negocio_perdido';

  const {
    arquivos, loading, uploading,
    uploadArquivo, removerArquivo, downloadArquivo,
  } = usePropostasArquivos(candidatura.candidaturaId, candidatura.id);

  const { toast } = useToast();
  const [confirmarSubstituir, setConfirmarSubstituir] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState(false);

  const versaoAtual = arquivos[0] ?? null;
  const historico = arquivos.slice(1);

  const podeEnviar = !isDone && fase !== 'aprovada' && fase !== 'recusada';

  const onDrop = useCallback(async (files: File[]) => {
    for (const f of files) {
      const id = await uploadArquivo(f);
      if (id) {
        setFeedbackEnvio(true);
        setTimeout(() => setFeedbackEnvio(false), 3500);
      }
    }
  }, [uploadArquivo]);

  const { getInputProps, open: openPicker } = useDropzone({
    onDrop,
    onDropRejected: () => {
      toast({
        title: 'Arquivo não aceito',
        description: 'Envie PDF, JPEG ou PNG até 10MB.',
        variant: 'destructive',
      });
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png':  ['.png'],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: !podeEnviar || uploading,
    noClick: true,
    noKeyboard: true,
  });

  // Encerrados sem proposta enviada: apenas mensagem mínima.
  if (isDone && !candidatura.propostaEnviada) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
          Proposta comercial
        </div>
        <div style={{ fontSize: 12, color: I.cz, fontStyle: 'italic' }}>
          Processo encerrado sem proposta enviada.
        </div>
      </div>
    );
  }

  const visual = FASE_VISUAL[fase];
  const cor = TOM_COLORS_FASE[visual.tom];
  const sla = !isDone ? deriveSLA(fase, arquivos, compat) : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Proposta comercial
      </div>

      {/* Banner de fase atual */}
      <div style={{
        borderRadius: 10,
        background: cor.bg,
        border: `1.5px solid ${cor.bd}`,
        borderLeft: `4px solid ${cor.bd}`,
        padding: '12px 14px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{visual.icone}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cor.fg, fontFamily: "'Syne',sans-serif" }}>
              {visual.titulo}
            </span>
            {sla && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '1px 7px', borderRadius: 999,
                background: sla.dias >= 5 ? I.vm2 : 'rgba(255,255,255,.55)',
                color: sla.dias >= 5 ? I.vm : cor.fg,
                fontFamily: "'DM Sans',sans-serif",
              }}>
                {sla.texto}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: cor.fg, opacity: .85, lineHeight: 1.4 }}>
            {visual.descricao}
          </div>
        </div>
      </div>

      {/* S3.4: comparativo — posição/score/total quando análise contém dados deste fornecedor */}
      {compat && compat.incluido && compat.posicao !== null && (
        <CompatPosicaoCard compat={compat} fase={fase} />
      )}

      {/* S3.7: bloco de próximos passos quando o fornecedor é o vencedor */}
      {fase === 'vencedor' && (
        <div style={{
          background: I.vd2, border: `1.5px solid ${I.vd}`, borderRadius: 10,
          padding: '12px 14px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: I.vd, opacity: .85, marginBottom: 6 }}>
            Próximos passos
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: I.nv, lineHeight: 1.6 }}>
            <li>A Reforma100 entrará em contato para alinhar o fechamento.</li>
            <li>Mantenha sua proposta acessível para eventuais ajustes do contrato.</li>
            <li>Aguarde a confirmação oficial antes de iniciar qualquer execução.</li>
          </ol>
        </div>
      )}

      {/* S3.7: bloco quando recusada — explica e aponta para Disponíveis */}
      {fase === 'recusada' && (
        <div style={{
          background: I.cz2, border: `1.5px solid ${I.bd}`, borderRadius: 10,
          padding: '12px 14px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.5 }}>
            Esta proposta não foi a escolhida pelo cliente. Continue acompanhando outros
            orçamentos disponíveis na sua Central.
          </div>
        </div>
      )}

      {/* Feedback pós-envio (volátil, 3.5s) */}
      {feedbackEnvio && (
        <div style={{
          background: I.vd2, border: `1.5px solid ${I.vd}`, borderRadius: 8,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'cop-fade-in .25s ease-out',
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: I.vd }}>
            Proposta enviada com sucesso
          </span>
        </div>
      )}

      {/* Estado: carregando arquivos — skeleton (S2.10) */}
      {loading && (
        <div
          aria-busy="true"
          aria-label="Carregando proposta"
          style={{
            background: I.cz2, border: `1.5px solid ${I.bd}`,
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span className="cop-skeleton" style={{ width: 22, height: 22, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="cop-skeleton" style={{ width: '60%', height: 12, marginBottom: 6 }} />
            <div className="cop-skeleton" style={{ width: '40%', height: 10 }} />
          </div>
        </div>
      )}

      {/* Estado: upload em andamento */}
      {uploading && (
        <div style={{
          background: I.azul3, border: `1.5px solid ${I.azul}33`, borderRadius: 8,
          padding: '10px 14px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>📤</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: I.azul }}>
            Enviando proposta…
          </span>
        </div>
      )}

      {/* Versão atual destacada */}
      {!loading && versaoAtual && (
        <ArquivoCard
          arquivo={versaoAtual}
          destaque
          podeRemover={podeEnviar}
          onDownload={() => downloadArquivo(versaoAtual)}
          onRemover={() => removerArquivo(versaoAtual)}
        />
      )}

      {/* Histórico colapsável */}
      {!loading && historico.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setVerHistorico(v => !v)}
            aria-expanded={verHistorico}
            aria-controls="proposta-historico-list"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: I.cz,
              padding: '4px 0', fontFamily: "'Syne',sans-serif",
              textTransform: 'uppercase', letterSpacing: '.06em',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span aria-hidden>{verHistorico ? '▲' : '▼'}</span>
            Histórico de versões ({historico.length})
          </button>
          {verHistorico && (
            <div id="proposta-historico-list" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {historico.map(a => (
                <ArquivoCard
                  key={a.id}
                  arquivo={a}
                  destaque={false}
                  podeRemover={podeEnviar}
                  onDownload={() => downloadArquivo(a)}
                  onRemover={() => removerArquivo(a)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA: anexar / substituir */}
      {!loading && podeEnviar && (
        <div style={{ marginTop: 12 }}>
          <input {...getInputProps()} id="proposta-file-input" />
          {!versaoAtual ? (
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              style={{
                background: I.azul, color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 18px',
                fontSize: 13, fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: "'Syne',sans-serif",
                opacity: uploading ? .6 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                minHeight: 48,
              }}
            >
              📤 Anexar proposta
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarSubstituir(true)}
              disabled={uploading}
              style={{
                background: '#fff', color: I.azul,
                border: `1.5px solid ${I.azul}`,
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: "'Syne',sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              ↻ Enviar nova versão
            </button>
          )}
          <div style={{ fontSize: 10, color: I.cz, marginTop: 6 }}>
            PDF, JPEG ou PNG até 10MB
          </div>
        </div>
      )}

      {/* Edge case: candidatura.propostaEnviada=true mas array vazio (inconsistência) */}
      {!loading && !versaoAtual && candidatura.propostaEnviada && podeEnviar && (
        <div style={{
          background: I.am2, border: `1.5px solid ${I.am}`, borderRadius: 8,
          padding: '10px 14px', marginTop: 10,
          fontSize: 12, color: I.am, lineHeight: 1.5,
        }}>
          <strong>⚠️ Inconsistência detectada:</strong> a candidatura está marcada como
          “proposta enviada”, mas nenhum arquivo está anexado. Anexe a proposta novamente abaixo.
        </div>
      )}

      {/* Sem proposta + processo readonly */}
      {!loading && !podeEnviar && !versaoAtual && (
        <div style={{
          background: I.cz2, border: `1.5px solid ${I.bd}`, borderRadius: 8,
          padding: '12px 14px', textAlign: 'center',
          fontSize: 12, color: I.cz,
        }}>
          Nenhuma proposta anexada.
        </div>
      )}

      {/* Modal: confirmar substituição */}
      {confirmarSubstituir && (
        <Dialog open onOpenChange={open => { if (!open) setConfirmarSubstituir(false); }}>
          <DialogContent className="max-w-md">
            <DialogTitle>Enviar nova versão da proposta?</DialogTitle>
            <DialogDescription>
              A versão atual passará para o histórico. Você poderá voltar a vê-la depois.
            </DialogDescription>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmarSubstituir(false)}
                style={{
                  background: 'transparent', border: `1.5px solid ${I.bd}`,
                  borderRadius: 8, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700, color: I.cz,
                  cursor: 'pointer', fontFamily: "'Syne',sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmarSubstituir(false); openPicker(); }}
                style={{
                  background: I.azul, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Syne',sans-serif",
                }}
              >
                Selecionar arquivo
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Card de arquivo de proposta ───────────────────────────────────────────────
// Preview removido propositalmente para o fornecedor (Sprint S2 fix): o iframe
// embutido apresentava erros de bucket em alguns cenários e o caso de uso
// crítico de pré-visualização será o painel do consultor/admin, não da Ficha.
function ArquivoCard({
  arquivo, destaque, podeRemover, onDownload, onRemover,
}: {
  arquivo: PropostaArquivo;
  destaque: boolean;
  podeRemover: boolean;
  onDownload: () => void;
  onRemover: () => void;
}) {
  const isPdf = arquivo.tipo_arquivo === 'application/pdf';
  const isImg = arquivo.tipo_arquivo.startsWith('image/');
  const icone = isPdf ? '📄' : isImg ? '🖼️' : '📎';

  return (
    <div style={{
      background: destaque ? I.vd2 : I.cz2,
      border: `1.5px solid ${destaque ? I.vd : I.bd}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icone}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: I.nv,
            fontFamily: "'Syne',sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 220,
          }}>
            {arquivo.nome_arquivo}
          </span>
          {destaque && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '1px 6px', borderRadius: 4,
              background: I.vd, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '.05em',
              fontFamily: "'Syne',sans-serif",
            }}>
              versão atual
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: I.cz }}>
          {fmtBytes(arquivo.tamanho)} · {fmtDt(arquivo.created_at)} {fmtTm(arquivo.created_at)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={onDownload}
          title="Baixar"
          aria-label={`Baixar ${arquivo.nome_arquivo}`}
          style={iconBtnStyle(I.azul)}
        >
          ⤓
        </button>
        {podeRemover && (
          <button
            type="button"
            onClick={onRemover}
            title="Remover"
            aria-label={`Remover ${arquivo.nome_arquivo}`}
            style={iconBtnStyle(I.vm)}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Comparativo: posição/score do fornecedor na compatibilização (S3.4) ───────
function CompatPosicaoCard({
  compat, fase,
}: {
  compat: CompatStatusFornecedor;
  fase: PropostaFase;
}) {
  const pos = compat.posicao ?? 0;
  const total = compat.total_propostas || 0;
  const score = compat.score;
  const isWinner = compat.recomendado;
  const podridao = (compat.diferenca_mercado !== null && Math.abs(compat.diferenca_mercado) > 15);

  const bg = isWinner ? I.vd2 : pos === 1 ? I.vd2 : pos === 2 || pos === 3 ? I.am2 : I.cz2;
  const bd = isWinner ? I.vd : pos === 1 ? I.vd : pos === 2 || pos === 3 ? I.am : I.bd;
  const fg = isWinner ? I.vd : pos === 1 ? I.vd : pos === 2 || pos === 3 ? I.am : I.cz;

  const posLabel = pos === 1 ? '1º lugar' : pos === 2 ? '2º lugar' : pos === 3 ? '3º lugar' : `${pos}º`;

  return (
    <div style={{
      marginBottom: 12,
      borderRadius: 10,
      border: `1.5px solid ${bd}`,
      background: bg,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: fg, opacity: .85, marginBottom: 6 }}>
        Sua posição na compatibilização
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 56, height: 40, borderRadius: 8,
          background: fg, color: '#fff',
          fontSize: 16, fontWeight: 800,
          fontFamily: "'Syne',sans-serif",
          padding: '0 10px',
        }}>
          {posLabel}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: I.nv, fontFamily: "'Syne',sans-serif" }}>
            {total > 1 ? `Entre ${total} propostas avaliadas` : 'Avaliação concluída'}
          </div>
          {score !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{
                flex: 1, height: 6, borderRadius: 3,
                background: I.bd, overflow: 'hidden',
                maxWidth: 160,
              }}>
                <div style={{
                  width: `${Math.max(0, Math.min(100, score))}%`,
                  height: '100%',
                  background: score >= 75 ? I.vd : score >= 50 ? I.am : I.vm,
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: I.cz, fontFamily: "'DM Sans',sans-serif" }}>
                {Math.round(score)}/100
              </span>
            </div>
          )}
        </div>

        {isWinner && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 999,
            background: I.vd, color: '#fff',
            fontFamily: "'Syne',sans-serif",
            whiteSpace: 'nowrap',
          }}>
            🏆 Recomendado
          </span>
        )}
      </div>

      {podridao && fase !== 'vencedor' && fase !== 'recusada' && (
        <div style={{ fontSize: 11, color: fg, marginTop: 8, lineHeight: 1.4 }}>
          {compat.diferenca_mercado! > 0
            ? `Seu valor está ${compat.diferenca_mercado!.toFixed(0)}% acima da média do mercado para este escopo.`
            : `Seu valor está ${Math.abs(compat.diferenca_mercado!).toFixed(0)}% abaixo da média — pode soar conservador para o cliente.`}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = (cor: string) => ({
  background: 'transparent',
  border: 'none',
  color: cor,
  fontSize: 14,
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  lineHeight: 1,
  minWidth: 32,
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background .12s',
} as const);

// ── Seção: dados do orçamento ─────────────────────────────────────────────────
function SecaoDadosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const prazo = typeof candidatura.dataInicio === 'string'
    ? candidatura.dataInicio
    : candidatura.dataInicio instanceof Date
      ? fmtDt(candidatura.dataInicio.toISOString())
      : '—';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Dados do orçamento
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {candidatura.categorias?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, marginBottom: 4, fontWeight: 600 }}>Categorias</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {candidatura.categorias.map(cat => (
                <span key={cat} style={{ fontSize: 11, background: I.azul3, color: I.azul, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Prazo desejado</div>
            <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>{prazo}</div>
          </div>
          {candidatura.conciergeResponsavel && (
            <div>
              <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Concierge</div>
              <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>👤 {candidatura.conciergeResponsavel.nome}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Seção: anexos do orçamento ────────────────────────────────────────────────
function SecaoAnexosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const fotos = candidatura.fotos ?? [];
  const docs = candidatura.arquivos ?? [];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Anexos do orçamento
      </div>

      {fotos.length === 0 && docs.length === 0 && (
        <div style={{
          background: I.cz2, borderRadius: 8, padding: '12px 14px',
          fontSize: 12, color: I.cz, textAlign: 'center',
        }}>
          Sem anexos enviados
        </div>
      )}

      {fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: docs.length > 0 ? 10 : 0 }}>
          {fotos.map(foto => (
            <a
              key={foto.id}
              href={foto.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: I.cz2 }}
            >
              <img
                src={foto.url_arquivo}
                alt={foto.nome_arquivo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </a>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <a
              key={doc.id}
              href={doc.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: I.bg, borderRadius: 8, padding: '10px 12px',
                textDecoration: 'none', border: `1px solid ${I.bd}`,
              }}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: I.nv, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.nome_arquivo}
                </div>
                <div style={{ fontSize: 10, color: I.cz }}>{fmtBytes(doc.tamanho)}</div>
              </div>
              <span style={{ fontSize: 11, color: I.azul, fontWeight: 700, flexShrink: 0 }}>↓</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seção: escopo completo ────────────────────────────────────────────────────
function SecaoEscopo({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  if (!candidatura.necessidade) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Escopo do cliente
      </div>
      <div style={{
        background: I.bg, borderRadius: 10, padding: '14px 16px',
        fontSize: 13, color: I.nv, lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {candidatura.necessidade}
      </div>
    </div>
  );
}

// ── Seção: contato do cliente ─────────────────────────────────────────────────
function SecaoContato({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const contato = candidatura.dadosContato;
  if (!contato || (!contato.nome && !contato.telefone && !contato.email)) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Contato do cliente
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contato.nome && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Nome</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600 }}>{contato.nome}</div>
          </div>
        )}
        {contato.telefone && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Telefone</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600 }}>📞 {contato.telefone}</div>
          </div>
        )}
        {contato.email && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>E-mail</div>
            <div style={{ fontSize: 13, color: I.nv, fontWeight: 600, wordBreak: 'break-all' }}>✉️ {contato.email}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface FichaOperacionalProps {
  candidatura: CandidaturaOrcamento | null;
  onClose: () => void;
}

export function FichaOperacionalFornecedor({ candidatura, onClose }: FichaOperacionalProps) {
  const [preConfirmadoEm, setPreConfirmadoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Reseta estado local de confirmação cada vez que uma candidatura diferente abre
  useEffect(() => {
    setPreConfirmadoEm(null);
  }, [candidatura?.candidaturaId]);

  const confirmedAt = candidatura?.preConfirmadoEm ?? null;

  // Sprint S2 + S3: status de compatibilização + fase visual derivada
  const { compat } = useCompatStatusFornecedor(candidatura?.id, candidatura?.candidaturaId);
  const fase: PropostaFase = useMemo(() => {
    if (!candidatura) return 'sem_proposta';
    // S3: negocio_fechado + recomendado → vencedor; senão → aprovada (compat enviada mas cliente ainda decidindo entre opções)
    if (candidatura.statusAcompanhamento === 'negocio_fechado') {
      return compat?.recomendado ? 'vencedor' : 'aprovada';
    }
    if (candidatura.statusAcompanhamento === 'negocio_perdido') return 'recusada';
    return deriveFasePropostaFromCompat(!!candidatura.propostaEnviada, compat);
  }, [candidatura, compat]);

  const handlePreConfirmar = async (via: string) => {
    if (!candidatura || preConfirmadoEm || confirmedAt || salvando) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({ pre_confirmado_em: agora, pre_confirmado_via: via })
        .eq('id', candidatura.candidaturaId)
        .is('pre_confirmado_em', null);
      setPreConfirmadoEm(agora);
    } catch { /* silent */ } finally {
      setSalvando(false);
    }
  };

  const isOpen = candidatura !== null;

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] max-w-full p-0 flex flex-col overflow-hidden [&>button]:text-white [&>button]:opacity-90 [&>button]:bg-white/20 [&>button]:rounded-lg [&>button]:w-11 [&>button]:h-11 [&>button]:top-3 [&>button]:right-3"
      >
        {/* Acessibilidade obrigatória para Radix */}
        <SheetTitle className="sr-only">Ficha Operacional</SheetTitle>
        <SheetDescription className="sr-only">Detalhes e ações da candidatura</SheetDescription>

        {candidatura && (
          <>
            <FichaHeader candidatura={candidatura} />

            {/* Corpo rolável */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
              <ProximaAcaoBanner candidatura={candidatura} fase={fase} />

              <TimelineOperacional candidatura={candidatura} compat={compat} fase={fase} />

              <SecaoResultado s={candidatura.statusAcompanhamento} />

              {/* Proposta sobe quando a ação principal é enviar proposta */}
              {candidatura.statusAcompanhamento === 'em_orcamento' && (
                <div id="ficha-secao-proposta">
                  <SecaoProposta
                    candidatura={candidatura}
                    fase={fase}
                    compat={compat}
                  />
                </div>
              )}

              <div id="ficha-secao-atendimento">
                <SecaoAtendimento
                  candidatura={candidatura}
                  preConfirmadoEm={preConfirmadoEm ?? confirmedAt}
                  onPreConfirmar={handlePreConfirmar}
                />
              </div>

              {/* Proposta na posição normal para todos os outros estados */}
              {candidatura.statusAcompanhamento !== 'em_orcamento' && (
                <div id="ficha-secao-proposta">
                  <SecaoProposta
                    candidatura={candidatura}
                    fase={fase}
                    compat={compat}
                  />
                </div>
              )}

              <div id="ficha-secao-escopo">
                <SecaoEscopo candidatura={candidatura} />
              </div>
              <SecaoContato candidatura={candidatura} />
              <SecaoDadosOrcamento candidatura={candidatura} />
              <SecaoAnexosOrcamento candidatura={candidatura} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
