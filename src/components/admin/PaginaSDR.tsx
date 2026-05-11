import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { useOrcamento } from '@/context/OrcamentoContext';
import { isFullAccess } from '@/utils/accessControl';
import { calcularValorTecnico, formatarBRL } from '@/utils/valorTecnico';
import { CATEGORIAS_SERVICO, PRAZOS_INICIO } from '@/constants/orcamento';
import { type NovoOrcamentoInput } from '@/types';
import { dispararEstimativaIA } from '@/hooks/useGerarEstimativaIA';
import { formatarGap } from '@/utils/valorTecnico';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { consultarCep, type CepResultado } from '@/utils/cepIntelligencia';

const C = {
  NV:  '#2D3395',       // Isabella blue – primary brand
  NV2: '#1E2882',       // Isabella blue darker
  LJ:  '#F7A226',       // Isabella orange/amber
  FD:  '#F7F6F3',       // off-white background
  BD:  '#E0DDD7',       // border
  CZ:  '#6B7280',       // grey text
  text: '#1A1A1A',
  white: '#FFFFFF',
  green: '#1B7A4A',     // Isabella green
  greenBg: '#E8F5EE',
  orangeBg: '#FFF5E6',
  blueBg:   '#EEF0FF',
};

function useSDRStyles() {
  useEffect(() => {
    const id = 'sdr-isabella-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      .sdr-filter-grid { display: flex; flex-wrap: wrap; gap: 10px; }
      @media (max-width: 640px) {
        .sdr-filter-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        .sdr-filter-card { min-width: 0 !important; padding: 10px 8px !important; flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
        .sdr-filter-num  { font-size: 18px !important; }
        .sdr-filter-lbl  { font-size: 10px !important; }
        .sdr-filter-badge { top: -5px !important; right: -5px !important; }
        .sdr-header-row  { flex-direction: column !important; gap: 12px !important; }
        .sdr-header-btns { width: 100% !important; }
        .sdr-header-btns button { flex: 1 !important; justify-content: center !important; }
        .sdr-search-row  { flex-direction: column !important; gap: 8px !important; }
        .sdr-sort-btns   { flex-wrap: wrap !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);
}

type SortMode = 'prioridade' | 'cronologico';

type StatusAcomp =
  | 'sem_contato'
  | 'em_contato'
  | 'visita_agendada'
  | 'visita_realizada'
  | 'reuniao_agendada'
  | 'reuniao_realizada';

// Status derivado das candidaturas — representa o estado real do lead no SDR
type LeadStatus = 'novo' | 'em_contato' | 'agendamento_definido' | 'aguardando_realizacao';

const LEAD_STATUS_INFO: Record<LeadStatus, { label: string; bg: string; clr: string; icon: string }> = {
  novo:                 { label: 'Novo',                  bg: '#EEF0FF', clr: '#3B35B7', icon: '🆕' },
  em_contato:          { label: 'Em contato',             bg: '#FFF5DC', clr: '#9A6200', icon: '📞' },
  agendamento_definido:{ label: 'Agendamento definido',   bg: '#EEF0FF', clr: '#534AB7', icon: '📅' },
  aguardando_realizacao:{ label: 'Aguardando realização', bg: '#FFF0E8', clr: '#C45B10', icon: '⏰' },
};

function getLeadStatus(lead: Lead): LeadStatus {
  const cands = lead.candidaturas;
  if (cands.length === 0) return 'novo';

  const agendadas = cands.filter(c =>
    c.status_acompanhamento === 'visita_agendada' ||
    c.status_acompanhamento === 'reuniao_agendada'
  );

  if (agendadas.length > 0) {
    // Se o horário agendado já passou → aguardando confirmação do SDR
    const agora = Date.now();
    const algumPassou = agendadas.some(c =>
      c.horario && new Date(c.horario.data_hora).getTime() < agora
    );
    return algumPassou ? 'aguardando_realizacao' : 'agendamento_definido';
  }

  if (cands.some(c => c.status_acompanhamento === 'em_contato')) return 'em_contato';

  // Fallback: etapa_crm indica que o SDR já entrou em contato mas sem candidaturas ainda
  if (lead.etapa === 'contato_agendamento') return 'em_contato';

  return 'novo'; // candidaturas existem mas todas sem_contato
}

// ─── Filtros temporais + Status operacional SDR ───────────────────────────────

type FiltroTempo = 'todos' | 'novos' | '24h' | '12h' | '6h' | 'vagas_abertas' | 'acoes_urgentes' | 'ganhos' | 'perdidos';

type StatusOperacional =
  | 'confirmacao_final_6h'
  | 'a_confirmar_12h'
  | 'a_confirmar_24h'
  | 'sem_horario'
  | 'confirmado'
  | 'reagendar';

const STATUS_OP_INFO: Record<StatusOperacional, { label: string; bg: string; clr: string }> = {
  confirmacao_final_6h: { label: '⏰ Conf. final',    bg: '#FEE2E2', clr: '#991B1B' },
  a_confirmar_12h:      { label: '🔔 Conf. 12h',      bg: '#FFF5DC', clr: '#9A6200' },
  a_confirmar_24h:      { label: '📅 Conf. 24h',      bg: '#EEF0FF', clr: '#534AB7' },
  sem_horario:          { label: 'Sem horário',        bg: '#F5F3EF', clr: '#6B6760' },
  confirmado:           { label: '✅ Confirmado',      bg: '#E8F5EE', clr: '#1A7A4A' },
  reagendar:            { label: '🔄 Reagendar',       bg: '#FFF0E8', clr: '#C45B10' },
};

function getProximoHorarioCandidatura(lead: Lead): Date | null {
  const now = Date.now();
  const futuros: Date[] = [];
  for (const c of lead.candidaturas) {
    if (c.horario) {
      const d = new Date(c.horario.data_hora);
      if (d.getTime() > now) futuros.push(d);
    }
  }
  if (futuros.length === 0) return null;
  return futuros.reduce((min, d) => d < min ? d : min);
}

function leadTemHorarioFuturo(lead: Lead): boolean {
  const now = Date.now();
  return (
    (lead.horarios_sdr?.some(h => new Date(h.data_hora).getTime() > now) ?? false) ||
    (lead.candidaturas?.some(c => c.horario && new Date(c.horario.data_hora).getTime() > now) ?? false)
  );
}

function leadTemVagaAberta(lead: Lead): boolean {
  return leadTemHorarioFuturo(lead) && (lead.candidaturas?.length ?? 0) < 3;
}

function leadTemProblema(lead: Lead): boolean {
  // Horários definidos pelo SDR todos vencidos sem candidatura realizada → urgente
  const temHorarioSdrVencido =
    (lead.horarios_sdr?.length ?? 0) > 0 &&
    !leadTemHorarioFuturo(lead) &&
    lead.candidaturas.every(c =>
      c.status_acompanhamento !== 'visita_realizada' &&
      c.status_acompanhamento !== 'reuniao_realizada'
    );
  if (temHorarioSdrVencido) return true;

  return lead.candidaturas.some(cand => {
    if (!cand.horario) return false;
    const diffH = (new Date(cand.horario.data_hora).getTime() - Date.now()) / 3600000;
    if (diffH < 0) return true; // horário vencido sem realização
    const conf = cand.confirmacoesDb;
    if (!conf) return false;
    return (
      conf.cliente_24h === false || conf.fornecedor_24h === false ||
      conf.cliente_12h === false || conf.fornecedor_12h === false ||
      conf.cliente_6h  === false || conf.fornecedor_6h  === false
    );
  });
}

function filtrarLeadsPorTempo(leads: Lead[], filtro: FiltroTempo): Lead[] {
  if (filtro === 'todos') return leads;
  if (filtro === 'novos') return leads.filter(lead => getProximoHorarioCandidatura(lead) === null);
  if (filtro === 'vagas_abertas')  return leads.filter(leadTemVagaAberta);
  if (filtro === 'acoes_urgentes') return leads.filter(leadTemProblema);
  if (filtro === 'ganhos' || filtro === 'perdidos') return []; // dados vêm de estado separado
  const now = Date.now();
  const H = 3600000;
  return leads.filter(lead =>
    lead.candidaturas.some(c => {
      if (!c.horario) return false;
      const diffH = (new Date(c.horario.data_hora).getTime() - now) / H;
      if (diffH < 0) return false;
      switch (filtro) {
        case '6h':  return diffH <= 6;
        case '12h': return diffH <= 12;
        case '24h': return diffH <= 24;
        default:    return false;
      }
    })
  );
}

function getStatusOperacional(cand: Candidatura): StatusOperacional {
  const st = cand.status_acompanhamento;
  if (st === 'visita_realizada' || st === 'reuniao_realizada') return 'confirmado';
  if (!cand.horario) return 'sem_horario';
  const now = Date.now();
  const dt = new Date(cand.horario.data_hora).getTime();
  if (dt < now) return 'reagendar';
  const diffH = (dt - now) / 3600000;
  if (diffH <= 6)  return 'confirmacao_final_6h';
  if (diffH <= 12) return 'a_confirmar_12h';
  if (diffH <= 24) return 'a_confirmar_24h';
  return 'sem_horario';
}

// ─── Confirmação dupla operacional ────────────────────────────────────────────

type ConfirmacaoStatus = null | true | false; // null = pendente, true = confirmou, false = não confirmou

interface ConfirmacoesDuplas {
  cliente_24h:    ConfirmacaoStatus;
  fornecedor_24h: ConfirmacaoStatus;
  cliente_12h:    ConfirmacaoStatus;
  fornecedor_12h: ConfirmacaoStatus;
  cliente_6h:     ConfirmacaoStatus;
  fornecedor_6h:  ConfirmacaoStatus;
}

type DecisaoOp = 'aguardando' | 'visita_liberada' | 'cancelar_reagendar' | 'substituir_fornecedor';

const DECISAO_INFO: Record<DecisaoOp, { label: string; bg: string; clr: string }> = {
  aguardando:            { label: '⏳ Aguardando',             bg: '#F5F3EF', clr: '#6B6760' },
  visita_liberada:       { label: '✅ Visita liberada',        bg: '#E8F5EE', clr: '#1A7A4A' },
  cancelar_reagendar:    { label: '❌ Cancelar / Reagendar',   bg: '#FEE2E2', clr: '#991B1B' },
  substituir_fornecedor: { label: '🔁 Substituir fornecedor',  bg: '#FFF0E8', clr: '#C45B10' },
};

function getDecisaoOp(confirmacoes: ConfirmacoesDuplas, statusOp: StatusOperacional): DecisaoOp {
  const janela =
    statusOp === 'confirmacao_final_6h' ? '6h' :
    statusOp === 'a_confirmar_12h'      ? '12h' :
    statusOp === 'a_confirmar_24h'      ? '24h' : null;
  if (!janela) return 'aguardando';
  const cli  = confirmacoes[`cliente_${janela}`    as keyof ConfirmacoesDuplas];
  const forn = confirmacoes[`fornecedor_${janela}` as keyof ConfirmacoesDuplas];
  if (cli === false) return 'cancelar_reagendar';
  if (forn === false) return 'substituir_fornecedor';
  if (cli === true && forn === true) return 'visita_liberada';
  return 'aguardando';
}

// Retorna a etapa que ficou pendente (sem confirmação dupla completa) se o lead já avançou de janela.
// Ex: candidatura está em 12h mas as confirmações de 24h ainda não foram feitas → retorna '24h'.
function getEtapaPendente(cand: Candidatura): '24h' | '12h' | null {
  const statusOp = getStatusOperacional(cand);
  const janela =
    statusOp === 'confirmacao_final_6h' ? '6h' :
    statusOp === 'a_confirmar_12h'      ? '12h' :
    statusOp === 'a_confirmar_24h'      ? '24h' : null;
  if (!janela) return null;
  const c = cand.confirmacoesDb;
  if (!c) return null;
  if ((janela === '12h' || janela === '6h') &&
      (c.cliente_24h === null || c.fornecedor_24h === null)) return '24h';
  if (janela === '6h' &&
      (c.cliente_12h === null || c.fornecedor_12h === null)) return '12h';
  return null;
}

function hasPendenciaEtapa(cand: Candidatura, etapa: '24h' | '12h' | '6h'): boolean {
  if (!cand.horario) return false;
  const diffH = (new Date(cand.horario.data_hora).getTime() - Date.now()) / 3600000;
  // Horário vencido → contabilizado em alertaGeral (Total fila), não nas janelas
  if (diffH < 0) return false;
  const limite = etapa === '24h' ? 24 : etapa === '12h' ? 12 : 6;
  // Visita ainda fora desta janela → não alertar aqui
  if (diffH > limite) return false;
  const conf = cand.confirmacoesDb;
  if (!conf) return false;
  return (
    conf[`cliente_${etapa}` as keyof ConfirmacoesDuplas] === null ||
    conf[`fornecedor_${etapa}` as keyof ConfirmacoesDuplas] === null
  );
}

function leadTemPendenciaEtapa(lead: Lead, etapa: '24h' | '12h' | '6h'): boolean {
  return lead.candidaturas.some(cand => hasPendenciaEtapa(cand, etapa));
}

// Classifica o pior estado de alerta do lead com base em todas as candidaturas.
// Usado pelo LeadCard (card fechado) para sinalizar ao SDR sem precisar abrir.
type LeadAlerta = 'critico' | 'pendente' | 'aguardando' | 'normal';

function getLeadAlerta(lead: Lead): LeadAlerta {
  let estado: LeadAlerta = 'normal';
  for (const cand of lead.candidaturas) {
    const st = getStatusOperacional(cand);
    if (st === 'reagendar') return 'critico';
    if (getEtapaPendente(cand) !== null) { estado = 'pendente'; continue; }
    if (st !== 'sem_horario' && st !== 'confirmado' && estado === 'normal') estado = 'aguardando';
  }
  return estado;
}

function getProximoPasso(decisao: DecisaoOp, janela: '6h' | '12h' | '24h'): string {
  if (decisao === 'visita_liberada') {
    if (janela === '6h')  return 'Aguardando QR Code ou acesso ao link da reunião para confirmação final.';
    if (janela === '12h') return 'Refaça a confirmação na janela de 6h.';
    return 'Refaça a confirmação na janela de 12h.';
  }
  if (decisao === 'cancelar_reagendar')    return 'Cliente não confirmou. Reagende ou cancele a visita.';
  if (decisao === 'substituir_fornecedor') return 'Fornecedor não confirmou. Contate um substituto.';
  return 'Aguardando confirmação das duas partes.';
}

// ─────────────────────────────────────────────────────────────────────────────

interface HorarioVisita {
  id: string;
  candidatura_id: string | null;
  data_hora: string;
  link_reuniao?: string | null;
}

interface Candidatura {
  id: string;
  orcamento_id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  status_acompanhamento: StatusAcomp;
  horario: HorarioVisita | null;
  confirmacoesDb: ConfirmacoesDuplas;
}

interface ArquivoItem {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho: number | null;
  url_arquivo: string;
}

interface Lead {
  id: string;
  codigo: string | null;
  necessidade: string;
  local: string;
  etapa: string;
  dados_contato: { nome?: string; email?: string; telefone?: string } | null;
  created_at: string;
  candidaturas: Candidatura[];
  horarios_sdr: HorarioVisita[];
  valor_estimado_ia_min?: number | null;
  valor_estimado_ia_medio?: number | null;
  valor_estimado_ia_max?: number | null;
  budget_informado?: number | null;
  valor_estimado_ia_confianca?: string | null;
  valor_estimado_ia_justificativa?: string | null;
  perc_mao_obra?: number | null;
  perc_materiais?: number | null;
  perc_gestao?: number | null;
  fontes_ia?: string[] | null;
  rota100_token: string | null;
  tipo_atendimento: string | null;
}

interface LeadSimples {
  id: string;
  codigo: string | null;
  necessidade: string;
  local: string;
  etapa: string;
  dados_contato: Lead['dados_contato'];
  created_at: string;
}

const ETAPA_LABEL: Record<string, string> = {
  em_orcamento:          'Em orçamento',
  propostas_enviadas:    'Propostas enviadas',
  compatibilizacao:      'Compatibilização',
  fechamento_contrato:   'Fechamento',
  pos_venda_feedback:    'Pós-venda',
  ganho:                 'Ganho',
  perdido:               'Perdido',
};

function LeadCardSimples({ lead }: { lead: LeadSimples }) {
  const diasAberto = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
  const etapaLabel = ETAPA_LABEL[lead.etapa] ?? lead.etapa;
  const isGanho = lead.etapa === 'ganho' || !['perdido'].includes(lead.etapa);
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.BD}`,
      borderTop: isGanho ? '4px solid #1B7A4A' : '4px solid #6B7280',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      boxShadow: '0 1px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.NV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.dados_contato?.nome ?? 'Cliente'}
          </span>
          {lead.codigo && <span style={{ fontSize: 11, color: C.CZ }}>#{lead.codigo}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, background: isGanho ? '#E8F5EE' : '#F5F3EF', color: isGanho ? '#1A7A4A' : '#6B6760', borderRadius: 999, padding: '1px 8px', border: isGanho ? '1px solid #A8D5B8' : `1px solid ${C.BD}` }}>
            {etapaLabel}
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.CZ }}>{lead.local}</div>
        <div style={{ fontSize: 11, color: C.CZ, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{lead.necessidade}</div>
      </div>
      <div style={{ fontSize: 11, color: C.CZ, whiteSpace: 'nowrap' }}>{diasAberto}d aberto</div>
    </div>
  );
}

interface LeadViewRow {
  id: string;
  codigo_orcamento: string | null;
  necessidade: string;
  local: string;
  etapa_crm: string;
  dados_contato: Lead['dados_contato'];
  created_at: string;
  budget_informado?: number | null;
  // valor_estimado_ia_* NÃO estão na view atual — vêm de orcamentos_crm_tracking separado
}


const STATUS_BADGE: Record<StatusAcomp, { label: string; bg: string; clr: string; icon: string }> = {
  sem_contato:       { label: 'Sem contato',       bg: C.FD,       clr: C.CZ,      icon: '⏳' },
  em_contato:        { label: 'Em contato',        bg: '#FFF5DC',  clr: '#9A6200', icon: '📞' },
  visita_agendada:   { label: 'Visita agendada',   bg: '#FFF9EC',  clr: '#9A6200', icon: '📅' },
  visita_realizada:  { label: 'Visita realizada',  bg: C.greenBg,  clr: C.green,   icon: '✅' },
  reuniao_agendada:  { label: 'Reunião agendada',  bg: C.blueBg,   clr: '#534AB7', icon: '🎥' },
  reuniao_realizada: { label: 'Reunião realizada', bg: C.greenBg,  clr: C.green,   icon: '✅' },
};



function formatAgendamentoResumo(cand: Candidatura): string | null {
  if (!cand.horario) return null;

  const isReuniao =
    cand.status_acompanhamento === 'reuniao_agendada' ||
    cand.status_acompanhamento === 'reuniao_realizada';

  return `${isReuniao ? '🎥 Reunião' : '📅 Visita'} — ${format(
    new Date(cand.horario.data_hora),
    "dd/MM 'às' HH:mm",
    { locale: ptBR },
  )}`;
}

function BadgeEl({ label, bg, clr, icon }: { label: string; bg: string; clr: string; icon?: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: bg,
      color: clr,
      fontSize: 11,
      fontWeight: 600,
      borderRadius: 6,
      padding: '2px 8px',
      border: `1px solid ${clr}22`,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}

function mkBtn(
  bg: string,
  color: string,
  disabled = false,
  border?: string,
): React.CSSProperties {
  return {
    background: bg,
    color,
    border: border ?? 'none',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: '"DM Sans", sans-serif',
    opacity: disabled ? 0.6 : 1,
    whiteSpace: 'nowrap' as const,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(tipo: string): string {
  if (tipo.startsWith('image/')) return '🖼️';
  if (tipo.startsWith('video/')) return '🎥';
  if (tipo === 'application/pdf') return '📄';
  return '📎';
}

// ─── Arquivos Lead ────────────────────────────────────────────────────────────

function ArquivosLead({ orcamentoId }: { orcamentoId: string }) {
  const { toast } = useToast();
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fetchArquivos = useCallback(async () => {
    const { data } = await supabase
      .from('arquivos_orcamento')
      .select('id, nome_arquivo, tipo_arquivo, tamanho, url_arquivo')
      .eq('orcamento_id', orcamentoId)
      .order('created_at', { ascending: false });
    setArquivos((data as ArquivoItem[]) || []);
  }, [orcamentoId]);

  useEffect(() => { fetchArquivos(); }, [fetchArquivos]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let erros = 0;
    for (const file of Array.from(files)) {
      const fileName = `${orcamentoId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('orcamentos-anexos')
        .upload(fileName, file);
      if (upErr) { erros++; continue; }
      const { data: urlData } = supabase.storage
        .from('orcamentos-anexos')
        .getPublicUrl(fileName);
      await supabase.from('arquivos_orcamento').insert({
        orcamento_id: orcamentoId,
        nome_arquivo: file.name,
        tipo_arquivo: file.type,
        tamanho: file.size,
        url_arquivo: urlData.publicUrl,
      });
    }
    await fetchArquivos();
    setUploading(false);
    if (erros > 0) {
      toast({ title: `${erros} arquivo(s) falharam`, variant: 'destructive' });
    } else {
      toast({ title: 'Arquivos enviados!' });
    }
  };

  return (
    <div style={{ background: '#F7F6F3', border: `1px solid ${C.BD}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: arquivos.length > 0 ? 8 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Arquivos do lead ({arquivos.length})
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={mkBtn(C.NV, C.white, uploading)}
        >
          {uploading ? 'Enviando...' : '+ Adicionar'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {arquivos.length === 0 ? (
        <div style={{ fontSize: 12, color: C.CZ, fontStyle: 'italic', marginTop: 4 }}>
          Nenhum arquivo. Adicione plantas, fotos ou vídeos.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {arquivos.map(a => (
            <a
              key={a.id}
              href={a.url_arquivo}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 6,
                background: C.white, border: `1px solid ${C.BD}`,
                textDecoration: 'none', color: C.NV,
              }}
            >
              <span style={{ fontSize: 14 }}>{fileIcon(a.tipo_arquivo)}</span>
              <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.nome_arquivo}
              </span>
              {a.tamanho && (
                <span style={{ fontSize: 10, color: C.CZ, flexShrink: 0 }}>
                  {formatFileSize(a.tamanho)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agendar Form ─────────────────────────────────────────────────────────────

function AgendarForm({
  cand,
  tipo,
  horariosSdr,
  onSuccess,
  onCancel,
}: {
  cand: Candidatura;
  tipo: 'visita' | 'reuniao';
  horariosSdr: HorarioVisita[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dataVal, setDataVal] = useState('');
  const [hora, setHora] = useState('');
  // Auto-fill link do horário SDR que coincide com o escolhido pelo fornecedor
  const isVisita = tipo === 'visita';
  const initialLink = isVisita ? '' : (
    cand.horario?.link_reuniao
    || horariosSdr.find(h => h.data_hora === cand.horario?.data_hora)?.link_reuniao
    || ''
  );
  const [link, setLink] = useState(initialLink);

  const isValid = dataVal && hora && (isVisita || !!link);

  const handleAgendar = async () => {
    if (!isValid) {
      toast({
        title: isVisita ? 'Informe data e hora' : 'Informe data, hora e link da reunião',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const dataHora = `${dataVal}T${hora}:00`;
      const novoStatus: StatusAcomp = isVisita ? 'visita_agendada' : 'reuniao_agendada';

      // Remove horário anterior desta candidatura antes de inserir o novo (reagendamento limpo)
      await supabase.from('horarios_visita_orcamento').delete().eq('candidatura_id', cand.id);

      await (supabase as any).from('horarios_visita_orcamento').insert({
        orcamento_id:   cand.orcamento_id,
        candidatura_id: cand.id,
        data_hora:      dataHora,
        link_reuniao:   isVisita ? null : link || null,
      });

      // Atualiza status + link na candidatura
      const updatePayload: Record<string, unknown> = { status_acompanhamento: novoStatus };
      if (!isVisita && link) updatePayload.link_reuniao = link;

      const { error } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .update(updatePayload)
        .eq('id', cand.id);

      if (error) {
        toast({ title: 'Erro ao salvar agendamento', variant: 'destructive' });
        return;
      }

      toast({
        title: isVisita ? '📅 Visita agendada!' : '🎥 Reunião agendada!',
        description: format(new Date(dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      });
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '6px 10px',
    border: `1px solid ${C.BD}`,
    borderRadius: 6,
    background: C.white,
    fontFamily: '"DM Sans", sans-serif',
    color: C.text,
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: C.CZ,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
    display: 'block',
  };

  const accentBg  = isVisita ? '#FFF9EC' : C.blueBg;
  const accentBdr = isVisita ? '#E8D08A' : '#C5C2F0';
  const accentClr = isVisita ? '#9A6200' : '#534AB7';

  return (
    <div style={{
      background: accentBg,
      borderRadius: 8,
      padding: '12px 14px',
      border: `1px solid ${accentBdr}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.NV }}>
        {isVisita ? '📅 Agendar Visita Presencial' : '🎥 Agendar Reunião Online'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Data</label>
          <input
            type="date"
            style={inputStyle}
            value={dataVal}
            onChange={e => setDataVal(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Hora</label>
          <input
            type="time"
            style={inputStyle}
            value={hora}
            onChange={e => setHora(e.target.value)}
          />
        </div>
      </div>

      {!isVisita && (
        <div>
          <label style={labelStyle}>Link da reunião *</label>
          <input
            type="url"
            style={inputStyle}
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://meet.google.com/..."
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAgendar}
          disabled={saving || !isValid}
          style={mkBtn(accentClr, C.white, saving || !isValid)}
        >
          {saving ? 'Salvando...' : 'Confirmar agendamento'}
        </button>
        <button
          onClick={onCancel}
          style={mkBtn('transparent', C.CZ, false, `1px solid ${C.BD}`)}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Candidatura Row ──────────────────────────────────────────────────────────

function CandidaturaRow({
  cand,
  tipoAtendimento,
  horariosSdr,
  onUpdate,
  onLeaveQueue,
}: {
  cand: Candidatura;
  tipoAtendimento: string | null;
  horariosSdr: HorarioVisita[];
  onUpdate: () => void;
  onLeaveQueue: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [agendando, setAgendando] = useState<'visita' | 'reuniao' | null>(null);
  // Estado inicializado com dados do banco — atualizado otimisticamente a cada clique
  const [confirmacoes, setConfirmacoes] = useState<ConfirmacoesDuplas>(cand.confirmacoesDb);
  // Sincroniza quando o backend traz dados mais recentes (auto-refresh ou outro SDR)
  useEffect(() => {
    setConfirmacoes(cand.confirmacoesDb);
  }, [cand.confirmacoesDb]);
  const marcarConf = async (campo: keyof ConfirmacoesDuplas, valor: ConfirmacaoStatus) => {
    setConfirmacoes(prev => ({ ...prev, [campo]: valor })); // atualização otimista
    const sep    = campo.lastIndexOf('_');
    const parte  = campo.slice(0, sep) as 'cliente' | 'fornecedor';
    const etapa  = campo.slice(sep + 1) as '24h' | '12h' | '6h';
    const status = valor === true ? 'confirmou' : valor === false ? 'nao_confirmou' : 'pendente';
    const { error } = await (supabase as any).from('sdr_confirmacoes_visita').upsert({
      orcamento_id:   cand.orcamento_id,
      candidatura_id: cand.id,
      etapa,
      parte,
      status,
      confirmado_em: valor !== null ? new Date().toISOString() : null,
      usuario_id:    user?.id ?? null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'orcamento_id,candidatura_id,etapa,parte' });
    if (error) {
      toast({ title: 'Erro ao salvar confirmação', variant: 'destructive' });
      setConfirmacoes(prev => ({ ...prev, [campo]: cand.confirmacoesDb[campo] })); // reverte
    }
  };

  // Guarda contra abertura do form errado mesmo se chamado por código
  const handleAgendar = (tipo: 'visita' | 'reuniao') => {
    if (!tipoAtendimento) return;
    if (tipoAtendimento === 'presencial' && tipo === 'reuniao') return;
    if (tipoAtendimento === 'online' && tipo === 'visita') return;
    setAgendando(tipo);
  };

  const statusInfo = STATUS_BADGE[cand.status_acompanhamento] ?? STATUS_BADGE.sem_contato;
  const temHorarioEscolhido = !!cand.horario;
  const statusOp = getStatusOperacional(cand);
  const statusOpInfo = STATUS_OP_INFO[statusOp];
  const janela: '24h' | '12h' | '6h' | null =
    statusOp === 'confirmacao_final_6h' ? '6h' :
    statusOp === 'a_confirmar_12h'      ? '12h' :
    statusOp === 'a_confirmar_24h'      ? '24h' : null;
  const decisao     = getDecisaoOp(confirmacoes, statusOp);
  const decisaoInfo = DECISAO_INFO[decisao];
  const etapaPendente = getEtapaPendente(cand);
  const isCritico   = statusOp === 'reagendar';
  const isPendente  = etapaPendente !== null;
  const isAguardando = janela !== null && !isCritico && !isPendente;

  const avancarStatus = async (novoStatus: StatusAcomp) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('candidaturas_fornecedores')
      .update({ status_acompanhamento: novoStatus })
      .eq('id', cand.id);
    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: `Status: ${STATUS_BADGE[novoStatus]?.label}` });
      onUpdate();
    }
    setUpdatingStatus(false);
  };

  const marcarRealizado = async (novoStatus: 'visita_realizada' | 'reuniao_realizada') => {
    setUpdatingStatus(true);
    try {
      // 1. Atualiza status da candidatura
      const { error } = await supabase
        .from('candidaturas_fornecedores')
        .update({ status_acompanhamento: novoStatus })
        .eq('id', cand.id);

      if (error) {
        toast({ title: 'Erro ao confirmar atendimento', variant: 'destructive' });
        return;
      }

      // 2. Encaminha lead para o CRM (etapa propostas_enviadas)
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        toast({ title: 'Sessão inválida para mover lead ao CRM', variant: 'destructive' });
        return;
      }
      if (authData?.user) {
        const { error: moverError } = await supabase.rpc('mover_orcamento_etapa', {
          p_orcamento_id: cand.orcamento_id,
          p_nova_etapa: 'em_orcamento',
          p_usuario_id: authData.user.id,
          p_observacao: novoStatus === 'visita_realizada'
            ? 'Visita presencial realizada — lead liberado para o consultor'
            : 'Reunião online realizada — lead liberado para o consultor',
        });
        if (moverError) {
          toast({ title: 'Erro ao mover lead para o CRM', variant: 'destructive' });
          return;
        }
      }

      toast({
        title: novoStatus === 'visita_realizada' ? '✅ Visita confirmada!' : '✅ Reunião confirmada!',
        description: 'Lead liberado para o consultor.',
      });
      onLeaveQueue();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderConfRow = (label: string, campo: keyof ConfirmacoesDuplas) => {
    const val = confirmacoes[campo];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.CZ, minWidth: 80 }}>{label}</span>
        <button
          onClick={() => marcarConf(campo, val === true ? null : true)}
          style={{ ...mkBtn(val === true ? C.green : 'transparent', val === true ? C.white : C.green, false, `1px solid ${C.green}`), fontSize: 11, padding: '3px 9px' }}
        >
          ✓ Confirmou
        </button>
        <button
          onClick={() => marcarConf(campo, val === false ? null : false)}
          style={{ ...mkBtn(val === false ? '#991B1B' : 'transparent', val === false ? C.white : '#991B1B', false, `1px solid #991B1B`), fontSize: 11, padding: '3px 9px' }}
        >
          ✗ Não
        </button>
        {val === true  && <span style={{ fontSize: 10, color: C.green,   fontWeight: 700 }}>✓</span>}
        {val === false && <span style={{ fontSize: 10, color: '#991B1B', fontWeight: 700 }}>✗</span>}
      </div>
    );
  };

  if (agendando) {
    return (
      <AgendarForm
        cand={cand}
        tipo={agendando}
        horariosSdr={horariosSdr}
        onSuccess={() => { setAgendando(null); onUpdate(); }}
        onCancel={() => setAgendando(null)}
      />
    );
  }

  const st = cand.status_acompanhamento;
  const isReuniao = st === 'reuniao_agendada' || st === 'reuniao_realizada';
  const mostrarAgendamento = st === 'visita_agendada' || st === 'reuniao_agendada';

  const cardTopColor = isCritico ? '#DC2626' : isPendente ? '#F59E0B' : isAguardando ? '#818CF8' : C.BD;
  const cardBg = isCritico ? '#FFF5F5' : isPendente ? '#FFFBEB' : isAguardando ? '#F8F9FF' : C.white;

  return (
    <div style={{
      background: cardBg,
      borderRadius: 10,
      padding: '10px 14px',
      border: `1px solid ${C.BD}`,
      borderTop: `3px solid ${cardTopColor}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    }}>
      {/* Cabeçalho: empresa + status + status operacional */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.NV }}>
          {cand.empresa || cand.nome}
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <BadgeEl {...statusInfo} />
          {statusOp !== 'sem_horario' && <BadgeEl label={statusOpInfo.label} bg={statusOpInfo.bg} clr={statusOpInfo.clr} />}
          {isCritico  && <BadgeEl label="⚠ Horário vencido"       bg="#FEE2E2" clr="#991B1B" />}
          {isPendente && <BadgeEl label={`⚠ Pendente ${etapaPendente}`} bg="#FEF3C7" clr="#92400E" />}
        </div>
      </div>

      {/* Contato */}
      {(cand.email || cand.telefone) && (
        <div style={{ fontSize: 12, color: C.CZ }}>
          {[cand.email, cand.telefone].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Bloco de agendamento */}
      {mostrarAgendamento && (
        <div style={{
          background: isReuniao ? C.blueBg : '#FFF9EC',
          border: `1px solid ${isReuniao ? '#C5C2F0' : '#E8D08A'}`,
          borderRadius: 6,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isReuniao ? '#534AB7' : '#9A6200' }}>
            {isReuniao ? '🎥 Reunião online' : '📅 Visita presencial'}
          </span>
          {cand.horario ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.NV }}>
              {format(new Date(cand.horario.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: C.CZ, fontStyle: 'italic' }}>Data não definida</span>
          )}
        </div>
      )}

      {/* Horário escolhido pelo fornecedor (quando status ainda não é agendada/realizada) */}
      {temHorarioEscolhido && !mostrarAgendamento && (
        <div style={{
          background: '#F0F7FF', border: '1px solid #BDD5F5',
          borderRadius: 6, padding: '8px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2B5EAA' }}>Horário escolhido</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.NV }}>
            {format(new Date(cand.horario!.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Opções SDR como contexto — destaca qual foi escolhida */}
      {horariosSdr.length > 0 && (
        <div style={{ fontSize: 11, color: C.CZ, lineHeight: 1.6, paddingLeft: 2 }}>
          <span style={{ fontWeight: 700 }}>SDR propôs: </span>
          {horariosSdr.map((h, i) => {
            const escolhido = cand.horario?.data_hora === h.data_hora;
            return (
              <span key={h.id} style={{ fontWeight: escolhido ? 700 : 400, color: escolhido ? C.NV : C.CZ }}>
                {i > 0 ? ' · ' : ''}
                {format(new Date(h.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
                {escolhido ? ' ✓' : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>

        {/* sem_contato → em contato (só sem horário escolhido) */}
        {st === 'sem_contato' && !temHorarioEscolhido && (
          <button
            onClick={() => avancarStatus('em_contato')}
            disabled={updatingStatus}
            style={mkBtn(C.NV, C.white, updatingStatus)}
          >
            → Em Contato
          </button>
        )}

        {/* sem_contato ou em_contato → agendar (bloqueado pelo tipo definido no lead) */}
        {(st === 'sem_contato' || st === 'em_contato') && !temHorarioEscolhido && (
          <>
            {!tipoAtendimento && (
              <span style={{ fontSize: 11, color: '#9A6200', fontStyle: 'italic', width: '100%' }}>
                ⚠ Defina o tipo de atendimento no lead para agendar
              </span>
            )}
            <button
              onClick={() => handleAgendar('visita')}
              disabled={updatingStatus || tipoAtendimento !== 'presencial'}
              title={
                tipoAtendimento === 'online'
                  ? 'Este lead está definido como reunião online'
                  : !tipoAtendimento
                  ? 'Defina o tipo de atendimento no lead'
                  : undefined
              }
              style={mkBtn('#9A6200', C.white, updatingStatus || tipoAtendimento !== 'presencial')}
            >
              📅 Agendar Visita
            </button>
            <button
              onClick={() => handleAgendar('reuniao')}
              disabled={updatingStatus || tipoAtendimento !== 'online'}
              title={
                tipoAtendimento === 'presencial'
                  ? 'Este lead está definido como visita presencial'
                  : !tipoAtendimento
                  ? 'Defina o tipo de atendimento no lead'
                  : undefined
              }
              style={mkBtn('#534AB7', C.white, updatingStatus || tipoAtendimento !== 'online')}
            >
              🎥 Agendar Reunião
            </button>
          </>
        )}

        {/* Confirmação dupla operacional (24h / 12h / 6h) — todos os status com horário */}
        {temHorarioEscolhido && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Cabeçalho: janela ativa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.NV, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {janela ? `Confirmação ${janela}` : 'Confirmação dupla'}
              </span>
              {janela && (
                <span style={{ fontSize: 10, fontWeight: 700, background: statusOpInfo.bg, color: statusOpInfo.clr, border: `1px solid ${statusOpInfo.clr}22`, borderRadius: 4, padding: '1px 6px' }}>
                  {statusOpInfo.label}
                </span>
              )}
            </div>

            {/* Horário ainda a >24h — sem janela ativa */}
            {!janela && statusOp === 'sem_horario' && (
              <span style={{ fontSize: 11, color: C.CZ, fontStyle: 'italic' }}>
                Confirmação disponível a partir de 24h antes da visita.
              </span>
            )}

            {/* Horário venceu sem realização */}
            {statusOp === 'reagendar' && (
              <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>
                ⚠ Horário venceu sem realização. Reagende abaixo.
              </span>
            )}

            {/* Painel de confirmação dupla — apenas com janela ativa e NÃO em execução */}
            {janela && decisao !== 'visita_liberada' && (
              <div style={{ background: '#F7F6F3', border: `1px solid ${C.BD}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {renderConfRow('Cliente',    `cliente_${janela}`    as keyof ConfirmacoesDuplas)}
                {renderConfRow('Fornecedor', `fornecedor_${janela}` as keyof ConfirmacoesDuplas)}

                {/* Decisão + próximo passo */}
                <div style={{ background: decisaoInfo.bg, color: decisaoInfo.clr, border: `1px solid ${decisaoInfo.clr}22`, borderRadius: 6, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{decisaoInfo.label}</span>
                  <span style={{ fontSize: 11 }}>{getProximoPasso(decisao, janela)}</span>
                </div>
              </div>
            )}

            {/* EXECUÇÃO — somente após ambos confirmarem na janela de 6h */}
            {decisao === 'visita_liberada' && janela === '6h' && (
              <div style={{ background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✅ Visita liberada — aguardando confirmação final</span>
                <span style={{ fontSize: 11, color: C.CZ, fontStyle: 'italic' }}>
                  {tipoAtendimento === 'online'
                    ? '🔗 Confirmação automática ao acessar o link da reunião.'
                    : '📷 Confirmação automática ao escanear o QR Code no local.'}
                </span>
                <button
                  onClick={() => marcarRealizado(tipoAtendimento === 'online' ? 'reuniao_realizada' : 'visita_realizada')}
                  disabled={updatingStatus}
                  title="Usar somente se QR Code / link da reunião não funcionaram"
                  style={{ ...mkBtn('transparent', C.green, updatingStatus, `1px solid ${C.green}`), fontSize: 11, alignSelf: 'flex-start' }}
                >
                  ✅ Confirmar manualmente (fallback)
                </button>
              </div>
            )}

            {/* Reagendar sempre disponível enquanto não realizado */}
            {statusOp !== 'confirmado' && (
              <button
                onClick={() => setAgendando(tipoAtendimento === 'online' ? 'reuniao' : 'visita')}
                disabled={updatingStatus}
                style={{ ...mkBtn('transparent', C.CZ, updatingStatus, `1px solid ${C.BD}`), fontSize: 11, alignSelf: 'flex-start' }}
              >
                🔄 Reagendar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reagendamento ────────────────────────────────────────────────────────────

// PENDENTE DE MIGRATION: orcamentos_crm_historico exige etapa_nova (enum) + movido_por_nome (NOT NULL)
// — não é segura para eventos livres de SDR. Solução futura: tabela sdr_eventos ou novo tipo na historico.
// PENDENTE: Criar/atualizar evento no Google Calendar do SDR após reagendamento.
function notifyReschedule(orcamentoId: string, horarios: string[]) {
  // TODO: Notificar cliente, fornecedores envolvidos e SDR responsável (email / WhatsApp)
  // TODO: Criar/atualizar evento no Google Calendar do SDR
  console.info('[SDR] Reagendamento registrado:', { orcamentoId, horarios });
}

// ─── Edit form inline ─────────────────────────────────────────────────────────

function EditLeadForm({
  lead,
  onSave,
  onCancel,
}: {
  lead: Lead;
  onSave: (remarcar: boolean) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: lead.dados_contato?.nome ?? '',
    email: lead.dados_contato?.email ?? '',
    telefone: lead.dados_contato?.telefone ?? '',
    local: lead.local,
    necessidade: lead.necessidade,
  });
  const [tipoAtendimento, setTipoAtendimento] = useState<'presencial' | 'online' | ''>(
    (lead.tipo_atendimento as 'presencial' | 'online' | '') ?? ''
  );
  const [horarios, setHorarios] = useState<{ data: string; hora: string; link: string }[]>(() => {
    const base: { data: string; hora: string; link: string }[] = [
      { data: '', hora: '', link: '' }, { data: '', hora: '', link: '' }, { data: '', hora: '', link: '' },
    ];
    lead.horarios_sdr.slice(0, 3).forEach((h, i) => {
      const d = new Date(h.data_hora);
      base[i] = {
        data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        link: h.link_reuniao ?? '',
      };
    });
    return base;
  });

  // Captura horários originais no mount para detectar remarcação
  const originalHorariosRef = React.useRef(
    lead.horarios_sdr.map(h => {
      const d = new Date(h.data_hora);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }).sort()
  );

  const handleSave = async () => {
    const horariosValidos = horarios.filter(h => h.data && h.hora);
    if (horariosValidos.length === 0) {
      toast({ title: 'Mínimo 1 horário obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('orcamentos')
        .update({
          local: form.local,
          necessidade: form.necessidade,
          dados_contato: {
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
          },
          tipo_atendimento_tecnico: tipoAtendimento || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) {
        toast({ title: 'Erro ao salvar', variant: 'destructive' });
        return;
      }

      // Substitui apenas horários do SDR (candidatura_id IS NULL) — não toca em horários de candidaturas
      await (supabase as any)
        .from('horarios_visita_orcamento')
        .delete()
        .eq('orcamento_id', lead.id)
        .is('candidatura_id', null);

      for (const h of horariosValidos) {
        await (supabase as any)
          .from('horarios_visita_orcamento')
          .insert({ orcamento_id: lead.id, data_hora: `${h.data}T${h.hora}:00`, link_reuniao: h.link || null });
      }

      // Detecta remarcação: compara horários originais vs novos (ordenados, normalizados)
      const normNovos = horariosValidos.map(h => `${h.data}T${h.hora}`).sort();
      const isRemarcar =
        originalHorariosRef.current.length > 0 &&
        JSON.stringify(originalHorariosRef.current) !== JSON.stringify(normNovos);

      if (isRemarcar) {
        notifyReschedule(lead.id, normNovos);
        toast({ title: '🔄 Atendimento reagendado', description: 'Horários atualizados. Partes serão notificadas.' });
      } else {
        toast({ title: 'Lead atualizado' });
      }
      onSave(isRemarcar);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '7px 10px',
    border: `1px solid ${C.BD}`,
    borderRadius: 6,
    background: C.white,
    fontFamily: '"DM Sans", sans-serif',
    color: C.text,
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: C.CZ,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.BD}`, background: '#F8F6F2', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.NV }}>Editar Lead</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Nome do cliente</label>
          <input
            style={inputStyle}
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome"
          />
        </div>
        <div>
          <label style={labelStyle}>Telefone</label>
          <input
            style={inputStyle}
            value={form.telefone}
            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input
            style={inputStyle}
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@exemplo.com"
          />
        </div>
        <div>
          <label style={labelStyle}>Localização</label>
          <input
            style={inputStyle}
            value={form.local}
            onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
            placeholder="Cidade, Bairro"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descrição / Necessidade</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={form.necessidade}
          onChange={e => setForm(f => ({ ...f, necessidade: e.target.value }))}
          placeholder="Descreva o que o cliente precisa..."
        />
      </div>

      {/* Tipo de atendimento */}
      <div style={{ borderTop: `1px solid ${C.BD}`, paddingTop: 12 }}>
        <label style={labelStyle}>Tipo de atendimento</label>
        <div style={{ display: 'flex', gap: 18, marginTop: 6 }}>
          {([['presencial', '📅 Visita presencial'], ['online', '🎥 Reunião online']] as const).map(([val, lbl]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="editTipoAtend"
                value={val}
                checked={tipoAtendimento === val}
                onChange={() => setTipoAtendimento(val)}
                style={{ accentColor: C.LJ }}
              />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Horários SDR */}
      <div>
        <label style={{ ...labelStyle, marginBottom: 6, color: C.NV }}>Horários acordados *</label>
        {horarios.map((h, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8,
            padding: '10px 12px', borderRadius: 8,
            background: h.data && h.hora ? '#F0F7FF' : C.FD,
            border: `1px solid ${h.data && h.hora ? '#BDD5F5' : C.BD}`,
          }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 2, color: i === 0 ? C.NV : C.CZ }}>
                {i === 0 ? 'Data 1 (obrigatória)' : `Data ${i + 1}`}
              </label>
              <input
                style={inputStyle}
                type="date"
                value={h.data}
                onChange={e => setHorarios(prev => prev.map((x, j) => j === i ? { ...x, data: e.target.value } : x))}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 2, color: i === 0 ? C.NV : C.CZ }}>
                {i === 0 ? 'Hora 1 (obrigatória)' : `Hora ${i + 1}`}
              </label>
              <input
                style={inputStyle}
                type="time"
                value={h.hora}
                onChange={e => setHorarios(prev => prev.map((x, j) => j === i ? { ...x, hora: e.target.value } : x))}
              />
            </div>
            {tipoAtendimento === 'online' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, marginBottom: 2, color: C.CZ }}>
                  Link Meet {i === 0 ? '(obrigatório)' : '(opcional)'}
                </label>
                <input
                  style={inputStyle}
                  type="url"
                  value={h.link}
                  onChange={e => setHorarios(prev => prev.map((x, j) => j === i ? { ...x, link: e.target.value } : x))}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: C.LJ,
            color: C.white,
            border: 'none',
            borderRadius: 7,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: '"Syne", sans-serif',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: C.CZ,
            border: `1px solid ${C.BD}`,
            borderRadius: 7,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── EstimativaBlock ─────────────────────────────────────────────────────────

const CONFIANCA_LABEL: Record<string, { label: string; bg: string; clr: string; bdr: string }> = {
  alta:  { label: '✓ Alta',  bg: '#E8F5EE', clr: '#1A7A4A', bdr: '#A8D5B8' },
  media: { label: '~ Média', bg: '#FFF5DC', clr: '#9A6200', bdr: '#E8C97A' },
  baixa: { label: '↓ Baixa', bg: '#F5F3EF', clr: '#6B6760', bdr: '#D0CEC8' },
};

function padraoEstimado(medio: number | null): string {
  if (medio == null) return '—';
  if (medio < 50000)  return 'Popular';
  if (medio < 120000) return 'Médio padrão';
  if (medio < 300000) return 'Alto padrão';
  return 'Premium / Luxo';
}

function EstimativaBlock({
  lead,
  gerando,
  onGerar,
  userRole,
}: {
  lead: Lead;
  gerando: boolean;
  onGerar: () => void;
  userRole?: string;
}) {
  const [analiseAberta, setAnaliseAberta] = useState(false);
  const vt = calcularValorTecnico(lead);
  const temEstimativa = vt.medio != null;
  const confInfo = vt.confianca ? CONFIANCA_LABEL[vt.confianca] : null;
  const isSdr = userRole === 'sdr';

  const wrapStyle: React.CSSProperties = {
    background: '#F7F6F3',
    border: `1px solid ${C.BD}`,
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };
  const labelS: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: C.CZ,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  if (gerando) {
    return (
      <div style={wrapStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={labelS}>Estimativa técnica</span>
          <span style={{ fontSize: 11, color: '#534AB7', fontWeight: 600 }}>Gerando via IA… (≈15s)</span>
        </div>
        <div style={{ width: '100%', height: 4, background: '#E0DDD7', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: '#534AB7', borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (!temEstimativa) {
    return (
      <div style={{ ...wrapStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={labelS}>Estimativa técnica</div>
          <div style={{ fontSize: 12, color: C.CZ, marginTop: 2 }}>Nenhuma estimativa gerada ainda.</div>
        </div>
        <button
          onClick={() => { console.log('[SDR] botão Gerar estimativa clicado'); onGerar(); }}
          style={mkBtn('#534AB7', C.white)}
        >
          Gerar estimativa
        </button>
      </div>
    );
  }

  // Alinhamento — calculado uma vez, usado no card compacto e na leitura comercial
  const diferenca = vt.budgetCliente != null && vt.medio != null
    ? (vt.medio - vt.budgetCliente) / vt.medio
    : null;
  const ali = diferenca == null ? null
    : diferenca <= 0.20
      ? { label: 'ALINHADO',          bg: '#E8F5EE', clr: '#1A7A4A', bdr: '#A8D5B8', texto: 'Budget compatível com a estimativa técnica.' }
    : diferenca <= 0.50
      ? { label: 'SUBESTIMADO',       bg: '#FFF5DC', clr: '#9A6200', bdr: '#E8C97A', texto: 'Cliente informou valor abaixo da estimativa. Requer qualificação.' }
      : { label: 'FORA DA REALIDADE', bg: '#FEE8E8', clr: '#9A1E1E', bdr: '#F2A8A8', texto: 'Budget muito abaixo da estimativa. Baixa aderência financeira.' };

  const temConteudoAnalise = Boolean(
    lead.valor_estimado_ia_justificativa ||
    lead.perc_mao_obra != null || lead.perc_materiais != null || lead.perc_gestao != null ||
    (lead.fontes_ia && lead.fontes_ia.length > 0) ||
    ali != null || vt.medio != null
  );

  return (
    <div style={wrapStyle}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelS}>Estimativa técnica</span>
          {confInfo && (
            <span style={{ fontSize: 10, fontWeight: 700, background: confInfo.bg, color: confInfo.clr, border: `1px solid ${confInfo.bdr}`, borderRadius: 999, padding: '1px 8px' }}>
              Confiança {confInfo.label}
            </span>
          )}
        </div>
        <button onClick={onGerar} style={{ ...mkBtn('transparent', C.CZ, false, `1px solid ${C.BD}`), fontSize: 11 }}>
          Recalcular
        </button>
      </div>

      {/* ── Faixa mín / médio / máx ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Mínimo', val: vt.min   },
          { label: 'Médio',  val: vt.medio },
          { label: 'Máximo', val: vt.max   },
        ].map(({ label, val }) => (
          <div key={label} style={{ flex: '1 1 80px', background: C.white, border: `1px solid ${C.BD}`, borderRadius: 7, padding: '7px 10px' }}>
            <div style={{ fontSize: 10, color: C.CZ, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: C.NV, fontWeight: 700 }}>{formatarBRL(val)}</div>
          </div>
        ))}
      </div>

      {/* ── Budget + compatibilidade ──────────────────────────────────────── */}
      {vt.budgetCliente != null && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: C.white, border: `1px solid ${C.BD}`, borderRadius: 7, padding: '7px 10px' }}>
              <div style={{ fontSize: 10, color: C.CZ, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Budget cliente</div>
              <div style={{ fontSize: 13, color: C.NV, fontWeight: 700 }}>{formatarBRL(vt.budgetCliente)}</div>
            </div>
            {vt.medio != null && (
              <div style={{ flex: 1, background: C.white, border: `1px solid ${C.BD}`, borderRadius: 7, padding: '7px 10px' }}>
                <div style={{ fontSize: 10, color: C.CZ, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Estimativa IA média</div>
                <div style={{ fontSize: 13, color: C.NV, fontWeight: 700 }}>{formatarBRL(vt.medio)}</div>
              </div>
            )}
          </div>
          {ali && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: ali.bg, border: `1px solid ${ali.bdr}`, borderRadius: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: ali.clr, border: `1px solid ${ali.bdr}`, borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>
                {ali.label}
              </span>
              <span style={{ fontSize: 11, color: ali.clr }}>{ali.texto}</span>
            </div>
          )}
        </>
      )}

      {/* ── Botão "Ver análise técnica" — apenas para não-SDR ─────────────── */}
      {!isSdr && temConteudoAnalise && (
        <button
          onClick={() => setAnaliseAberta(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: analiseAberta ? '#EEF0FF' : 'none',
            border: `1px solid ${analiseAberta ? '#C0BCFF' : C.BD}`,
            borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
            color: analiseAberta ? '#534AB7' : C.CZ,
            fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          <span>Ver análise técnica</span>
          <span style={{
            fontSize: 11,
            display: 'inline-block',
            transform: analiseAberta ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▾</span>
        </button>
      )}

      {/* ── Painel expansível — conteúdo analítico ────────────────────────── */}
      {!isSdr && analiseAberta && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${C.BD}`, paddingTop: 8 }}>

          {/* 1. Justificativa IA */}
          {lead.valor_estimado_ia_justificativa && (
            <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Justificativa IA
              </div>
              <div style={{ fontSize: 12, color: C.NV2, lineHeight: 1.6 }}>
                {lead.valor_estimado_ia_justificativa}
              </div>
            </div>
          )}

          {/* 2. Composição estimada */}
          {(lead.perc_mao_obra != null || lead.perc_materiais != null || lead.perc_gestao != null) && (
            <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Composição estimada
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Mão de obra', val: lead.perc_mao_obra,  color: '#534AB7' },
                  { label: 'Materiais',   val: lead.perc_materiais, color: '#1A7A4A' },
                  { label: 'Gestão/BDI', val: lead.perc_gestao,    color: '#C45B10' },
                ].filter(i => i.val != null).map(({ label, val, color }) => (
                  <div key={label} style={{ flex: '1 1 70px', background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: C.CZ, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Pesquisa de mercado */}
          {lead.fontes_ia && lead.fontes_ia.length > 0 && (
            <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Pesquisa de mercado
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lead.fontes_ia.map((fonte, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 600, color: '#534AB7',
                    background: '#EEF0FF', border: '1px solid #C0BCFF',
                    borderRadius: 999, padding: '2px 9px',
                  }}>
                    {fonte}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Leitura comercial */}
          {(ali != null || vt.medio != null) && (
            <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Leitura comercial
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ali && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: C.CZ }}>Compatibilidade budget</span>
                    <span style={{ fontWeight: 700, color: ali.clr }}>{ali.label}</span>
                  </div>
                )}
                {diferenca != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: C.CZ }}>Risco comercial</span>
                    <span style={{ fontWeight: 700, color: diferenca <= 0.20 ? '#1A7A4A' : diferenca <= 0.50 ? '#9A6200' : '#9A1E1E' }}>
                      {diferenca <= 0.20 ? 'Baixo' : diferenca <= 0.50 ? 'Médio' : 'Alto'}
                      {vt.gapPercentual != null && (
                        <span style={{ fontWeight: 400, color: C.CZ, marginLeft: 6, fontSize: 11 }}>({formatarGap(vt.gapPercentual)})</span>
                      )}
                    </span>
                  </div>
                )}
                {vt.medio != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: C.CZ }}>Padrão estimado</span>
                    <span style={{ fontWeight: 600, color: C.NV }}>{padraoEstimado(vt.medio)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Base de compatibilização */}
          <div style={{ background: '#EEF0FF', border: '1px solid #C0BCFF', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Base de compatibilização
            </div>
            <div style={{ fontSize: 11, color: '#3B35B7', lineHeight: 1.6 }}>
              Esta estimativa já serve como base inicial para compatibilização técnica futura. Os valores são referenciais e devem ser refinados durante a visita técnica.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  expanded,
  editing,
  gerandoEstimativa,
  onToggle,
  onEdit,
  onCancelEdit,
  onGerarEstimativa,
  onUpdate,
  onLeaveQueue,
  userRole,
}: {
  lead: Lead;
  expanded: boolean;
  editing: boolean;
  gerandoEstimativa: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onGerarEstimativa: () => void;
  onUpdate: () => void;
  onLeaveQueue: () => void;
  userRole?: string;
}) {
  const { toast } = useToast();
  const [marcandoEmContato, setMarcandoEmContato] = useState(false);
  const [wasRescheduled, setWasRescheduled] = useState(false);
  // PENDENTE DE MIGRATION: badge "Reagendado" persiste apenas na sessão atual.
  // Para persistência real: criar coluna `reagendado_em` em horarios_visita_orcamento
  // ou tabela sdr_eventos — orcamentos_crm_historico não é segura (etapa_nova enum obrigatório).
  const rota100Url = lead.rota100_token ? `${window.location.origin}/rota100/${lead.rota100_token}` : null;

  const marcarEmContato = async () => {
    setMarcandoEmContato(true);
    try {
      const { error } = await (supabase as any).rpc('mover_orcamento_etapa', {
        p_orcamento_id: lead.id,
        p_nova_etapa: 'contato_agendamento',
        p_usuario_id: null,
      });
      if (error) throw error;
      toast({ title: '📞 Lead marcado em contato' });
      onUpdate();
    } catch {
      toast({ title: 'Erro ao atualizar lead', variant: 'destructive' });
    } finally {
      setMarcandoEmContato(false);
    }
  };

  const leadStatus = getLeadStatus(lead);
  const leadStatusInfo = LEAD_STATUS_INFO[leadStatus];
  const leadAlerta = getLeadAlerta(lead);
  const diasAberto = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
  const valorTecnico = calcularValorTecnico(lead);
  const mostrarValorTecnico = valorTecnico.medio != null;
  const faixaValorTecnico = mostrarValorTecnico
    ? `${formatarBRL(valorTecnico.min)} – ${formatarBRL(valorTecnico.max)} (médio: ${formatarBRL(valorTecnico.medio)})`
    : null;

  const agendamentoMaisRecente = lead.candidaturas
    .filter(c =>
      (c.status_acompanhamento === 'visita_agendada' || c.status_acompanhamento === 'reuniao_agendada') &&
      !!c.horario
    )
    .sort((a, b) => new Date(b.horario!.data_hora).getTime() - new Date(a.horario!.data_hora).getTime())[0] ?? null;
  const agendamentoResumo = agendamentoMaisRecente ? formatAgendamentoResumo(agendamentoMaisRecente) : null;

  const accentTopColor =
    leadAlerta === 'critico'    ? '#DC2626' :
    leadAlerta === 'pendente'   ? '#F59E0B' :
    leadAlerta === 'aguardando' ? '#818CF8' : C.NV;

  return (
    <div style={{
      background: C.white,
      borderRadius: 14,
      border: `1px solid ${C.BD}`,
      borderTop: `4px solid ${accentTopColor}`,
      boxShadow: '0 1px 6px rgba(0,0,0,.07)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.NV, fontFamily: '"Syne", sans-serif' }}>
                {lead.dados_contato?.nome || lead.necessidade}
              </span>
              {lead.codigo && (
                <span style={{ fontSize: 11, color: C.CZ, background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 4, padding: '1px 6px' }}>
                  #{lead.codigo}
                </span>
              )}
              <BadgeEl {...leadStatusInfo} />
              {leadAlerta === 'critico'  && <BadgeEl label="⚠ Horário vencido"  bg="#FEE2E2" clr="#991B1B" />}
              {leadAlerta === 'pendente' && <BadgeEl label="⚠ Conf. pendente"   bg="#FEF3C7" clr="#92400E" />}
              {wasRescheduled && (
                <BadgeEl label="Reagendado" bg="#E8F5EE" clr="#1A7A4A" icon="🔄" />
              )}
            </div>
            <div style={{ fontSize: 12, color: C.CZ }}>
              Local: {lead.local} | {diasAberto}d aberto | {lead.candidaturas.length} candidatura{lead.candidaturas.length !== 1 ? 's' : ''}
            </div>
            {agendamentoResumo && (
              <div style={{ fontSize: 12, color: C.NV, fontWeight: 600, marginTop: 6 }}>
                {agendamentoResumo}
              </div>
            )}
            {mostrarValorTecnico ? (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: C.NV, fontWeight: 600 }}>
                  {faixaValorTecnico}
                </div>
                {valorTecnico.confianca && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: valorTecnico.confianca === 'alta' ? C.green : valorTecnico.confianca === 'media' ? '#9A6200' : C.CZ,
                    background: valorTecnico.confianca === 'alta' ? C.greenBg : valorTecnico.confianca === 'media' ? '#FFF5DC' : C.FD,
                    border: `1px solid ${valorTecnico.confianca === 'alta' ? '#A8D5B8' : valorTecnico.confianca === 'media' ? '#E8C97A' : C.BD}`,
                    borderRadius: 999,
                    padding: '1px 7px',
                    textTransform: 'uppercase',
                  }}>
                    {valorTecnico.confianca === 'alta' ? '✓ Alta' : valorTecnico.confianca === 'media' ? '~ Média' : '↓ Baixa'}
                  </span>
                )}
                {valorTecnico.budgetAnomalo && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#9A6200',
                    background: '#FFF0E8',
                    border: '1px solid #F2BE9A',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}>
                    ⚠ Budget {valorTecnico.gapPercentual != null ? formatarGap(valorTecnico.gapPercentual) : 'atípico'}
                  </span>
                )}
              </div>
            ) : gerandoEstimativa ? (
              <div style={{ marginTop: 6, fontSize: 11, color: C.CZ, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                Gerando estimativa...
              </div>
            ) : null}
          </div>
          <span style={{ color: C.CZ, fontSize: 14, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
        </button>

        {/* Botão editar */}
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Editar lead"
          style={{
            background: 'transparent',
            border: 'none',
            borderLeft: `1px solid ${C.BD}`,
            padding: '0 14px',
            cursor: 'pointer',
            color: C.CZ,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ✏️
        </button>
      </div>

      {/* Barra de ações: Rota100 + Marcar em contato */}
      {(rota100Url || lead.etapa === 'orcamento_postado') && (
        <div style={{
          display: 'flex', gap: 6, padding: '6px 14px',
          borderTop: `1px solid ${C.BD}`, background: '#FAFAF8',
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          {lead.etapa === 'orcamento_postado' && (
            <button
              onClick={e => { e.stopPropagation(); marcarEmContato(); }}
              disabled={marcandoEmContato}
              style={mkBtn('#9A6200', C.white, marcandoEmContato)}
            >
              {marcandoEmContato ? 'Salvando...' : '📞 Marcar em contato'}
            </button>
          )}
          {/* Rota100 — desabilitado com aviso quando token não disponível */}
          <a
            href={rota100Url ?? '#'}
            target={rota100Url ? '_blank' : undefined}
            rel="noreferrer"
            onClick={e => { e.stopPropagation(); if (!rota100Url) e.preventDefault(); }}
            title={rota100Url ? 'Abrir Rota100 em nova aba' : 'Token Rota100 não disponível para este lead'}
            style={{
              ...mkBtn(rota100Url ? C.NV2 : 'transparent', rota100Url ? C.white : C.CZ, !rota100Url, !rota100Url ? `1px solid ${C.BD}` : undefined),
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              pointerEvents: rota100Url ? undefined : 'none',
            }}
          >
            🔗 Abrir Rota100
          </a>
          <button
            onClick={e => { e.stopPropagation(); if (rota100Url) { navigator.clipboard.writeText(rota100Url); toast({ title: 'Link copiado!' }); } }}
            disabled={!rota100Url}
            title={rota100Url ? 'Copiar link da Rota100' : 'Token Rota100 não disponível'}
            style={mkBtn('transparent', C.CZ, !rota100Url, `1px solid ${C.BD}`)}
          >
            Copiar link
          </button>
        </div>
      )}

      {/* Form de edição */}
      {editing && (
        <EditLeadForm
          lead={lead}
          onSave={(remarcar) => { onCancelEdit(); onUpdate(); if (remarcar) setWasRescheduled(true); }}
          onCancel={onCancelEdit}
        />
      )}

      {/* Candidaturas */}
      {expanded && !editing && (
        <div style={{ padding: '0 18px 14px', borderTop: `1px solid ${C.BD}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lead.necessidade && (
            <div style={{ fontSize: 12, color: C.CZ, lineHeight: 1.6, padding: '8px 10px', background: C.FD, borderRadius: 6, border: `1px solid ${C.BD}` }}>
              <span style={{ fontWeight: 700, color: C.NV, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Escopo</span>
              <div style={{ marginTop: 4 }}>{lead.necessidade}</div>
            </div>
          )}
          {/* Bloco de estimativa técnica */}
          <EstimativaBlock
            lead={lead}
            gerando={gerandoEstimativa}
            onGerar={onGerarEstimativa}
            userRole={userRole}
          />

          {/* Tipo de atendimento */}
          {lead.tipo_atendimento && (
            <div style={{ fontSize: 12, color: C.CZ, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.NV, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo</span>
              <span>{lead.tipo_atendimento === 'presencial' ? '📅 Visita presencial' : lead.tipo_atendimento === 'online' ? '🎥 Reunião online' : lead.tipo_atendimento}</span>
            </div>
          )}

          {/* Arquivos do lead */}
          <ArquivosLead orcamentoId={lead.id} />

          {lead.horarios_sdr.length > 0 && lead.candidaturas.length === 0 && (
            <div style={{ background: '#F5F9FF', border: '1px solid #C5D8F5', borderRadius: 8, padding: '10px 12px', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2B5EAA', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                🗓 Horários definidos pelo SDR
              </div>
              {lead.horarios_sdr
                .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                .map((h, i) => (
                  <div key={h.id} style={{ fontSize: 12, color: '#1A3A6A', fontWeight: 600, marginBottom: i < lead.horarios_sdr.length - 1 ? 4 : 0 }}>
                    {i + 1}. {format(new Date(h.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                ))}
            </div>
          )}
          {lead.candidaturas.length === 0 ? (
            <div style={{ fontSize: 12, color: C.CZ, fontStyle: 'italic' }}>Nenhum fornecedor inscrito ainda.</div>
          ) : (
            lead.candidaturas.map(cand => (
              <CandidaturaRow
                key={cand.id}
                cand={cand}
                tipoAtendimento={lead.tipo_atendimento}
                horariosSdr={lead.horarios_sdr}
                onUpdate={onUpdate}
                onLeaveQueue={onLeaveQueue}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── SDR sort ─────────────────────────────────────────────────────────────────

// Prioridade operacional: 0=crítico, 100=pendente, 200+diffH=aguardando, 9999=sem horário
function getSDRPrioridade(lead: Lead): number {
  let min = 9999;
  for (const cand of lead.candidaturas) {
    const st = getStatusOperacional(cand);
    if (st === 'reagendar') return 0;
    if (getEtapaPendente(cand) !== null) { min = Math.min(min, 100); continue; }
    if (st !== 'sem_horario' && st !== 'confirmado' && cand.horario) {
      const diffH = (new Date(cand.horario.data_hora).getTime() - Date.now()) / 3600000;
      if (diffH > 0) min = Math.min(min, 200 + diffH);
    }
  }
  return min;
}

function sortSDRLeads(leads: Lead[], mode: SortMode): Lead[] {
  if (mode === 'cronologico') {
    return [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return [...leads].sort((a, b) => getSDRPrioridade(a) - getSDRPrioridade(b));
}

// ─── Formulário Novo Lead SDR ─────────────────────────────────────────────────

type NovoLeadForm = {
  nome: string;
  telefone: string;
  email: string;
  local: string;
  tamanho: string;
  budget: string;
  prazo: string;
  necessidade: string;
  categorias: string[];
  tipoAtendimento: 'presencial' | 'online' | '';
  horarios: { data: string; hora: string; link: string }[];
};

const HORARIO_VAZIO = { data: '', hora: '', link: '' };

function FormNovoLeadSDR({
  adicionarOrcamento,
  onSuccess,
  onCancel,
  cepInicial,
}: {
  adicionarOrcamento: (input: NovoOrcamentoInput) => Promise<{ id: string; rota100_token?: string | null } | undefined>;
  onSuccess: () => void;
  onCancel: () => void;
  cepInicial?: CepResultado | null;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [linkRota100, setLinkRota100] = useState<string | null>(null);
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const localInicial = cepInicial
    ? [cepInicial.viaCep.bairro, cepInicial.viaCep.localidade, cepInicial.viaCep.uf]
        .filter(Boolean)
        .join(', ')
        .replace(/,\s*([^,]+)$/, ' – $1')
    : '';

  const [form, setForm] = useState<NovoLeadForm>({
    nome: '', telefone: '', email: '', local: localInicial, tamanho: '', budget: '',
    prazo: '', necessidade: '', categorias: [], tipoAtendimento: '',
    horarios: [{ ...HORARIO_VAZIO }, { ...HORARIO_VAZIO }, { ...HORARIO_VAZIO }],
  });

  const set = (field: keyof NovoLeadForm, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleCategoria = (cat: string) =>
    set('categorias', form.categorias.includes(cat)
      ? form.categorias.filter(c => c !== cat)
      : [...form.categorias, cat]);

  const setHorario = (idx: number, field: 'data' | 'hora' | 'link', value: string) =>
    set('horarios', form.horarios.map((h, i) => i === idx ? { ...h, [field]: value } : h));

  const handleSalvar = async () => {
    if (!form.nome || !form.telefone || !form.local || !form.necessidade || form.categorias.length === 0) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, telefone, local, descrição e ao menos uma categoria.', variant: 'destructive' });
      return;
    }
    if (!form.tipoAtendimento) {
      toast({ title: 'Tipo de atendimento', description: 'Selecione visita presencial ou reunião online.', variant: 'destructive' });
      return;
    }
    const horariosValidos = form.horarios.filter(h => h.data && h.hora);
    if (horariosValidos.length === 0) {
      toast({ title: 'Horário obrigatório', description: 'Informe pelo menos uma opção de data/hora.', variant: 'destructive' });
      return;
    }
    // link_reuniao não tem coluna no banco ainda — não bloquear por ele
    // PENDENTE DE MIGRATION: persistir link_reuniao quando coluna existir

    setSaving(true);
    try {
      const resultado = await adicionarOrcamento({
        necessidade: form.necessidade,
        arquivos: [],
        fotos: [],
        videos: [],
        categorias: form.categorias,
        local: form.local,
        tamanhoImovel: form.tamanho ? Number(form.tamanho) : 0,
        dataPublicacao: new Date(),
        dataInicio: new Date(),
        prazoInicioTexto: form.prazo || 'Imediato',
        status: 'aberto',
        gestorContaId: null,
        budget_informado: form.budget ? Number(form.budget) : undefined,
        tipo_atendimento_tecnico: form.tipoAtendimento || null,
        dadosContato: { nome: form.nome, telefone: form.telefone, email: form.email || undefined },
      });

      if (!resultado?.id) throw new Error('Lead não criado');

      // Insere horários definidos pelo SDR (sem candidatura ainda)
      for (const h of horariosValidos) {
        await (supabase as any)
          .from('horarios_visita_orcamento')
          .insert({ orcamento_id: resultado.id, data_hora: `${h.data}T${h.hora}:00`, link_reuniao: h.link || null });
      }

      // Upload arquivos selecionados — falhas não interrompem criação do lead
      let uploadErros = 0;
      for (const file of arquivosSelecionados) {
        const fileName = `${resultado.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('orcamentos-anexos').upload(fileName, file);
        if (upErr) { uploadErros++; continue; }
        const { data: urlData } = supabase.storage.from('orcamentos-anexos').getPublicUrl(fileName);
        await supabase.from('arquivos_orcamento').insert({
          orcamento_id: resultado.id,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          tamanho: file.size,
          url_arquivo: urlData.publicUrl,
        });
      }
      if (uploadErros > 0) {
        toast({
          title: `${uploadErros} arquivo(s) não enviados`,
          description: 'Lead criado. Adicione os arquivos no card após.',
          variant: 'destructive',
        });
      }

      // link_reuniao_sdr é guardado como nota — será atribuído à candidatura pelo SDR

      if (resultado.rota100_token) {
        setLinkRota100(`${window.location.origin}/rota100/${resultado.rota100_token}`);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('[FormNovoLeadSDR] salvar:', err);
      toast({ title: 'Erro ao criar lead', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const inputS: React.CSSProperties = {
    fontSize: 13, padding: '8px 10px', border: `1px solid ${C.BD}`,
    borderRadius: 7, background: C.white, fontFamily: '"DM Sans", sans-serif',
    color: C.text, width: '100%', boxSizing: 'border-box',
  };
  const labelS: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: C.CZ, textTransform: 'uppercase',
    letterSpacing: '0.04em', display: 'block', marginBottom: 4,
  };
  const sectionS: React.CSSProperties = {
    borderTop: `1px solid ${C.BD}`, paddingTop: 16, marginTop: 16,
  };

  // Modal de sucesso com link Rota100
  if (linkRota100) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: C.white, borderRadius: 14, padding: 32, maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 20, color: C.NV, margin: '0 0 8px' }}>Lead criado!</h2>
          <p style={{ fontSize: 13, color: C.CZ, marginBottom: 20 }}>Envie o link abaixo ao cliente para acompanhar pela Rota100.</p>
          <div style={{ background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: C.NV, marginBottom: 16 }}>
            {linkRota100}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(linkRota100!); toast({ title: 'Link copiado!' }); }}
              style={{ flex: 1, ...mkBtn(C.NV, C.white) }}
            >
              Copiar link
            </button>
            <button
              onClick={onSuccess}
              style={{ flex: 1, ...mkBtn('transparent', C.NV, false, `1px solid ${C.BD}`) }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,42,0.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 28, maxWidth: 600, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 20, color: C.NV, margin: 0 }}>Novo Lead SDR</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.CZ, lineHeight: 1 }}>✕</button>
        </div>

        {/* Card Inteligência CEP — visível apenas quando há consulta prévia */}
        {cepInicial && (() => {
          const r = cepInicial.regiao;
          const v = cepInicial.viaCep;
          const classBg: Record<string, string> = {
            'A+': '#F0ECFB', 'A': '#EEF0FF', 'A-': '#E8F5EE',
            'B+': '#FFF5DC', 'B': '#F5F3EF', 'B-': '#F5F3EF',
            'C+': '#FFF0E8', 'C': '#F7F6F3', 'C/D': '#F7F6F3', 'D': '#FDE8E8',
            'Premium A+': '#F0ECFB', 'Premium A': '#EEF0FF',
            'Oportunidade': '#FFF0E8', 'Fora de área': '#F5F3EF',
          };
          const classClr: Record<string, string> = {
            'A+': '#6B21A8', 'A': '#3B35B7', 'A-': '#1A7A4A',
            'B+': '#9A6200', 'B': '#6B6760', 'B-': '#6B6760',
            'C+': '#C45B10', 'C': '#6B6760', 'C/D': '#9B4747', 'D': '#C0392B',
            'Premium A+': '#6B21A8', 'Premium A': '#3B35B7',
            'Oportunidade': C.LJ, 'Fora de área': '#6B6760',
          };
          const bg  = classBg[r.classificacao]  ?? '#F7F6F3';
          const clr = classClr[r.classificacao] ?? '#6B7280';
          const faixa = r.faixa_valor_min
            ? r.faixa_valor_max
              ? `R$${(r.faixa_valor_min / 1000).toFixed(0)}k – R$${(r.faixa_valor_max / 1000).toFixed(0)}k`
              : `acima de R$${(r.faixa_valor_min / 1000).toFixed(0)}k`
            : null;
          return (
            <div style={{
              background: bg,
              border: `1px solid ${clr}33`,
              borderTop: `3px solid ${clr}`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.CZ, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📍 Inteligência CEP — {v.cep}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: C.white, color: clr, border: `1px solid ${clr}44`, borderRadius: 999, padding: '2px 9px' }}>
                    {r.classificacao}
                  </span>
                  {r.tipo_resultado && r.tipo_resultado !== 'validado' && (() => {
                    const m: Record<string, { label: string; clr2: string }> = {
                      contextual:          { label: '~ Contextual', clr2: '#2D3395' },
                      fallback:            { label: '⚠ Estimado',   clr2: '#9A6200' },
                      necessita_validacao: { label: '! Sem dados',  clr2: '#C0392B' },
                    };
                    const t = m[r.tipo_resultado];
                    return t ? <span style={{ fontSize: 10, fontWeight: 700, color: t.clr2, background: `${t.clr2}15`, borderRadius: 999, padding: '2px 8px', border: `1px solid ${t.clr2}30` }}>{t.label}</span> : null;
                  })()}
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
                {[v.logradouro, v.bairro, v.localidade, v.uf].filter(Boolean).join(', ')}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {r.potencial && (
                  <span style={{ fontSize: 11, color: clr, fontWeight: 600 }}>
                    Potencial: {r.potencial}
                  </span>
                )}
                {faixa && (
                  <span style={{ fontSize: 11, color: C.CZ }}>
                    Ticket estimado: {faixa}
                  </span>
                )}
                {r.status_regiao && (
                  <span style={{ fontSize: 11, color: C.CZ }}>
                    Status: {r.status_regiao}
                  </span>
                )}
                {r.origem_classificacao && (() => {
                  const origemLabel: Record<string, string> = {
                    cache_manual: 'Base manual', cache_ia: 'IA cache',
                    ia_online: 'IA nova', fallback_conservador: 'Fallback',
                  };
                  return <span style={{ opacity: 0.55, fontSize: 10 }}>· {origemLabel[r.origem_classificacao] ?? r.origem_classificacao}</span>;
                })()}
              </div>
              {r.descricao && (
                <div style={{ fontSize: 11, color: C.CZ, lineHeight: 1.5, borderTop: `1px solid ${clr}22`, paddingTop: 6, marginTop: 2 }}>
                  {r.descricao}
                </div>
              )}
            </div>
          );
        })()}

        {/* Dados do cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelS}>Nome do cliente *</label>
            <input style={inputS} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <label style={labelS}>Telefone *</label>
            <input style={inputS} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label style={labelS}>E-mail</label>
            <input style={inputS} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="cliente@email.com" />
          </div>
        </div>

        {/* Dados do projeto */}
        <div style={sectionS}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelS}>Local / Endereço *</label>
              <input style={inputS} value={form.local} onChange={e => set('local', e.target.value)} placeholder="Cidade, Estado ou endereço completo" />
            </div>
            <div>
              <label style={labelS}>Metragem (m²)</label>
              <input style={inputS} type="number" value={form.tamanho} onChange={e => set('tamanho', e.target.value)} placeholder="Ex: 120" />
            </div>
            <div>
              <label style={labelS}>Budget (R$)</label>
              <input style={inputS} type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="Ex: 80000" />
            </div>
            <div>
              <label style={labelS}>Prazo de início</label>
              <select style={inputS} value={form.prazo} onChange={e => set('prazo', e.target.value)}>
                <option value="">Selecione</option>
                {PRAZOS_INICIO.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelS}>Descrição / Necessidade *</label>
            <textarea
              style={{ ...inputS, minHeight: 80, resize: 'vertical' }}
              value={form.necessidade}
              onChange={e => set('necessidade', e.target.value)}
              placeholder="Descreva o escopo da reforma..."
            />
          </div>
        </div>

        {/* Categorias */}
        <div style={sectionS}>
          <label style={labelS}>Categorias de serviço *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6, marginTop: 6 }}>
            {CATEGORIAS_SERVICO.map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer', color: C.text }}>
                <input
                  type="checkbox"
                  checked={form.categorias.includes(cat)}
                  onChange={() => toggleCategoria(cat)}
                  style={{ accentColor: C.LJ }}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Tipo de atendimento + Horários — definidos DURANTE a ligação */}
        <div style={sectionS}>
          {/* Aviso de contexto */}
          <div style={{
            background: '#FFF9EC', border: '1px solid #E8D08A', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, lineHeight: 1.2 }}>📞</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7A4D00', marginBottom: 2 }}>
                Preencha durante a ligação com o cliente
              </div>
              <div style={{ fontSize: 11, color: '#9A6200', lineHeight: 1.5 }}>
                Tipo e horários são acordados agora, na ligação. Ao menos 1 horário é obrigatório.
              </div>
            </div>
          </div>

          {/* Tipo */}
          <label style={labelS}>Tipo de atendimento *</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, marginBottom: 16 }}>
            {([['presencial', '📅 Visita presencial'], ['online', '🎥 Reunião online']] as const).map(([val, lbl]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tipoAtend"
                  value={val}
                  checked={form.tipoAtendimento === val}
                  onChange={() => set('tipoAtendimento', val)}
                  style={{ accentColor: C.LJ }}
                />
                {lbl}
              </label>
            ))}
          </div>

          {/* Horários — link por horário quando reunião online */}
          <label style={{ ...labelS, color: C.NV }}>Horários acordados com o cliente *</label>
          <p style={{ fontSize: 11, color: C.CZ, margin: '4px 0 10px', lineHeight: 1.5 }}>
            Até 3 opções. Fornecedores confirmarão o horário disponível.
            {form.tipoAtendimento === 'online' && ' Informe o link do Meet para cada horário.'}
          </p>
          {form.horarios.map((h, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8,
              padding: '10px 12px', borderRadius: 8,
              background: h.data && h.hora ? '#F0F7FF' : C.FD,
              border: `1px solid ${h.data && h.hora ? '#BDD5F5' : C.BD}`,
            }}>
              <div>
                <label style={{ ...labelS, marginBottom: 2, color: i === 0 ? C.NV : C.CZ }}>
                  {i === 0 ? 'Data 1 (obrigatória)' : `Data ${i + 1}`}
                </label>
                <input style={inputS} type="date" value={h.data} onChange={e => setHorario(i, 'data', e.target.value)} />
              </div>
              <div>
                <label style={{ ...labelS, marginBottom: 2, color: i === 0 ? C.NV : C.CZ }}>
                  {i === 0 ? 'Hora 1 (obrigatória)' : `Hora ${i + 1}`}
                </label>
                <input style={inputS} type="time" value={h.hora} onChange={e => setHorario(i, 'hora', e.target.value)} />
              </div>
              {form.tipoAtendimento === 'online' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ ...labelS, marginBottom: 2, color: C.CZ }}>Link Meet {i === 0 ? '(obrigatório)' : '(opcional)'}</label>
                  <input
                    style={inputS}
                    type="url"
                    value={h.link}
                    onChange={e => setHorario(i, 'link', e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Arquivos */}
        <div style={sectionS}>
          <label style={labelS}>Arquivos (plantas, fotos, vídeos)</label>
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ ...mkBtn(C.NV, C.white), padding: '7px 14px', fontSize: 12 }}
            >
              + Selecionar arquivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setArquivosSelecionados(prev => [...prev, ...files]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            {arquivosSelecionados.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {arquivosSelecionados.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: C.FD, borderRadius: 6, border: `1px solid ${C.BD}` }}>
                    <span style={{ fontSize: 14 }}>{fileIcon(f.type)}</span>
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 10, color: C.CZ }}>{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setArquivosSelecionados(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.CZ, fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleSalvar}
            disabled={saving}
            style={{ flex: 1, ...mkBtn(C.LJ, C.white, saving), padding: '10px 18px', fontSize: 14 }}
          >
            {saving ? 'Criando lead...' : '✓ Criar lead SDR'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ ...mkBtn('transparent', C.NV, saving, `1px solid ${C.BD}`), padding: '10px 18px', fontSize: 14 }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface PaginaSDRProps {
  onViewChange: (view: string) => void;
}

export function PaginaSDR({ onViewChange: _onViewChange }: PaginaSDRProps) {
  useSDRStyles();
  const { profile } = useAuth();
  const { adicionarOrcamento } = useOrcamento();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('prioridade');
  const [showNovoLeadModal, setShowNovoLeadModal] = useState(false);
  const [gerandoIds, setGerandoIds] = useState<Set<string>>(new Set());
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>('todos');
  const [leadsGanhos, setLeadsGanhos] = useState<LeadSimples[]>([]);
  const [leadsPerdidos, setLeadsPerdidos] = useState<LeadSimples[]>([]);
  const [cepInput, setCepInput] = useState('');
  const [cepBuscando, setCepBuscando] = useState(false);
  const [cepResultado, setCepResultado] = useState<CepResultado | null>(null);

  const handleConsultarCep = useCallback(async () => {
    const clean = cepInput.replace(/\D/g, '');
    if (clean.length < 8) return;
    setCepBuscando(true);
    try {
      const resultado = await consultarCep(clean, profile?.id);
      if (resultado) {
        setCepResultado(resultado);
      } else {
        toast.error('CEP não encontrado ou inválido.');
      }
    } catch {
      toast.error('Erro ao consultar CEP.');
    } finally {
      setCepBuscando(false);
    }
  }, [cepInput, profile?.id]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      // NOTA: valor_estimado_ia_* NÃO estão na view atual (migration 20260503 não foi aplicada)
      // Buscamos da view apenas colunas que existem; estimativas vêm de orcamentos_crm_tracking separado
      let query = supabase
        .from('view_orcamentos_crm_com_checklist')
        .select('id, codigo_orcamento, necessidade, local, etapa_crm, dados_contato, created_at, budget_informado')
        .or('etapa_crm.in.(orcamento_postado,contato_agendamento),etapa_crm.is.null')
        .order('created_at', { ascending: false });

      if (!isFullAccess(profile?.tipo_usuario ?? '') && profile?.tipo_usuario === 'gestor_conta' && profile?.id) {
        query = query.eq('concierge_responsavel_id', profile.id);
      }

      const { data: orcamentosData, error } = await query;

      if (error || !orcamentosData) {
        console.error('[SDR] erro na query principal:', error);
        setLeads([]);
        return;
      }

      const ids = orcamentosData.map((o: { id: string }) => o.id);

      // Candidaturas — somente colunas que existem no banco atual
      // PENDENTE DE MIGRATION: link_reuniao, token_visita, valor_estimado_ia_*
      const { data: candData, error: candError } = await supabase
        .from('candidaturas_fornecedores')
        .select('id, orcamento_id, nome, empresa, email, telefone, status_acompanhamento, data_desistencia')
        .in('orcamento_id', ids);

      if (candError) console.error('[SDR] erro ao buscar candidaturas:', candError);

      // Horários de visita/reunião
      const { data: horarioData } = await supabase
        .from('horarios_visita_orcamento')
        .select('id, orcamento_id, candidatura_id, data_hora, link_reuniao')
        .in('orcamento_id', ids);

      // rota100_token e tipo_atendimento_tecnico — não estão no types.ts gerado
      const { data: orcExtras } = await (supabase as any)
        .from('orcamentos')
        .select('id, rota100_token, tipo_atendimento_tecnico')
        .in('id', ids);
      const orcExtrasById: Record<string, { rota100_token: string | null; tipo_atendimento_tecnico: string | null }> = {};
      (orcExtras || []).forEach((o: { id: string; rota100_token: string | null; tipo_atendimento_tecnico: string | null }) => {
        orcExtrasById[o.id] = o;
      });

      // Estimativas IA — salvas pela edge function em orcamentos_crm_tracking
      const { data: trackingData } = await (supabase as any)
        .from('orcamentos_crm_tracking')
        .select('orcamento_id, valor_estimado_ia_min, valor_estimado_ia_medio, valor_estimado_ia_max, valor_estimado_ia_confianca, valor_estimado_ia_justificativa')
        .in('orcamento_id', ids);
      type TrackingRow = { orcamento_id: string; valor_estimado_ia_min: number | null; valor_estimado_ia_medio: number | null; valor_estimado_ia_max: number | null; valor_estimado_ia_confianca: string | null; valor_estimado_ia_justificativa: string | null };
      const trackingById: Record<string, TrackingRow> = {};
      (trackingData || []).forEach((t: TrackingRow) => {
        trackingById[t.orcamento_id] = t;
      });

      // Breakdown + fontes — latest estimativa_tecnica por orcamento
      const { data: estimativasData } = await (supabase as any)
        .from('estimativas_tecnicas')
        .select('orcamento_id, perc_mao_obra, perc_materiais, perc_gestao, fontes')
        .in('orcamento_id', ids)
        .order('created_at', { ascending: false });
      type EstimativaRow = { orcamento_id: string; perc_mao_obra: number | null; perc_materiais: number | null; perc_gestao: number | null; fontes: string[] | null };
      const estimativaById: Record<string, EstimativaRow> = {};
      (estimativasData || []).forEach((e: EstimativaRow) => {
        if (!estimativaById[e.orcamento_id]) estimativaById[e.orcamento_id] = e;
      });

      // Indexa horários por candidatura_id; horários sem candidatura (SDR) ficam por orcamento_id
      // Itera em ordem natural (mais antigo primeiro) para que o ÚLTIMO por candidatura_id
      // seja o mais recente — sobrescreve corretamente em caso de reagendamento.
      const horarioByCand: Record<string, HorarioVisita> = {};
      const horariosSDRByOrc: Record<string, HorarioVisita[]> = {};
      (horarioData || []).forEach(h => {
        const hv: HorarioVisita = { id: h.id, candidatura_id: h.candidatura_id, data_hora: h.data_hora, link_reuniao: h.link_reuniao ?? null };
        if (h.candidatura_id) {
          horarioByCand[h.candidatura_id] = hv;
        } else if (h.orcamento_id) {
          if (!horariosSDRByOrc[h.orcamento_id]) horariosSDRByOrc[h.orcamento_id] = [];
          horariosSDRByOrc[h.orcamento_id].push(hv);
        }
      });

      // Confirmações operacionais SDR — carrega do banco para inicializar estado local
      const CONF_INICIAL: ConfirmacoesDuplas = {
        cliente_24h: null, fornecedor_24h: null,
        cliente_12h: null, fornecedor_12h: null,
        cliente_6h:  null, fornecedor_6h:  null,
      };
      const candIds = (candData || []).map(c => c.id);
      const confirmacoesPerCand: Record<string, ConfirmacoesDuplas> = {};
      if (candIds.length > 0) {
        const { data: confData } = await (supabase as any)
          .from('sdr_confirmacoes_visita')
          .select('candidatura_id, etapa, parte, status')
          .in('candidatura_id', candIds);
        (confData || []).forEach((row: { candidatura_id: string; etapa: string; parte: string; status: string }) => {
          if (!row.candidatura_id) return;
          if (!confirmacoesPerCand[row.candidatura_id]) {
            confirmacoesPerCand[row.candidatura_id] = { ...CONF_INICIAL };
          }
          const key = `${row.parte}_${row.etapa}` as keyof ConfirmacoesDuplas;
          confirmacoesPerCand[row.candidatura_id][key] =
            row.status === 'confirmou' ? true :
            row.status === 'nao_confirmou' ? false : null;
        });
      }

      const candByOrcamento: Record<string, Candidatura[]> = {};
      (candData || []).forEach(c => {
        if (!candByOrcamento[c.orcamento_id]) candByOrcamento[c.orcamento_id] = [];
        candByOrcamento[c.orcamento_id].push({
          id: c.id,
          orcamento_id: c.orcamento_id,
          nome: c.nome,
          empresa: c.empresa,
          email: c.email,
          telefone: c.telefone,
          status_acompanhamento: (c.status_acompanhamento as StatusAcomp) || 'sem_contato',
          horario: horarioByCand[c.id] ?? null,
          confirmacoesDb: confirmacoesPerCand[c.id] ?? { ...CONF_INICIAL },
        });
      });

      const allLeads = (orcamentosData as unknown as LeadViewRow[]).map(o => {
        return {
          id: o.id,
          codigo: o.codigo_orcamento,
          necessidade: o.necessidade,
          local: o.local,
          etapa: o.etapa_crm,
          dados_contato: o.dados_contato as Lead['dados_contato'],
          created_at: o.created_at,
          candidaturas: candByOrcamento[o.id] || [],
          horarios_sdr: horariosSDRByOrc[o.id] || [],
          valor_estimado_ia_min: trackingById[o.id]?.valor_estimado_ia_min ?? null,
          valor_estimado_ia_medio: trackingById[o.id]?.valor_estimado_ia_medio ?? null,
          valor_estimado_ia_max: trackingById[o.id]?.valor_estimado_ia_max ?? null,
          budget_informado: o.budget_informado ?? null,
          valor_estimado_ia_confianca: trackingById[o.id]?.valor_estimado_ia_confianca ?? null,
          valor_estimado_ia_justificativa: trackingById[o.id]?.valor_estimado_ia_justificativa ?? null,
          perc_mao_obra: estimativaById[o.id]?.perc_mao_obra ?? null,
          perc_materiais: estimativaById[o.id]?.perc_materiais ?? null,
          perc_gestao: estimativaById[o.id]?.perc_gestao ?? null,
          fontes_ia: estimativaById[o.id]?.fontes ?? null,
          rota100_token: orcExtrasById[o.id]?.rota100_token ?? null,
          // tipo_atendimento_tecnico no banco → mapeado como tipo_atendimento no Lead (frontend)
          tipo_atendimento: orcExtrasById[o.id]?.tipo_atendimento_tecnico ?? null,
        };
      });

      // Remove leads onde TODAS as candidaturas já foram realizadas
      // status NULL passa — é o estado padrão de fornecedores recém-inscritos
      const leadsFinais = allLeads.filter(lead => {
        const cands = lead.candidaturas || [];
        return !cands.some(c =>
          c.status_acompanhamento === 'visita_realizada' ||
          c.status_acompanhamento === 'reuniao_realizada'
        );
      });
      setLeads(leadsFinais);

      // Ganhos: etapas avançadas (passaram pelo SDR com sucesso)
      const ETAPAS_GANHOS = ['em_orcamento', 'propostas_enviadas', 'compatibilizacao', 'fechamento_contrato', 'pos_venda_feedback', 'ganho'];
      const { data: ganhadosRaw } = await (supabase as any)
        .from('view_orcamentos_crm_com_checklist')
        .select('id, codigo_orcamento, necessidade, local, etapa_crm, dados_contato, created_at')
        .in('etapa_crm', ETAPAS_GANHOS)
        .order('created_at', { ascending: false })
        .limit(100);
      setLeadsGanhos((ganhadosRaw || []).map((o: any) => ({
        id: o.id, codigo: o.codigo_orcamento, necessidade: o.necessidade,
        local: o.local, etapa: o.etapa_crm, dados_contato: o.dados_contato, created_at: o.created_at,
      })));

      // Perdidos
      const { data: perdidosRaw } = await (supabase as any)
        .from('view_orcamentos_crm_com_checklist')
        .select('id, codigo_orcamento, necessidade, local, etapa_crm, dados_contato, created_at')
        .eq('etapa_crm', 'perdido')
        .order('created_at', { ascending: false })
        .limit(100);
      setLeadsPerdidos((perdidosRaw || []).map((o: any) => ({
        id: o.id, codigo: o.codigo_orcamento, necessidade: o.necessidade,
        local: o.local, etapa: o.etapa_crm, dados_contato: o.dados_contato, created_at: o.created_at,
      })));
    } catch (e) {
      console.error('PaginaSDR fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.tipo_usuario]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  }, [fetchLeads]);

  const handleGerarEstimativa = useCallback(async (leadId: string) => {
    console.log('[SDR] handleGerarEstimativa called, leadId=', leadId);
    setGerandoIds(prev => new Set(prev).add(leadId));
    try {
      const { data, error } = await supabase.functions.invoke('gerar-estimativa-tecnica', {
        body: { orcamento_id: leadId },
      });
      console.log('[SDR] estimativa IA response:', { data, error });
      if (error) {
        console.error('[SDR] estimativa IA function error:', error);
        toast.error(`Erro ao gerar estimativa: ${error.message ?? error}`);
      } else {
        await fetchLeads();
      }
    } catch (e) {
      console.error('[SDR] estimativa IA exception:', e);
      toast.error(`Erro ao chamar edge function: ${e}`);
    } finally {
      setGerandoIds(prev => { const s = new Set(prev); s.delete(leadId); return s; });
    }
  }, [fetchLeads]);

  const handleLeaveQueue = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (expandedId === leadId) setExpandedId(null);
    if (editingId === leadId) setEditingId(null);
  }, [expandedId, editingId]);

  const leadsMatch = busca
    ? leads.filter(l =>
        l.necessidade.toLowerCase().includes(busca.toLowerCase()) ||
        l.local.toLowerCase().includes(busca.toLowerCase()) ||
        (l.dados_contato?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (l.codigo || '').includes(busca)
      )
    : leads;

  const leadsFiltradosTempo = filtrarLeadsPorTempo(leadsMatch, filtroTempo);
  const leadsFiltrados = sortSDRLeads(leadsFiltradosTempo, sortMode);

  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', color: C.text }}>
      {/* Header — Isabella gradient banner */}
      <div className="sdr-header-row" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
        flexWrap: 'wrap',
        background: 'linear-gradient(135deg, #2D3395 0%, #534AB7 100%)',
        borderRadius: 14,
        padding: '18px 24px',
        boxShadow: '0 2px 12px rgba(45,51,149,0.22)',
      }}>
        <div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            Atendimento SDR
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', margin: '4px 0 0' }}>
            Leads em pré-atendimento — agende visitas e reuniões
          </p>
        </div>
        <div className="sdr-header-btns" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Atualizar lista de leads"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              opacity: refreshing || loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
            }}
          >
            {refreshing ? '⏳ Atualizando...' : '↻ Atualizar fila'}
          </button>
          <button
            onClick={() => setShowNovoLeadModal(true)}
            style={{
              background: C.LJ,
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: '"Syne", sans-serif',
              letterSpacing: '-0.2px',
              boxShadow: '0 2px 10px rgba(247,162,38,0.35)',
            }}
          >
            + Novo Lead
          </button>
        </div>
      </div>

      {/* Consulta de CEP — inteligência de regiões */}
      {(() => {
        const r = cepResultado?.regiao;
        const statusColor: Record<string, string> = {
          ativa:    '#1A7A4A',
          expansão: '#9A6200',
          fora:     '#6B6760',
        };
        const classBg: Record<string, string> = {
          'A+': '#F0ECFB', 'A':  '#EEF0FF', 'A-': '#E8F5EE',
          'B+': '#FFF5DC', 'B':  '#F5F3EF', 'B-': '#F5F3EF',
          'C+': '#FFF0E8', 'C':  '#F7F6F3', 'C/D':'#F7F6F3', 'D': '#FDE8E8',
          // legado
          'Premium A+': '#F0ECFB', 'Premium A': '#EEF0FF',
          'Oportunidade': '#FFF0E8', 'Fora de área': '#F5F3EF',
        };
        const classClr: Record<string, string> = {
          'A+': '#6B21A8', 'A':  '#3B35B7', 'A-': '#1A7A4A',
          'B+': '#9A6200', 'B':  '#6B6760', 'B-': '#6B6760',
          'C+': '#C45B10', 'C':  '#6B6760', 'C/D':'#9B4747', 'D': '#C0392B',
          // legado
          'Premium A+': '#6B21A8', 'Premium A': '#3B35B7',
          'Oportunidade': C.LJ, 'Fora de área': '#6B6760',
        };
        const potencialEmoji: Record<string, string> = {
          alto:  '🔥',
          médio: '⚡',
          baixo: '○',
        };
        const faixaLabel = r && r.faixa_valor_min
          ? r.faixa_valor_max
            ? `R$${(r.faixa_valor_min / 1000).toFixed(0)}k – R$${(r.faixa_valor_max / 1000).toFixed(0)}k`
            : `acima de R$${(r.faixa_valor_min / 1000).toFixed(0)}k`
          : null;

        return (
          <div style={{ background: C.white, border: `1px solid ${C.BD}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.NV, whiteSpace: 'nowrap' }}>📍 Consultar CEP</span>
              <input
                type="text"
                value={cepInput}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setCepInput(v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v);
                }}
                onKeyDown={e => e.key === 'Enter' && handleConsultarCep()}
                placeholder="00000-000"
                maxLength={9}
                style={{
                  width: 110,
                  fontSize: 13,
                  padding: '6px 10px',
                  border: `1px solid ${C.BD}`,
                  borderRadius: 7,
                  background: C.FD,
                  fontFamily: '"DM Sans", sans-serif',
                  color: C.text,
                  letterSpacing: '0.5px',
                }}
              />
              <button
                onClick={handleConsultarCep}
                disabled={cepBuscando || cepInput.replace(/\D/g,'').length < 8}
                style={{
                  background: C.NV,
                  color: C.white,
                  border: 'none',
                  borderRadius: 7,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: cepBuscando || cepInput.replace(/\D/g,'').length < 8 ? 'not-allowed' : 'pointer',
                  opacity: cepInput.replace(/\D/g,'').length < 8 ? 0.5 : 1,
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                {cepBuscando ? '...' : 'Consultar'}
              </button>
              {cepResultado && (
                <button
                  onClick={() => { setCepResultado(null); setCepInput(''); }}
                  style={{ background: 'none', border: 'none', color: C.CZ, cursor: 'pointer', fontSize: 13, padding: '4px 6px' }}
                >✕</button>
              )}
            </div>

            {r && (
              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                background: C.FD,
                borderRadius: 9,
                border: `1px solid ${C.BD}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                {/* Linha 1: localização */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.NV }}>
                    {r.bairro ? `${r.bairro} · ` : ''}{r.cidade} — {r.uf}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: classBg[r.classificacao] || '#F5F3EF',
                    color: classClr[r.classificacao] || C.CZ,
                    borderRadius: 999,
                    padding: '2px 9px',
                    border: `1px solid ${classClr[r.classificacao] || C.BD}22`,
                  }}>
                    {r.classificacao}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: r.status_regiao === 'ativa' ? '#E8F5EE' : r.status_regiao === 'expansão' ? '#FFF5DC' : '#F5F3EF',
                    color: statusColor[r.status_regiao] || C.CZ,
                    borderRadius: 999,
                    padding: '2px 9px',
                    border: `1px solid ${statusColor[r.status_regiao] || C.BD}33`,
                  }}>
                    {r.status_regiao === 'ativa' ? '✓ Área ativa' : r.status_regiao === 'expansão' ? '→ Expansão futura' : '✗ Fora de cobertura'}
                  </span>
                  {/* Badge de confiança/tipo */}
                  {r.tipo_resultado && r.tipo_resultado !== 'validado' && (() => {
                    const tipoMap: Record<string, { label: string; bg: string; clr: string }> = {
                      contextual:         { label: '~ Contextual',        bg: '#EEF0FF', clr: '#2D3395' },
                      fallback:           { label: '⚠ Estimado',          bg: '#FFF5DC', clr: '#9A6200' },
                      necessita_validacao:{ label: '! Sem dados',         bg: '#FDE8E8', clr: '#C0392B' },
                    };
                    const t = tipoMap[r.tipo_resultado];
                    if (!t) return null;
                    return (
                      <span style={{ fontSize: 10, fontWeight: 700, background: t.bg, color: t.clr, borderRadius: 999, padding: '2px 9px', border: `1px solid ${t.clr}22` }}>
                        {t.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Linha 2: potencial + zona + faixa + origem */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.CZ }}>
                  <span>{potencialEmoji[r.potencial] || '○'} Potencial <strong style={{ color: C.NV }}>{r.potencial}</strong></span>
                  <span>🗺 <strong style={{ color: C.NV, textTransform: 'capitalize' }}>{r.zona}</strong></span>
                  {faixaLabel && <span>💰 Ticket ref. <strong style={{ color: C.NV }}>{faixaLabel}</strong></span>}
                  {r.origem_classificacao && (() => {
                    const origemLabel: Record<string, string> = {
                      cache_manual: 'Base manual', cache_ia: 'IA cache',
                      ia_online: 'IA nova', fallback_conservador: 'Fallback',
                    };
                    return <span style={{ opacity: 0.6, fontSize: 10 }}>· {origemLabel[r.origem_classificacao] ?? r.origem_classificacao}</span>;
                  })()}
                </div>

                {/* Linha 3: descrição */}
                <div style={{ fontSize: 12, color: C.CZ, lineHeight: 1.5, paddingTop: 2 }}>
                  🧠 {r.descricao}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Busca + ordenação */}
      <div className="sdr-search-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, local ou código..."
          style={{
            flex: '1 1 240px',
            maxWidth: 400,
            fontSize: 13,
            padding: '8px 12px',
            border: `1px solid ${C.BD}`,
            borderRadius: 8,
            background: C.white,
            fontFamily: '"DM Sans", sans-serif',
            color: C.text,
            boxSizing: 'border-box',
          }}
        />
        <div className="sdr-sort-btns" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['prioridade', 'cronologico'] as SortMode[]).map(m => (
            <button
              key={m}
              onClick={() => setSortMode(m)}
              style={{
                fontSize: 11,
                fontWeight: sortMode === m ? 700 : 500,
                padding: '5px 10px',
                border: `1px solid ${sortMode === m ? C.NV : C.BD}`,
                borderRadius: 6,
                background: sortMode === m ? C.NV : C.white,
                color: sortMode === m ? C.white : C.CZ,
                cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {m === 'prioridade' ? '⚡ Prioridade' : '🕐 Mais recentes'}
            </button>
          ))}
          {(busca || filtroTempo !== 'todos') && (
            <button
              onClick={() => { setBusca(''); setSortMode('prioridade'); setFiltroTempo('todos'); }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 10px',
                border: `1px solid ${C.BD}`,
                borderRadius: 6,
                background: C.FD,
                color: C.CZ,
                cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filtros temporais como cards clicáveis */}
      {(() => {
        const leads24h = filtrarLeadsPorTempo(leadsMatch, '24h');
        const leads12h = filtrarLeadsPorTempo(leadsMatch, '12h');
        const leads6h  = filtrarLeadsPorTempo(leadsMatch, '6h');

        // Contagem por AÇÕES (não por leads)
        const contarPendenciasEtapa = (lead: Lead, etapa: '24h' | '12h' | '6h'): number =>
          lead.candidaturas.reduce((acc, cand) => {
            if (!cand.horario) return acc;
            const diffH = (new Date(cand.horario.data_hora).getTime() - Date.now()) / 3600000;
            const limite = etapa === '24h' ? 24 : etapa === '12h' ? 12 : 6;
            if (diffH > limite || diffH < 0) return acc;
            const conf = cand.confirmacoesDb;
            if (!conf) return acc;
            let count = 0;
            if (conf[`cliente_${etapa}` as keyof ConfirmacoesDuplas] === null) count++;
            if (conf[`fornecedor_${etapa}` as keyof ConfirmacoesDuplas] === null) count++;
            return acc + count;
          }, 0);

        const contarProblemas = (lead: Lead): number =>
          lead.candidaturas.reduce((acc, cand) => {
            if (!cand.horario) return acc;
            const diffH = (new Date(cand.horario.data_hora).getTime() - Date.now()) / 3600000;
            if (diffH < 0) return acc + 1;
            const conf = cand.confirmacoesDb;
            if (!conf) return acc;
            let count = 0;
            if (conf.cliente_24h === false) count++;
            if (conf.fornecedor_24h === false) count++;
            if (conf.cliente_12h === false) count++;
            if (conf.fornecedor_12h === false) count++;
            if (conf.cliente_6h === false) count++;
            if (conf.fornecedor_6h === false) count++;
            return acc + count;
          }, 0);

        const alertaGeral         = leadsMatch.reduce((s, l) => s + contarProblemas(l), 0);
        const alerta24h           = leadsMatch.reduce((s, l) => s + contarPendenciasEtapa(l, '24h'), 0);
        const alerta12h           = leadsMatch.reduce((s, l) => s + contarPendenciasEtapa(l, '12h'), 0);
        const alerta6h            = leadsMatch.reduce((s, l) => s + contarPendenciasEtapa(l, '6h'), 0);
        const alertaVagas         = leadsMatch.filter(leadTemVagaAberta).length;
        const alertaAcoesUrgentes = alertaGeral;

        const cards: { key: FiltroTempo; label: string; count: number; alerta: number; bg: string; clr: string; bdrAct: string }[] = [
          { key: 'todos',          label: 'Total fila',     count: leads.length,                                   alerta: alertaGeral,        bg: C.FD,       clr: C.NV,      bdrAct: C.NV },
          { key: 'novos',          label: 'Novos',          count: filtrarLeadsPorTempo(leadsMatch, 'novos').length, alerta: 0,                 bg: C.greenBg,  clr: C.green,   bdrAct: C.green },
          { key: '24h',            label: '≤ 24h',          count: leads24h.length,                                alerta: alerta24h,          bg: '#EEF0FF',  clr: '#3B35B7', bdrAct: '#3B35B7' },
          { key: '12h',            label: '≤ 12h',          count: leads12h.length,                                alerta: alerta12h,          bg: '#FFF5DC',  clr: '#9A6200', bdrAct: '#9A6200' },
          { key: '6h',             label: '≤ 6h',           count: leads6h.length,                                 alerta: alerta6h,           bg: C.orangeBg, clr: C.LJ,      bdrAct: C.LJ },
          { key: 'vagas_abertas',  label: 'Vagas abertas',  count: alertaVagas,                                    alerta: alertaVagas,        bg: '#F0F7FF',  clr: '#1A5FA8', bdrAct: '#1A5FA8' },
          { key: 'acoes_urgentes', label: 'Ações urgentes', count: alertaAcoesUrgentes,                            alerta: alertaAcoesUrgentes, bg: '#FEE2E2', clr: '#991B1B', bdrAct: '#DC2626' },
          { key: 'ganhos',         label: 'Ganhos',         count: leadsGanhos.length,                             alerta: 0,                  bg: '#E8F5EE',  clr: '#1A7A4A', bdrAct: '#1A7A4A' },
          { key: 'perdidos',       label: 'Perdidos',       count: leadsPerdidos.length,                           alerta: 0,                  bg: '#F5F3EF',  clr: '#6B6760', bdrAct: '#6B6760' },
        ];

        return (
          <div className="sdr-filter-grid" style={{ marginBottom: 20, paddingTop: 4, overflow: 'visible' }}>
            {cards.map(f => {
              const ativo = filtroTempo === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFiltroTempo(f.key)}
                  className="sdr-filter-card"
                  style={{
                    background: C.white,
                    border: `1px solid ${ativo ? f.bdrAct : C.BD}`,
                    borderTop: `4px solid ${f.bdrAct}`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    outline: 'none',
                    position: 'relative',
                    boxShadow: ativo ? `0 2px 8px ${f.bdrAct}30` : '0 1px 4px rgba(0,0,0,.06)',
                    transition: 'box-shadow 0.15s, transform 0.1s',
                    transform: ativo ? 'translateY(-1px)' : 'none',
                  }}
                >
                  <span className="sdr-filter-num" style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 20, color: f.clr, lineHeight: 1 }}>{f.count}</span>
                  <span className="sdr-filter-lbl" style={{ fontSize: 12, color: ativo ? f.clr : C.CZ, fontWeight: ativo ? 700 : 500, whiteSpace: 'nowrap' }}>{f.label}</span>
                  {f.alerta > 0 && (
                    <span
                      className="sdr-filter-badge"
                      title={`${f.alerta} lead(s) com pendência`}
                      style={{
                        position: 'absolute',
                        top: -7,
                        right: -7,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        background: '#DC2626',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid #fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        fontFamily: '"DM Sans", sans-serif',
                        lineHeight: 1,
                      }}
                    >
                      {f.alerta}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}


      {/* Modal Novo Lead SDR */}
      {showNovoLeadModal && (
        <FormNovoLeadSDR
          adicionarOrcamento={adicionarOrcamento}
          onSuccess={() => { setShowNovoLeadModal(false); fetchLeads(); }}
          onCancel={() => setShowNovoLeadModal(false)}
          cepInicial={cepResultado}
        />
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.CZ, fontSize: 13 }}>
          Carregando leads...
        </div>
      ) : (filtroTempo === 'ganhos' || filtroTempo === 'perdidos') ? (() => {
        const lista = filtroTempo === 'ganhos' ? leadsGanhos : leadsPerdidos;
        const label = filtroTempo === 'ganhos' ? 'ganho' : 'perdido';
        return lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, background: C.white, borderRadius: 12, border: `1px solid ${C.BD}`, color: C.CZ }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{filtroTempo === 'ganhos' ? '🏆' : '📭'}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.NV }}>Nenhum lead {label} encontrado</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map(lead => <LeadCardSimples key={lead.id} lead={lead} />)}
          </div>
        );
      })() : leadsFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 50,
          background: C.white,
          borderRadius: 12,
          border: `1px solid ${C.BD}`,
          color: C.CZ,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: C.NV }}>
            {busca ? 'Nenhum resultado' : filtroTempo !== 'todos' ? 'Nenhum lead neste prazo' : 'Fila vazia'}
          </div>
          <div style={{ fontSize: 13 }}>
            {busca ? 'Tente outra busca.' : filtroTempo !== 'todos' ? 'Nenhum lead com horário no prazo selecionado.' : 'Cadastre um novo lead para começar.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leadsFiltrados.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              editing={editingId === lead.id}
              gerandoEstimativa={gerandoIds.has(lead.id)}
              onToggle={() => {
                setExpandedId(prev => prev === lead.id ? null : lead.id);
                if (editingId === lead.id) setEditingId(null);
              }}
              onEdit={() => { setEditingId(lead.id); setExpandedId(null); }}
              onCancelEdit={() => setEditingId(null)}
              onGerarEstimativa={() => handleGerarEstimativa(lead.id)}
              onUpdate={fetchLeads}
              onLeaveQueue={() => handleLeaveQueue(lead.id)}
              userRole={profile?.tipo_usuario ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
