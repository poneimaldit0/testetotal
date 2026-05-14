import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Rota100Cliente {
  nome:      string;
  cidade:    string;
  imovel:    string;
  descricao: string;
  tags:      string[];
}

export interface Rota100TrilhaStep {
  label:  string;
  status: 'done' | 'current' | 'pending';
}

export interface Rota100Trilha {
  percentual:  number;
  etapaAtual:  string;
  iniciadoEm:  string;
  dia:         number;
  diasMeta:    number;
  steps:       Rota100TrilhaStep[];
}

export interface Rota100ChecklistItem {
  label:  string;
  meta:   string;
  status: 'done' | 'current' | 'pending' | 'future';
  label2?: string;
}

export interface Rota100Escopo {
  itens:        string[];
  foraDoEscopo: string;
  tags:         string[];
}

export interface Rota100Empresa {
  id:                  string;
  initials:            string;
  bgColor:             string;
  nome:                string;
  inscritaEm:          string;
  status:              string;
  statusType:          'done' | 'pending' | 'current';
  propostaEnviada:     boolean;
  valor:               string;
  composicao:          string;
  progresso:           number;
  prazo:               string;
  stepLabels:          string[];
  stepStatuses:        readonly string[];
  tokenVisita:         string | null;
  linkReuniao:         string | null;
  visitaConfirmadaEm:  string | null;
  preConfirmadoEm:     string | null;
  statusAcompanhamento: string | null;
  dataHora:            string | null;
}

export type TipoAtendimento = 'presencial' | 'online' | null;

export interface Rota100Data {
  orcamentoId:     string;
  tipoAtendimento: TipoAtendimento;
  dataAtendimento: string | null;
  horaAtendimento: string | null;
  cliente:         Rota100Cliente;
  trilha:          Rota100Trilha;
  checklist:       Rota100ChecklistItem[];
  escopo:          Rota100Escopo;
  empresas:        Rota100Empresa[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#1A2E42','#1A7A4A','#534AB7','#D4870A','#C0392B','#2D8C9E','#7B4F2E'];

type EtapaCRM =
  | 'orcamento_postado' | 'contato_agendamento' | 'em_orcamento'
  | 'propostas_enviadas' | 'compatibilizacao' | 'fechamento_contrato'
  | 'pos_venda_feedback' | 'ganho' | 'perdido' | null;

// Maps etapa → index in the trilha steps array (0-based)
const ETAPA_TO_STEP: Record<string, number> = {
  orcamento_postado:    0,
  contato_agendamento:  1,
  em_orcamento:         2,
  propostas_enviadas:   3,
  compatibilizacao:     4,
  fechamento_contrato:  5,
  pos_venda_feedback:   6,
  ganho:                6,
  perdido:              6,
};

// ── Builders ─────────────────────────────────────────────────────────────────

// Status exibido baseado no último step concluído (index 0-6)
// Nova esteira: Publicado → Inscrições → Atendimento → Agendar compat → Compat realizada → Grupo criado → Contrato
const STEP_STATUS_LABEL = [
  'Publicado',                  // 0
  'Inscrições',                 // 1
  'Atendimento',                // 2
  'Agendar compatibilização',   // 3
  'Compatibilização realizada', // 4
  'Grupo criado',               // 5
  'Contrato',                   // 6
] as const;

function buildTrilha(
  etapa:           EtapaCRM,
  dataPublic:      string,
  prazo:           number | null,
  candidaturas:    any[],
  hasCompatReq:    boolean,
  tipoAtendimento: TipoAtendimento,
): Rota100Trilha {
  const atendimentoLabel =
    tipoAtendimento === 'online'     ? 'Reunião'     :
    tipoAtendimento === 'presencial' ? 'Visita'      : 'Atendimento';

  const stepDefs = [
    'Publicado', 'Inscrições', atendimentoLabel, 'Agendar compat.', 'Compat. realizada', 'Grupo criado', 'Contrato',
  ];

  const etapaIdx = etapa ? (ETAPA_TO_STEP[etapa] ?? 0) : 0;

  // Atendimento concluído: depende do tipo configurado no orçamento
  const atendimentoConcluido =
    tipoAtendimento === 'online'
      ? candidaturas.some(c => c.status_acompanhamento === 'reuniao_realizada')
      : tipoAtendimento === 'presencial'
        ? candidaturas.some(c => c.status_acompanhamento === 'visita_realizada')
        : candidaturas.some(c =>
            c.status_acompanhamento === 'visita_realizada' ||
            c.status_acompanhamento === 'reuniao_realizada',
          );

  const stepDone: boolean[] = [
    true,                                            // 0 Publicado
    candidaturas.length > 0,                         // 1 Inscrições (>= 1 inscrita)
    atendimentoConcluido,                            // 2 Visita/Reunião realizada
    candidaturas.some(c => c.proposta_enviada),      // 3 Orçamentos (>= 1 proposta enviada)
    hasCompatReq,                                    // 4 Compat. (cliente solicitou)
    etapaIdx >= 5,                                   // 5 Aprovação (consultor registrou)
    etapaIdx >= 6,                                   // 6 Contrato (fechado)
  ];

  // Enforce sequência: se step N não está done, todos N+1..6 também não podem estar
  for (let i = 1; i < stepDone.length; i++) {
    if (!stepDone[i - 1]) stepDone[i] = false;
  }

  // currentIdx = primeiro step ainda não concluído
  const firstNotDone = stepDone.findIndex(d => !d);
  const currentIdx   = firstNotDone === -1 ? stepDefs.length : firstNotDone;

  const steps: Rota100TrilhaStep[] = stepDefs.map((label, i) => ({
    label,
    status: stepDone[i] ? 'done' : i === currentIdx ? 'current' : 'pending',
  }));

  // progresso = (etapas concluídas / 7) * 100, arredondado
  const lastDoneIdx = stepDone.lastIndexOf(true);
  const percentual  = lastDoneIdx >= 0 ? Math.round((lastDoneIdx + 1) / 7 * 100) : 5;

  // status baseado no último step concluído
  const etapaAtual  = lastDoneIdx >= 0 ? STEP_STATUS_LABEL[lastDoneIdx] : 'Publicado';

  const publicDate = new Date(dataPublic);

  return {
    percentual,
    etapaAtual,
    iniciadoEm: format(publicDate, 'dd/MM/yyyy', { locale: ptBR }),
    dia:        Math.max(1, differenceInDays(new Date(), publicDate) + 1),
    diasMeta:   prazo ?? 8,
    steps,
  };
}

function buildChecklist(
  etapa:           EtapaCRM,
  dataPublic:      string,
  candidaturas:    any[],
  tipoAtendimento: TipoAtendimento,
): Rota100ChecklistItem[] {
  const currentIdx   = etapa ? (ETAPA_TO_STEP[etapa] ?? 0) : 0;
  const numInscritos = candidaturas.length;
  const numPropostas = candidaturas.filter((c: any) => c.proposta_enviada).length;
  const dataFmt      = format(new Date(dataPublic), 'dd/MM/yyyy', { locale: ptBR });

  const stepStatus = (stepIdx: number): 'done' | 'current' | 'pending' | 'future' => {
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    if (stepIdx === currentIdx + 1) return 'pending';
    return 'future';
  };

  // Textos dinâmicos do atendimento técnico
  const isOnline   = tipoAtendimento === 'online';
  const nomeEvento = isOnline ? 'Reunião online' : 'Visita presencial';
  const nomeEventoMin = isOnline ? 'reunião' : 'visita';

  const statusRealizados = isOnline
    ? ['reuniao_realizada']
    : tipoAtendimento === 'presencial'
      ? ['visita_realizada']
      : ['visita_realizada', 'reuniao_realizada'];

  const statusAgendados = isOnline
    ? ['reuniao_agendada']
    : tipoAtendimento === 'presencial'
      ? ['visita_agendada']
      : ['visita_agendada', 'reuniao_agendada'];

  const numRealizados = candidaturas.filter(c => statusRealizados.includes(c.status_acompanhamento)).length;
  const numAgendados  = candidaturas.filter(c => statusAgendados.includes(c.status_acompanhamento)).length;
  const atendConcluido = numRealizados > 0;
  const atendAgendado  = numAgendados > 0;

  // Label e status do step de atendimento (por empresa, sem data global)
  const atendLabel =
    atendConcluido
      ? `${nomeEvento}${numRealizados > 1 ? 's' : ''} realizadas (${numRealizados} empresa${numRealizados > 1 ? 's' : ''})`
      : atendAgendado
        ? `${nomeEvento} agendada (${numAgendados} empresa${numAgendados > 1 ? 's' : ''})`
        : `${nomeEvento} com as empresas`;

  const atendMeta =
    atendConcluido ? `${numInscritos} empresa${numInscritos > 1 ? 's' : ''} no processo`
    : atendAgendado ? `${numAgendados} empresa${numAgendados > 1 ? 's' : ''} confirmada${numAgendados > 1 ? 's' : ''}`
    : `Aguardando agendamento da ${nomeEventoMin}`;

  const atendStatus: Rota100ChecklistItem['status'] =
    atendConcluido ? 'done'
    : atendAgendado ? 'current'
    : stepStatus(2);

  return [
    {
      label:  'Solicitação publicada',
      meta:   dataFmt,
      status: 'done',
    },
    {
      label:  numInscritos > 0
        ? `${numInscritos} empresa${numInscritos > 1 ? 's' : ''} inscrita${numInscritos > 1 ? 's' : ''} e contatadas`
        : 'Aguardando inscrição de empresas',
      meta:   numInscritos > 0 ? `${numInscritos} inscrita${numInscritos > 1 ? 's' : ''}` : '',
      status: numInscritos > 0 ? 'done' : stepStatus(1),
      label2: numInscritos > 0 ? String(numInscritos) : undefined,
    },
    {
      label:  atendLabel,
      meta:   atendMeta,
      status: atendStatus,
    },
    {
      label:  numPropostas > 0
        ? `Orçamentos recebidos (${numPropostas} de ${numInscritos})`
        : 'Orçamentos em elaboração',
      meta:   numPropostas > 0 && numPropostas < numInscritos
        ? `Aguardando ${numInscritos - numPropostas} empresa${numInscritos - numPropostas > 1 ? 's' : ''}`
        : '',
      status: numPropostas > 0 ? (numPropostas === numInscritos ? 'done' : 'current') : stepStatus(3),
      label2: numPropostas > 0 ? `${numPropostas}/${numInscritos}` : undefined,
    },
    {
      label:  'Compatibilização gerada pela IA',
      meta:   'Disponível após aceitar seguir com uma ou mais empresas',
      status: currentIdx >= 4 ? 'done' : stepStatus(4),
    },
    {
      label:  'Aprovação da proposta',
      meta:   '',
      status: currentIdx >= 5 ? 'done' : 'future',
    },
    {
      label:  'Contrato assinado — início da obra',
      meta:   '',
      status: currentIdx >= 6 ? 'done' : 'future',
    },
  ];
}

function buildEscopo(necessidade: string, categorias: string[]): Rota100Escopo {
  const itens = necessidade
    ? necessidade
        .split(/[.\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 10)
        .slice(0, 6)
    : [];

  return {
    itens:        itens.length > 0 ? itens : [necessidade],
    foraDoEscopo: '',
    tags:         categorias,
  };
}

function buildEmpresas(candidaturas: any[], tipoAtendimento: TipoAtendimento, horariosByCand: Record<string, string> = {}): Rota100Empresa[] {
  const atendimentoLabel = tipoAtendimento === 'online' ? 'Reunião' : 'Visita';
  const empStepLabels    = ['Inscrita', 'Contato', atendimentoLabel, 'Orçando', 'Enviado'];

  // Status de atendimento agendado/realizado para qualquer tipo configurado
  const STATUS_ATEND_REALIZADO = ['visita_realizada', 'reuniao_realizada'];
  const STATUS_ATEND_AGENDADO  = ['visita_agendada',  'reuniao_agendada'];
  const STATUS_ATEND_QUALQUER  = [...STATUS_ATEND_REALIZADO, ...STATUS_ATEND_AGENDADO];

  return candidaturas.map((c: any, i: number) => {
    const propostaEnviada = !!c.proposta_enviada;
    const status          = c.status_acompanhamento ?? '';

    // Progresso granular em ordem crescente:
    // inscrita(15) → contato(35) → agendada(50) → realizada(65) → em_orcamento(75) → apresentado(87) → enviado(100)
    const progressoMap: Record<string, number> = {
      reuniao_agendada:      50,
      visita_agendada:       50,
      reuniao_realizada:     65,
      visita_realizada:      65,
      em_orcamento:          75,
      orcamento_apresentado: 87,
    };
    const temContato = !!(status && status !== 'sem_contato');
    const progresso  = propostaEnviada
      ? 100
      : progressoMap[status] ?? (temContato ? 35 : 15);

    // Mini step bar (5 barras fixas, sem mudança visual)
    const atendRealizado = STATUS_ATEND_REALIZADO.includes(status);
    const atendAgendado  = STATUS_ATEND_QUALQUER.includes(status);
    const emOrcamento    = status === 'em_orcamento' || status === 'orcamento_apresentado';

    // Step 3 (Visita/Reunião) = done se houve atendimento OU se já está em etapa posterior
    const atendLogicamenteConcluido = atendRealizado || emOrcamento || propostaEnviada;

    const stepStatuses: string[] = [
      'done',
      temContato                                                   ? 'done' : '',
      atendAgendado || atendLogicamenteConcluido                   ? 'done' : '',
      propostaEnviada ? 'done' : (emOrcamento                     ? 'cur'  : ''),
      propostaEnviada                                              ? 'done' : '',
    ];

    // Texto de status mais granular
    const statusTexto =
      propostaEnviada          ? 'Orçamento enviado'       :
      status === 'orcamento_apresentado' ? 'Orçamento apresentado' :
      status === 'em_orcamento'          ? 'Orçamento em elaboração' :
      atendRealizado           ? `${atendimentoLabel} realizada`   :
      STATUS_ATEND_AGENDADO.includes(status) ? `${atendimentoLabel} agendada` :
      temContato               ? 'Em contato'              : 'Aguardando contato';

    const statusType: 'done' | 'current' | 'pending' =
      propostaEnviada ? 'done' : (atendRealizado || emOrcamento ? 'current' : 'pending');

    const nomeEmpresa = c.empresa || c.nome || 'Empresa';
    const initials    = nomeEmpresa
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('');

    return {
      id:          c.id,
      initials:    initials || '?',
      bgColor:     AVATAR_COLORS[i % AVATAR_COLORS.length],
      nome:        nomeEmpresa,
      inscritaEm:  c.data_candidatura
        ? format(new Date(c.data_candidatura), 'dd/MM/yyyy', { locale: ptBR })
        : '—',
      status:      statusTexto,
      statusType,
      propostaEnviada,
      valor:       '—',
      composicao:
        propostaEnviada                    ? 'Proposta disponível'      :
        status === 'orcamento_apresentado' ? 'Proposta apresentada'     :
        status === 'em_orcamento'          ? 'Orçamento em elaboração'  : 'Em elaboração',
      progresso,
      prazo:       'A definir',
      stepLabels:  empStepLabels,
      stepStatuses: stepStatuses as readonly string[],
      tokenVisita:        (c.token_visita as string | null) ?? null,
      linkReuniao:        (c.link_reuniao as string | null) ?? null,
      visitaConfirmadaEm: (c.visita_confirmada_em as string | null) ?? null,
      preConfirmadoEm:    (c.pre_confirmado_em as string | null) ?? null,
      statusAcompanhamento: status || null,
      dataHora:           horariosByCand[c.id] ?? null,
    };
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRota100Data(token: string) {
  const [data,     setData]     = useState<Rota100Data | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const { data: resp, error: fnError } = await (supabase as any)
          .functions.invoke('rota100-dados', { body: { token } });

        if (cancelled) return;

        if (fnError || !resp || resp.error) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }

        const orc          = resp.orcamento;
        const candidaturas = (resp.candidaturas ?? []) as any[];
        const horariosList = (resp.horarios     ?? []) as any[];
        const trackingData = resp.tracking ?? null;
        const hasCompatReq = !!resp.hasCompatReq;

        const horariosByCand: Record<string, string> = {};
        horariosList.forEach((h: any) => {
          if (h.candidatura_id && !horariosByCand[h.candidatura_id]) {
            horariosByCand[h.candidatura_id] = h.data_hora;
          }
        });

        const etapa           = (trackingData?.etapa_crm ?? null) as EtapaCRM;
        const dadosContato    = orc.dados_contato ?? {};
        const categorias      = orc.categorias ?? [];
        const dataPub         = orc.data_publicacao ?? orc.created_at;
        const tipoAtendimento = (orc.tipo_atendimento_tecnico ?? null) as TipoAtendimento;
        const dataAtendimento = (orc.data_atendimento_tecnico ?? null) as string | null;
        const horaAtendimento = (orc.hora_atendimento_tecnico ?? null) as string | null;

        const cliente: Rota100Cliente = {
          nome:      dadosContato.nome ?? 'Cliente',
          cidade:    orc.local ?? '',
          imovel:    orc.tamanho_imovel ? `${orc.tamanho_imovel}m²` : 'Imóvel',
          descricao: orc.necessidade
            ? orc.necessidade.slice(0, 120) + (orc.necessidade.length > 120 ? '…' : '')
            : '',
          tags: categorias,
        };

        setData({
          orcamentoId:     orc.id,
          tipoAtendimento,
          dataAtendimento,
          horaAtendimento,
          cliente,
          trilha:    buildTrilha(etapa, dataPub, orc.prazo_envio_proposta_dias, candidaturas, hasCompatReq, tipoAtendimento),
          checklist: buildChecklist(etapa, dataPub, candidaturas, tipoAtendimento),
          escopo:    buildEscopo(orc.necessidade ?? '', categorias),
          empresas:  buildEmpresas(candidaturas, tipoAtendimento, horariosByCand),
        });
      } catch (err) {
        console.error('[useRota100Data]', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  return { data, loading, notFound };
}
