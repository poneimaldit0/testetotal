import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Clock } from 'lucide-react';
import { useChecklistsAdmin, type ChecklistItem } from '@/hooks/useChecklistsAdmin';
import { ETAPAS_CRM } from '@/constants/crmEtapas';
import { ETAPAS_MARCENARIA } from '@/constants/crmMarcenaria';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ItemChecklistCardProps {
  item: ChecklistItem;
  tipoCRM: 'orcamentos' | 'marcenaria';
  onEdit: () => void;
}

export function ItemChecklistCard({ item, tipoCRM, onEdit }: ItemChecklistCardProps) {
  const { deleteItem, toggleAtivo, isPending } = useChecklistsAdmin(tipoCRM);

  const etapas = tipoCRM === 'orcamentos' ? ETAPAS_CRM : ETAPAS_MARCENARIA;
  const etapaValor = tipoCRM === 'orcamentos' 
    ? (item as any).etapa_crm 
    : (item as any).etapa_marcenaria;
  const configEtapa = etapas.find(e => e.valor === etapaValor);

  return (
    <Card className={`p-4 ${!item.ativo ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              style={{ 
                borderColor: configEtapa?.cor,
                color: configEtapa?.cor 
              }}
            >
              {configEtapa?.titulo || etapaValor}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Ordem: {item.ordem}
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {item.dias_para_alerta} {item.dias_para_alerta === 1 ? 'dia' : 'dias'} para alerta
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">{item.titulo}</h4>
            {item.descricao && (
              <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {item.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <Switch
              checked={item.ativo}
              onCheckedChange={(checked) => toggleAtivo({ id: item.id, ativo: checked })}
              disabled={isPending}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={isPending}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este item de checklist? Esta ação não pode ser desfeita.
                  <br /><br />
                  <strong>Importante:</strong> Itens de checklist já existentes em orçamentos/leads não serão afetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteItem(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
