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
import { MapPin, Calendar, User, Clock, AlertTriangle, DollarSign, MessageSquare, Snowflake, ExternalLink, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';

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

  const etapaBorderColor = configEtapa?.valor
    ? (crmEtapaColor[configEtapa.valor] ?? '#E5E7EB')
    : '#E5E7EB';

  const cardClassName = cn(
    "r100-card p-3 transition-all cursor-pointer relative",
    orcamento.congelado && "opacity-60 bg-blue-50 border-blue-200 border-dashed border-2",
    modoSelecao && isSelected && "border-2 border-primary bg-primary/5",
    !modoSelecao && !orcamento.congelado && estaEmAtraso && (configEtapa?.cor_atraso || "bg-red-100 border-red-500 border-2"),
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas > 0 && "border-2 border-yellow-500 bg-yellow-50",
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas === 0 && orcamento.tarefas_hoje > 0 && "border-2 border-blue-500 bg-blue-50"
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

        {/* Sprint C — mini-bloco compatibilização (alta visibilidade, 1 linha) */}
        {(() => {
          const p = orcamento.compatPendencia;
          if (!p) return null;
          const dataApres = orcamento.apresentacaoAgendadaEm
            ? format(new Date(orcamento.apresentacaoAgendadaEm), "dd/MM HH:mm", { locale: ptBR })
            : null;
          let cls = 'r100-pill-gray';
          let label = '';
          let title = '';
          if (p === 'solicitada') {
            cls = 'r100-pill-red';
            label = 'Cliente solicitou compat.';
            title = 'Cliente pediu apresentação da compatibilização — agendar com urgência';
          } else if (p === 'reagendamento') {
            cls = 'r100-pill-amber';
            label = 'Reagendamento pedido';
            title = 'Cliente solicitou reagendar a apresentação';
          } else if (p === 'agendada') {
            cls = 'r100-pill-blue';
            label = dataApres ? `Compat. agendada · ${dataApres}` : 'Compat. agendada';
            title = 'Consultor agendou — aguardando confirmação do cliente';
          } else if (p === 'confirmada') {
            cls = 'r100-pill-green';
            label = dataApres ? `Apresentação confirmada · ${dataApres}` : 'Apresentação confirmada';
            title = 'Cliente confirmou a apresentação';
          } else if (p === 'realizada') {
            cls = 'r100-pill-gray';
            label = 'Apresentação realizada';
            title = 'Apresentação já foi realizada';
          }
          return (
            <div className="mb-2">
              <span className={`r100-pill ${cls}`} title={title}>{label}</span>
            </div>
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
    </Card>
  );
};
