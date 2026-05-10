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

        {/* Status badges — compact secondary row */}
        <div className="flex flex-wrap gap-1 mb-2">
          {orcamento.valor_estimado_ia_medio ? (
            <span className="r100-pill r100-pill-green"><DollarSign className="w-3 h-3" />{formatarMoeda(orcamento.valor_estimado_ia_medio)}</span>
          ) : orcamento.valor_lead_estimado ? (
            <span className="r100-pill r100-pill-gray"><DollarSign className="w-3 h-3" />{formatarMoeda(orcamento.valor_lead_estimado)}</span>
          ) : null}
          {orcamento.congelado && orcamento.data_reativacao_prevista && (
            <span className="r100-pill r100-pill-blue"><Snowflake className="w-3 h-3" />Até {format(new Date(orcamento.data_reativacao_prevista), 'dd/MM', { locale: ptBR })}</span>
          )}
          <span className="r100-pill r100-pill-gray"><Clock className="w-3 h-3" />{orcamento.tempo_na_etapa_dias}d</span>
          <StatusChecklistBadge total={orcamento.total_itens_checklist} concluidos={orcamento.itens_checklist_concluidos} temAlertas={orcamento.tem_alertas} />
          {estaEmAtraso && (
            <span className="r100-pill r100-pill-red"><AlertTriangle className="w-3 h-3" />{orcamento.tempo_na_etapa_dias}/{configEtapa.dias_limite}d</span>
          )}
          {orcamento.total_tarefas === 0 && (
            <span className="r100-pill r100-pill-orange"><AlertTriangle className="h-3 w-3" />Sem tarefas</span>
          )}
          {orcamento.tarefas_atrasadas > 0 && (
            <span className="r100-pill r100-pill-red">{orcamento.tarefas_atrasadas} atrasada{orcamento.tarefas_atrasadas > 1 ? 's' : ''}</span>
          )}
          {orcamento.tarefas_hoje > 0 && (
            <span className="r100-pill r100-pill-blue">{orcamento.tarefas_hoje} hoje</span>
          )}
          {orcamento.total_tarefas > 0 && (
            <span className="r100-pill r100-pill-gray">✓ {orcamento.tarefas_concluidas}/{orcamento.total_tarefas}</span>
          )}
        </div>

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
