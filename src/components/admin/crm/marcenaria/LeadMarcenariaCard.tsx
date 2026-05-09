import { LeadMarcenariaComChecklist } from "@/types/crmMarcenaria";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/admin/crm/TagBadge";
import { TagSelector } from "@/components/admin/crm/TagSelector";
import { Lock, Calendar, User, MessageSquare, FileText, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EtapaConfig } from "@/hooks/useEtapasConfig";

interface LeadMarcenáriaCardProps {
  lead: LeadMarcenariaComChecklist;
  onClick: () => void;
  bloqueado?: boolean;
  configEtapa?: EtapaConfig;
}

export function LeadMarcenáriaCard({ lead, onClick, bloqueado, configEtapa }: LeadMarcenáriaCardProps) {
  const podeVisualizar = !lead.bloqueado;
  const diasRestantes = lead.data_desbloqueio 
    ? Math.ceil((new Date(lead.data_desbloqueio).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Verificar se está em atraso (lead time excedido)
  const estaEmAtraso = configEtapa?.dias_limite && 
                       lead.dias_na_etapa_atual > configEtapa.dias_limite;

  // Lógica de cores baseada em tarefas e lead time
  const getCardStyle = () => {
    // Bloqueado tem prioridade
    if (!podeVisualizar) {
      return 'opacity-60 cursor-not-allowed bg-muted';
    }
    
    // Lead time excedido tem prioridade sobre tarefas
    if (estaEmAtraso) {
      return `hover:shadow-md cursor-pointer ${configEtapa?.cor_atraso || 'bg-red-100 border-red-500 border-2'}`;
    }
    
    // Tarefas atrasadas (AMARELO)
    if (lead.tarefas_atrasadas && lead.tarefas_atrasadas > 0) {
      return 'hover:shadow-md cursor-pointer bg-yellow-50 border-yellow-500 border-2';
    }
    
    // Tarefas para hoje (AZUL)
    if (lead.tarefas_hoje && lead.tarefas_hoje > 0) {
      return 'hover:shadow-md cursor-pointer bg-blue-50 border-blue-500 border-2';
    }
    
    // Normal
    return 'hover:shadow-md cursor-pointer hover:border-primary/50';
  };

  return (
    <Card
      className={`p-3 space-y-2 transition-all ${getCardStyle()}`}
      onClick={podeVisualizar ? onClick : undefined}
    >
      {/* Bloqueio */}
      {lead.bloqueado && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
          <Lock className="h-3 w-3" />
          <span>Desbloqueado em {diasRestantes} dias</span>
        </div>
      )}

      {/* Cliente */}
      <div className="space-y-1">
        <p className="font-semibold text-sm">{lead.cliente_nome || 'Cliente sem nome'}</p>
        {lead.codigo_orcamento && (
          <p className="text-xs text-muted-foreground">#{lead.codigo_orcamento}</p>
        )}
      </div>

      {/* Informações principais */}
      <div className="space-y-1 text-xs">
        {lead.necessidade && (
          <p className="truncate text-muted-foreground">{lead.necessidade}</p>
        )}
      {lead.local && (
        <p className="text-muted-foreground flex items-center gap-1">
          📍 {lead.local}
        </p>
      )}
      {lead.valor_estimado && (
        <p className="font-semibold text-green-600 flex items-center gap-1">
          💰 {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(lead.valor_estimado)}
        </p>
      )}
    </div>

      {/* Consultor responsável */}
      {lead.consultor_nome && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{lead.consultor_nome}</span>
        </div>
      )}

      {/* Tags e badges */}
      <div className="flex flex-wrap gap-1">
        {/* Badge de Lead Time Excedido */}
        {estaEmAtraso && configEtapa && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Lead time excedido ({lead.dias_na_etapa_atual}/{configEtapa.dias_limite}d)
          </Badge>
        )}

        {/* Tarefas atrasadas */}
        {lead.tarefas_atrasadas > 0 && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lead.tarefas_atrasadas} atrasada{lead.tarefas_atrasadas > 1 ? 's' : ''}
          </Badge>
        )}

        {/* Tarefas para hoje */}
        {lead.tarefas_hoje > 0 && (
          <Badge className="text-xs gap-1 bg-blue-600">
            <Clock className="h-3 w-3" />
            {lead.tarefas_hoje} hoje
          </Badge>
        )}

        {/* Badge SEM tarefas - novo */}
        {lead.total_tarefas === 0 && !lead.bloqueado && (
          <Badge variant="outline" className="text-xs gap-1 bg-orange-100 border-orange-400 text-orange-700">
            <AlertTriangle className="h-3 w-3" />
            Sem tarefas
          </Badge>
        )}

        {/* Total de tarefas */}
        {lead.total_tarefas > 0 && (
          <Badge variant="outline" className="text-xs">
            ✓ {lead.tarefas_concluidas}/{lead.total_tarefas}
          </Badge>
        )}
        
        {/* Alerta de checklist pendente */}
        {lead.tem_alerta_checklist && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lead.checklist_pendentes} Pendente{lead.checklist_pendentes > 1 ? 's' : ''}
          </Badge>
        )}

        {/* Progresso do checklist */}
        {lead.checklist_total > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {lead.checklist_concluidos}/{lead.checklist_total}
          </Badge>
        )}

        {/* Briefing preenchido */}
        {lead.ambientes_mobiliar && lead.ambientes_mobiliar.length > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Briefing
          </Badge>
        )}

        {/* Projeto enviado */}
        {lead.projeto_url && (
          <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10">
            <FileText className="h-3 w-3" />
            Projeto
          </Badge>
        )}

        {/* Mensagens enviadas */}
        {(lead.mensagem_1_enviada || lead.mensagem_2_enviada || lead.mensagem_3_enviada) && (
          <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10">
            <MessageSquare className="h-3 w-3" />
            Msg
          </Badge>
        )}

        {/* Notas */}
        {lead.total_notas > 0 && (
          <Badge variant="outline" className="text-xs">
            {lead.total_notas} nota{lead.total_notas > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {podeVisualizar && (
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {lead.tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          )}
          
          <TagSelector 
            orcamentoId={lead.id} 
            tagsAtuais={lead.tags || []}
            tipo="marcenaria"
          />
        </div>
      )}

      {/* Última Nota */}
      {podeVisualizar && (
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <label className="text-xs font-medium mb-1 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Última Nota
          </label>
          
          {lead.ultima_nota_conteudo ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                "{lead.ultima_nota_conteudo}"
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {lead.ultima_nota_autor}
                <span>•</span>
                {format(new Date(lead.ultima_nota_data!), "dd/MM 'às' HH:mm", { locale: ptBR })}
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
            {lead.ultima_nota_conteudo ? 'Ver todas as notas' : 'Adicionar nota'}
          </Button>
        </div>
      )}

      {/* Tempo desde criação */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
        <Calendar className="h-3 w-3" />
        <span>
          {formatDistanceToNow(new Date(lead.created_at), {
            addSuffix: true,
            locale: ptBR
          })}
        </span>
      </div>
    </Card>
  );
}
