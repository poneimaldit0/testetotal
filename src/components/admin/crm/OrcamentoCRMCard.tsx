import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  const cardClassName = cn(
    "p-4 hover:shadow-lg transition-all cursor-pointer relative",
    orcamento.congelado && "opacity-60 bg-blue-50 border-blue-200 border-dashed border-2",
    modoSelecao && isSelected && "border-2 border-primary bg-primary/5",
    !modoSelecao && !orcamento.congelado && estaEmAtraso && (configEtapa?.cor_atraso || "bg-red-100 border-red-500 border-2"),
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas > 0 && "border-2 border-yellow-500 bg-yellow-50",
    !modoSelecao && !orcamento.congelado && !estaEmAtraso && orcamento.tarefas_atrasadas === 0 && orcamento.tarefas_hoje > 0 && "border-2 border-blue-500 bg-blue-50"
  );

  return (
    <Card className={cardClassName}>
      {onToggleSelect && (
        <div className="absolute top-3 right-3 z-10 hover:scale-110 transition-transform" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </div>
      )}
      
      <div onClick={onClick}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-lg">
                {orcamento.dados_contato?.nome || 'Cliente sem nome'}
              </h3>
              
              {orcamento.valor_lead_estimado && (
                <Badge variant="secondary" className="gap-1">
                  <DollarSign className="w-3 h-3" />
                  {formatarMoeda(orcamento.valor_lead_estimado)}
                </Badge>
              )}
              
              {/* Badge de Congelado */}
              {orcamento.congelado && orcamento.data_reativacao_prevista && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
                  <Snowflake className="w-3 h-3" />
                  Até {format(new Date(orcamento.data_reativacao_prevista), 'dd/MM', { locale: ptBR })}
                </Badge>
              )}
              
              <StatusChecklistBadge 
                total={orcamento.total_itens_checklist}
                concluidos={orcamento.itens_checklist_concluidos}
                temAlertas={orcamento.tem_alertas}
              />
              
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {orcamento.tempo_na_etapa_dias}d
              </Badge>
              
              {/* Badge de Lead Time Excedido */}
              {estaEmAtraso && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Lead time excedido ({orcamento.tempo_na_etapa_dias}/{configEtapa.dias_limite}d)
                </Badge>
              )}
              
              {/* Badges de Tarefas */}
              {/* Badge SEM tarefas - novo */}
              {orcamento.total_tarefas === 0 && (
                <Badge variant="outline" className="text-xs gap-1 bg-orange-100 border-orange-400 text-orange-700">
                  <AlertTriangle className="h-3 w-3" />
                  Sem tarefas
                </Badge>
              )}
              
              {orcamento.tarefas_atrasadas > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  {orcamento.tarefas_atrasadas} atrasada{orcamento.tarefas_atrasadas > 1 ? 's' : ''}
                </Badge>
              )}
              
              {orcamento.tarefas_hoje > 0 && (
                <Badge className="gap-1 text-xs bg-blue-600">
                  <Clock className="w-3 h-3" />
                  {orcamento.tarefas_hoje} hoje
                </Badge>
              )}
              
              {orcamento.total_tarefas > 0 && (
                <Badge variant="outline" className="text-xs">
                  ✓ {orcamento.tarefas_concluidas}/{orcamento.total_tarefas}
                </Badge>
              )}
              
            </div>
            <p className="text-sm text-muted-foreground">
              #{orcamento.codigo_orcamento || orcamento.id.slice(0, 8)}
            </p>
          </div>
          <Badge variant="outline">{orcamento.fornecedores_inscritos_count ?? 0} inscritos</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{orcamento.local}</span>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {orcamento.necessidade}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {orcamento.categorias.map((cat, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3 w-3" />
          {format(new Date(orcamento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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

      <div className="mt-3 pt-3 border-t flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          id={`contato-${orcamento.id}`}
          checked={orcamento.status_contato !== 'sem_contato'}
          onCheckedChange={(checked) => {
            const novoStatus = checked ? 'em_contato' : 'sem_contato';
            onAtualizarStatusContato(orcamento.id, novoStatus as StatusContato);
          }}
        />
        <label 
          htmlFor={`contato-${orcamento.id}`}
          className="text-sm font-medium cursor-pointer"
        >
          Contato realizado
        </label>
      </div>

      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs font-medium mb-1 block">Valor Estimado do Lead (R$)</label>
        {editandoValorLead ? (
          <div className="space-y-2">
            <Input
              type="text"
              value={valorLead}
              onChange={(e) => setValorLead(e.target.value)}
              placeholder="Ex: 50000"
              className="text-sm h-8"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSalvarValorLead}>
                Salvar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setValorLead(orcamento.valor_lead_estimado?.toString() || '');
                  setEditandoValorLead(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {orcamento.valor_lead_estimado ? (
              <p className="font-medium text-primary">
                {formatarMoeda(orcamento.valor_lead_estimado)}
              </p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
            <Button
              size="sm"
              variant="link"
              className="p-0 h-auto mt-1"
              onClick={() => setEditandoValorLead(true)}
            >
              {orcamento.valor_lead_estimado ? 'Editar' : 'Adicionar valor'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs font-medium mb-1 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Última Nota
        </label>
        
        {orcamento.ultima_nota_conteudo ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
              "{orcamento.ultima_nota_conteudo}"
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {orcamento.ultima_nota_autor}
              <span>•</span>
              {format(new Date(orcamento.ultima_nota_data!), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem notas ainda</p>
        )}
        
        <Button
          size="sm"
          variant="link"
          className="p-0 h-auto mt-1 text-xs"
          onClick={onClick}
        >
          {orcamento.ultima_nota_conteudo ? 'Ver todas as notas' : 'Adicionar nota'}
        </Button>
      </div>

      {orcamento.concierge_nome && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Concierge: {orcamento.concierge_nome}</span>
        </div>
      )}

      {onCompatibilizacao && (
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            onClick={onCompatibilizacao}
          >
            <BarChart2 className="h-3 w-3" />
            Compatibilização IA
          </Button>
        </div>
      )}

      {orcamento.rota100_token && (
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-medium mb-2 text-muted-foreground">Rota100 — painel do cliente</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs gap-1"
            asChild
          >
            <a
              href={`/rota100/${orcamento.rota100_token}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Rota100
            </a>
          </Button>
        </div>
      )}

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
