import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { crmEtapaColor } from '@/styles/tokens';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrcamentoCRMComChecklist, StatusContato } from '@/types/crm';
import { STATUS_CONTATO, isEtapaArquivada } from '@/constants/crmEtapas';
import { StatusChecklistBadge } from './StatusChecklistBadge';
import { TagBadge } from './TagBadge';
import { TagSelector } from './TagSelector';
import { MapPin, Calendar, User, Clock, AlertTriangle, DollarSign, MessageSquare, Snowflake, ExternalLink, BarChart2, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';
import { AgendamentoCompatModal } from '@/components/admin/consultor/AgendamentoCompatModal';

// Fase A do sprint admin UX: oculta a pill de valor_estimado_ia_medio
// no card do CRM Kanban. Dados continuam no banco — só sai da UI.
const MOSTRAR_VALOR_ESTIMATIVA_LEGADA = false;

// Rota100 % estimado por etapa CRM
const R100_PCT_POR_ETAPA: Record<string, number> = {
  orcamento_postado:    14,
  contato_agendamento:  29,
  em_orcamento:         43,
  propostas_enviadas:   57,
  compatibilizacao:     71,
  fechamento_contrato:  86,
  pos_venda_feedback:   100,
  ganho:                100,
  perdido:              100,
};

interface OrcamentoCRMCardProps {
  orcamento: OrcamentoCRMComChecklist;
  onAtualizarStatusContato: (orcamentoId: string, novoStatus: StatusContato) => void;
  onAtualizarValorLead: (orcamentoId: string, valor: number | null) => void;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  modoSelecao?: boolean;
  configEtapa?: EtapaConfig;
  onCompatibilizacao?: () => void;
}

export const OrcamentoCRMCard = ({
  orcamento,
  onAtualizarStatusContato,
  onAtualizarValorLead,
  onClick,
  isSelected = false,
  onToggleSelect,
  modoSelecao = false,
  configEtapa,
  onCompatibilizacao,
}: OrcamentoCRMCardProps) => {
  const [valorLead, setValorLead] = useState(orcamento.valor_lead_estimado?.toString() || '');
  const [editandoValorLead, setEditandoValorLead] = useState(false);
  // Sprint F: modal de agendamento da compatibilização (CTA premium sempre presente)
  const [agendamentoModalOpen, setAgendamentoModalOpen] = useState(false);

  const formatarMoeda = (valor: number | null) => {
    if (!valor) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleSalvarValorLead = () => {
    const valor = parseFloat(valorLead.replace(/[^\d,]/g, '').replace(',', '.'));
    onAtualizarValorLead(orcamento.id, isNaN(valor) ? null : valor);
    setEditandoValorLead(false);
  };

  // Verificar se está em atraso (lead time excedido)
  const estaEmAtraso = configEtapa?.dias_limite &&
                       orcamento.tempo_na_etapa_dias > configEtapa.dias_limite;

  // Sprint F (governança): pré-SDR = ainda não passou pela validação SDR.
  // Card aparece na carteira do consultor mas com peso visual reduzido.
  const isPreSDR = orcamento.etapa_crm === 'orcamento_postado'
                || orcamento.etapa_crm === 'contato_agendamento';

  const etapaBorderColor = configEtapa?.valor
    ? (crmEtapaColor[configEtapa.valor] ?? '#E5E7EB')
    : '#E5E7EB';

  const cardClassName = cn(
    "r100-card p-3 transition-all cursor-pointer relative",
    orcamento.congelado && "opacity-60 bg-blue-50 border-blue-200 border-dashed border-2",
    modoSelecao && isSelected && "border-2 border-primary bg-primary/5",
    !modoSelecao && !orcamento.congelado && estaEmAtraso && (configEtapa?.cor_atraso || "bg-red-100 border-red-500 border-2"),
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas > 0 && "border-2 border-yellow-500 bg-yellow-50",
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas === 0 && orcamento.tarefas_hoje > 0 && "border-2 border-blue-500 bg-blue-50",
    // Pré-SDR: peso visual reduzido (pipeline futuro, ainda não operacional)
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas === 0 && orcamento.tarefas_hoje === 0 && isPreSDR && "opacity-75"
  );

  return (
    <Card className={cardClassName} style={{ borderTop: `3px solid ${etapaBorderColor}`, borderRadius: 12 }}>
      {onToggleSelect && (
        <div className="absolute top-3 right-3 z-10 hover:scale-110 transition-transform" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </div>
      )}
      
      <div onClick={onClick}>
        {/* Header: nome + badge inscritos */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight r100-clamp-2 mb-1">
              {orcamento.dados_contato?.nome || 'Cliente sem nome'}
            </h3>
            <p className="text-xs text-muted-foreground">#{orcamento.codigo_orcamento || orcamento.id.slice(0, 8)}</p>
          </div>
          <span className="r100-pill r100-pill-gray flex-shrink-0">{orcamento.fornecedores_inscritos_count ?? 0} inscr.</span>
        </div>

        {/* Sprint F — Bloco compatibilização.
            Pré-SDR (sem visita validada): substitui CTA por badge "Aguardando SDR".
            Sem agendamento → CTA premium para o consultor agendar.
            Com agendamento → chip de estado, clicável para editar. */}
        {(() => {
          const p = orcamento.compatPendencia;
          const dataApres = orcamento.apresentacaoAgendadaEm
            ? format(new Date(orcamento.apresentacaoAgendadaEm), "dd/MM HH:mm", { locale: ptBR })
            : null;

          const semAgendamento = !orcamento.apresentacaoAgendadaEm && !p;

          // Governança: cards pré-SDR (etapa orcamento_postado / contato_agendamento)
          // ainda não estão liberados para o consultor agendar compat — falta
          // visita técnica validada. Renderizar badge informativo bloqueado.
          const isPreSDR = orcamento.etapa_crm === 'orcamento_postado'
                        || orcamento.etapa_crm === 'contato_agendamento';
          if (isPreSDR && semAgendamento) {
            return (
              <div
                className="mb-2 w-full"
                style={{
                  background: '#F9FAFB',
                  border: '1px dashed #D1D5DB',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: 0.85,
                }}
                title="Aguardando validação SDR — agendamento de compatibilização será liberado após visita técnica"
              >
                <span style={{
                  width: 28,
                  height: 28,
                  background: '#E5E7EB',
                  color: '#6B7280',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                }}>🔒</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    color: '#6B7280',
                    lineHeight: 1.2,
                  }}>
                    Pré-SDR
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#4B5563',
                    marginTop: 2,
                    lineHeight: 1.35,
                  }}>
                    Aguardando validação SDR
                  </div>
                </div>
              </div>
            );
          }

          const abrirAgendamento = (e: React.MouseEvent) => {
            e.stopPropagation();
            setAgendamentoModalOpen(true);
          };

          if (semAgendamento) {
            // CTA premium — chamativo, gradiente Isabella, sempre visível
            return (
              <button
                type="button"
                onClick={abrirAgendamento}
                title="Definir data da apresentação ao cliente — vira prazo dos fornecedores"
                className="mb-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 hover:border-primary/60 transition-all group r100-press"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-white shadow-sm flex-shrink-0">
                  <CalendarPlus className="w-4 h-4" />
                </span>
                <span className="flex-1 text-left text-xs font-semibold text-primary leading-tight">
                  Agendar compatibilização
                  <span className="block text-[10px] font-normal text-primary/70 mt-0.5">
                    Define o prazo dos fornecedores
                  </span>
                </span>
                <span className="text-primary text-base font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            );
          }

          // Já tem agendamento → bloco operacional destacado (não pill)
          // 4 tons conforme estado da apresentação
          let bg = 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)';
          let border = '#3B82F6';
          let txtMain = '#1E3A8A';
          let txtMuted = '#1E40AF';
          let icone = '📅';
          let titulo = 'Compatibilização agendada';
          let subtexto = 'Prazo final para fornecedores enviarem proposta';

          if (p === 'solicitada') {
            bg = 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)';
            border = '#EF4444';
            txtMain = '#7F1D1D';
            txtMuted = '#991B1B';
            icone = '⚡';
            titulo = 'Cliente solicitou compatibilização';
            subtexto = 'Agende a apresentação com urgência';
          } else if (p === 'reagendamento') {
            bg = 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)';
            border = '#F59E0B';
            txtMain = '#78350F';
            txtMuted = '#92400E';
            icone = '🕓';
            titulo = 'Reagendamento solicitado';
            subtexto = 'O cliente pediu nova data para a apresentação';
          } else if (p === 'confirmada') {
            bg = 'linear-gradient(135deg, #F0FDF4 0%, #BBF7D0 100%)';
            border = '#22C55E';
            txtMain = '#14532D';
            txtMuted = '#166534';
            icone = '✅';
            titulo = 'Apresentação confirmada';
            subtexto = 'Cliente confirmou — pronto para apresentar';
          } else if (p === 'realizada') {
            bg = 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)';
            border = '#9CA3AF';
            txtMain = '#374151';
            txtMuted = '#4B5563';
            icone = '✓';
            titulo = 'Apresentação realizada';
            subtexto = '';
          }

          return (
            <button
              type="button"
              onClick={abrirAgendamento}
              title={`${titulo}${dataApres ? ' — ' + dataApres : ''}. Clique para editar.`}
              className="mb-2 w-full text-left r100-press"
              style={{
                background: bg,
                border: `1px solid ${border}55`,
                borderLeft: `4px solid ${border}`,
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: 1,
                }}>{icone}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 12,
                    color: txtMain,
                    lineHeight: 1.3,
                    letterSpacing: '.01em',
                  }}>
                    {titulo}
                  </div>
                  {dataApres && (
                    <div style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: txtMain,
                      marginTop: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {dataApres}
                    </div>
                  )}
                  {subtexto && (
                    <div style={{
                      fontSize: 10.5,
                      color: txtMuted,
                      marginTop: 3,
                      lineHeight: 1.35,
                    }}>
                      {subtexto}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })()}

        {/* Status badges — max 4 visíveis por prioridade operacional (P5b) */}
        {(() => {
          type Pill = { key: string; el: React.ReactNode; tooltipLabel: string; priority: number };
          const pills: Pill[] = [];

          // 1. R100 % — sempre visível, prioridade máxima (referência rápida)
          const r100 = R100_PCT_POR_ETAPA[orcamento.etapa_crm] ?? 14;
          pills.push({
            key: 'r100',
            tooltipLabel: `Progresso Rota100: ${r100}%`,
            priority: 1,
            el: (
              <span className="r100-pill" title={`Rota100 ${r100}%`} style={{ background: '#F3E8FF', color: '#6B21A8', borderColor: '#D8B4FE', fontVariantNumeric: 'tabular-nums' }}>
                R100 {r100}%
              </span>
            ),
          });

          // 2. Tarefas atrasadas — urgente
          if (orcamento.tarefas_atrasadas > 0) {
            pills.push({
              key: 'atrasadas',
              tooltipLabel: `${orcamento.tarefas_atrasadas} tarefa(s) atrasada(s)`,
              priority: 2,
              el: (
                <span className="r100-pill r100-pill-red" title={`${orcamento.tarefas_atrasadas} atrasada(s)`}>
                  ⚠ {orcamento.tarefas_atrasadas} atrasada{orcamento.tarefas_atrasadas > 1 ? 's' : ''}
                </span>
              ),
            });
          }

          // 3. Tarefas hoje (não mostra se já tem atrasadas — menos crítico)
          if (orcamento.tarefas_hoje > 0 && orcamento.tarefas_atrasadas === 0) {
            pills.push({
              key: 'hoje',
              tooltipLabel: `${orcamento.tarefas_hoje} tarefa(s) para hoje`,
              priority: 3,
              el: <span className="r100-pill r100-pill-blue" title={`${orcamento.tarefas_hoje} para hoje`}>📅 {orcamento.tarefas_hoje} hoje</span>,
            });
          }

          // 4. Etapa em atraso — urgente
          if (estaEmAtraso) {
            pills.push({
              key: 'atraso-etapa',
              tooltipLabel: `Etapa em atraso: ${orcamento.tempo_na_etapa_dias} de ${configEtapa?.dias_limite} dias`,
              priority: 2,
              el: (
                <span className="r100-pill r100-pill-red" title={`${orcamento.tempo_na_etapa_dias}/${configEtapa?.dias_limite} dias`}>
                  <AlertTriangle className="w-3 h-3" /> {orcamento.tempo_na_etapa_dias}/{configEtapa?.dias_limite}d
                </span>
              ),
            });
          }

          // 5. Congelado
          if (orcamento.congelado && orcamento.data_reativacao_prevista) {
            const reat = format(new Date(orcamento.data_reativacao_prevista), 'dd/MM', { locale: ptBR });
            pills.push({
              key: 'congelado',
              tooltipLabel: `Congelado até ${reat}`,
              priority: 2,
              el: <span className="r100-pill r100-pill-blue" title={`Congelado até ${reat}`}><Snowflake className="w-3 h-3" />Até {reat}</span>,
            });
          }

          // 6. Sem tarefas — atenção
          if (orcamento.total_tarefas === 0) {
            pills.push({
              key: 'sem-tarefas',
              tooltipLabel: 'Sem tarefas cadastradas',
              priority: 4,
              el: <span className="r100-pill r100-pill-orange" title="Sem tarefas cadastradas"><AlertTriangle className="h-3 w-3" />Sem tarefas</span>,
            });
          }

          // 7. Tempo na etapa — informativo (prioridade baixa)
          pills.push({
            key: 'tempo',
            tooltipLabel: `${orcamento.tempo_na_etapa_dias} dia(s) na etapa atual`,
            priority: 5,
            el: <span className="r100-pill r100-pill-gray" title={`${orcamento.tempo_na_etapa_dias}d na etapa`}><Clock className="w-3 h-3" />{orcamento.tempo_na_etapa_dias}d</span>,
          });

          // 8. Checklist badge — informativo
          pills.push({
            key: 'checklist',
            tooltipLabel: `Checklist: ${orcamento.itens_checklist_concluidos}/${orcamento.total_itens_checklist}`,
            priority: 5,
            el: <StatusChecklistBadge total={orcamento.total_itens_checklist} concluidos={orcamento.itens_checklist_concluidos} temAlertas={orcamento.tem_alertas} />,
          });

          // 9. Tarefas concluídas — informativo
          if (orcamento.total_tarefas > 0) {
            pills.push({
              key: 'tarefas',
              tooltipLabel: `${orcamento.tarefas_concluidas} de ${orcamento.total_tarefas} tarefas concluídas`,
              priority: 6,
              el: <span className="r100-pill r100-pill-gray" title={`${orcamento.tarefas_concluidas}/${orcamento.total_tarefas} tarefas`}>✓ {orcamento.tarefas_concluidas}/{orcamento.total_tarefas}</span>,
            });
          }

          // 10. Valor estimado IA legado (oculto por flag)
          if (MOSTRAR_VALOR_ESTIMATIVA_LEGADA && orcamento.valor_estimado_ia_medio) {
            pills.push({
              key: 'valor-ia',
              tooltipLabel: `Estimativa IA: ${formatarMoeda(orcamento.valor_estimado_ia_medio)}`,
              priority: 7,
              el: <span className="r100-pill r100-pill-green"><DollarSign className="w-3 h-3" />{formatarMoeda(orcamento.valor_estimado_ia_medio)}</span>,
            });
          }

          // Ordenar por prioridade ASC e cortar 4 visíveis
          pills.sort((a, b) => a.priority - b.priority);
          const MAX_VISIVEIS = 4;
          const visiveis = pills.slice(0, MAX_VISIVEIS);
          const overflow = pills.slice(MAX_VISIVEIS);

          return (
            <div className="flex flex-wrap gap-1 mb-2">
              {visiveis.map(p => <span key={p.key}>{p.el}</span>)}
              {overflow.length > 0 && (
                <span
                  className="r100-pill r100-pill-gray cursor-help"
                  title={overflow.map(p => p.tooltipLabel).join('\n')}
                >
                  +{overflow.length}
                </span>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{orcamento.local}</span>
        </div>

        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {orcamento.necessidade}
        </p>

        {orcamento.categorias.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {orcamento.categorias.map((cat, idx) => (
              <span key={idx} className="r100-pill r100-pill-gray">{cat}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(orcamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
        {orcamento.tags && orcamento.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {orcamento.tags.map(tag => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )}
        
        <TagSelector 
          orcamentoId={orcamento.id} 
          tagsAtuais={orcamento.tags || []} 
        />
      </div>

      {/* Contato + valor — linha compacta */}
      <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`contato-${orcamento.id}`}
            checked={orcamento.status_contato !== 'sem_contato'}
            onCheckedChange={(checked) => {
              onAtualizarStatusContato(orcamento.id, (checked ? 'em_contato' : 'sem_contato') as StatusContato);
            }}
          />
          <label htmlFor={`contato-${orcamento.id}`} className="text-xs font-medium cursor-pointer">
            Contato
          </label>
        </div>
        {editandoValorLead ? (
          <div className="flex items-center gap-1 flex-1 ml-2">
            <Input
              type="text"
              value={valorLead}
              onChange={(e) => setValorLead(e.target.value)}
              placeholder="Ex: 50000"
              className="text-xs h-6 px-2"
            />
            <Button size="sm" className="h-6 text-xs px-2" onClick={handleSalvarValorLead}>✓</Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setValorLead(orcamento.valor_lead_estimado?.toString() || ''); setEditandoValorLead(false); }}>✕</Button>
          </div>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setEditandoValorLead(true)}
          >
            {orcamento.valor_lead_estimado ? `${formatarMoeda(orcamento.valor_lead_estimado)} (edit.)` : '+ valor'}
          </button>
        )}
      </div>

      {/* Última nota — compact */}
      {orcamento.ultima_nota_conteudo && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 px-2 py-1.5 rounded-md italic leading-relaxed">
            "{orcamento.ultima_nota_conteudo}"
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <User className="h-3 w-3" />
            {orcamento.ultima_nota_autor} · {format(new Date(orcamento.ultima_nota_data!), "dd/MM", { locale: ptBR })}
          </div>
        </div>
      )}

      {/* Footer: concierge + ações */}
      <div className="mt-2 pt-2 border-t flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {orcamento.concierge_nome && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-1 min-w-0">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{orcamento.concierge_nome}</span>
          </span>
        )}
        {onCompatibilizacao && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-2"
            onClick={onCompatibilizacao}
          >
            <BarChart2 className="h-3 w-3" />
            Compat.
          </Button>
        )}
        {orcamento.rota100_token && (
          <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" asChild>
            <a href={`/rota100/${orcamento.rota100_token}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Rota100
            </a>
          </Button>
        )}
      </div>

      {/* Info compacta de arquivado */}
      {isEtapaArquivada(orcamento.etapa_crm) && (
        <div className="mt-3 pt-3 border-t text-sm">
          {orcamento.etapa_crm === 'perdido' ? (
            <div className="space-y-1">
              <p className="font-semibold text-destructive">❌ Perdido</p>
              {orcamento.motivo_perda_nome && (
                <p className="text-xs text-muted-foreground">
                  Motivo: {orcamento.motivo_perda_nome}
                </p>
              )}
              {orcamento.data_conclusao && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(orcamento.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="font-semibold text-green-600">✅ Ganho</p>
              {orcamento.data_conclusao && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(orcamento.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sprint F — Modal de agendamento (anexa fora do onClick do card) */}
      <AgendamentoCompatModal
        orcamentoId={orcamento.id}
        nomeOrcamento={orcamento.dados_contato?.nome ?? orcamento.codigo_orcamento ?? undefined}
        open={agendamentoModalOpen}
        onOpenChange={setAgendamentoModalOpen}
      />
    </Card>
  );
};
