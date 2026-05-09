import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, GripVertical, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';

interface EtapaConfigCardProps {
  etapa: EtapaConfig;
  onEdit: () => void;
  onToggleAtivo: () => void;
  isDragging?: boolean;
}

export function EtapaConfigCard({ etapa, onEdit, onToggleAtivo, isDragging = false }: EtapaConfigCardProps) {
  return (
    <Card className={`p-4 transition-all ${isDragging ? 'opacity-50 rotate-2' : 'hover:shadow-md'}`}>
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Preview da Cor + Ícone */}
        <div 
          className={`w-12 h-12 rounded-lg ${etapa.cor} flex items-center justify-center text-2xl flex-shrink-0`}
        >
          {etapa.icone}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-foreground truncate">{etapa.titulo}</h4>
            {etapa.tipo === 'arquivado' && (
              <Badge variant="secondary" className="text-xs">Arquivado</Badge>
            )}
            {etapa.bloqueado && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}
            {etapa.dias_limite && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                ⏱️ {etapa.dias_limite} dias
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {etapa.descricao || 'Sem descrição'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Código: <code className="bg-muted px-1 py-0.5 rounded">{etapa.valor}</code>
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {etapa.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <Switch
              checked={etapa.ativo}
              onCheckedChange={onToggleAtivo}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}