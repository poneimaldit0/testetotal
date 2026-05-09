import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChecklistsAdmin } from '@/hooks/useChecklistsAdmin';
import { ETAPAS_CRM } from '@/constants/crmEtapas';
import { ETAPAS_MARCENARIA } from '@/constants/crmMarcenaria';
import { z } from 'zod';

interface NovoItemChecklistModalProps {
  open: boolean;
  onClose: () => void;
  tipoCRM: 'orcamentos' | 'marcenaria';
}

const checklistSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(100, 'Título deve ter no máximo 100 caracteres'),
  descricao: z.string().optional(),
  etapa: z.string().min(1, 'Selecione uma etapa'),
  dias_para_alerta: z.number().min(1, 'Deve ser no mínimo 1 dia').max(365, 'Máximo de 365 dias'),
  ordem: z.number().min(0, 'Ordem deve ser maior ou igual a 0'),
  ativo: z.boolean()
});

export function NovoItemChecklistModal({ open, onClose, tipoCRM }: NovoItemChecklistModalProps) {
  const { items, createItem, isPending } = useChecklistsAdmin(tipoCRM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    etapa: '',
    dias_para_alerta: 1,
    ordem: items.length > 0 ? Math.max(...items.map(i => i.ordem)) + 1 : 0,
    ativo: true
  });

  const etapas = tipoCRM === 'orcamentos' ? ETAPAS_CRM : ETAPAS_MARCENARIA;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = checklistSchema.parse(formData);
      const payload = {
        titulo: validated.titulo,
        descricao: validated.descricao,
        etapa: validated.etapa,
        dias_para_alerta: validated.dias_para_alerta,
        ordem: validated.ordem,
        ativo: validated.ativo
      };
      createItem(payload, {
        onSuccess: () => {
          onClose();
          setFormData({
            titulo: '',
            descricao: '',
            etapa: '',
            dias_para_alerta: 1,
            ordem: items.length > 0 ? Math.max(...items.map(i => i.ordem)) + 1 : 0,
            ativo: true
          });
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Item de Checklist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Confirmar dados do cliente"
              className={errors.titulo ? 'border-destructive' : ''}
            />
            {errors.titulo && <p className="text-sm text-destructive">{errors.titulo}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes sobre o que precisa ser feito..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa do CRM *</Label>
              <Select value={formData.etapa} onValueChange={(v) => setFormData({ ...formData, etapa: v })}>
                <SelectTrigger className={errors.etapa ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map(etapa => (
                    <SelectItem key={etapa.valor} value={etapa.valor}>
                      {etapa.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.etapa && <p className="text-sm text-destructive">{errors.etapa}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_para_alerta">Dias para Alerta *</Label>
              <Input
                id="dias_para_alerta"
                type="number"
                min="1"
                max="365"
                value={formData.dias_para_alerta}
                onChange={(e) => setFormData({ ...formData, dias_para_alerta: parseInt(e.target.value) || 1 })}
                className={errors.dias_para_alerta ? 'border-destructive' : ''}
              />
              {errors.dias_para_alerta && <p className="text-sm text-destructive">{errors.dias_para_alerta}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem *</Label>
              <Input
                id="ordem"
                type="number"
                min="0"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                className={errors.ordem ? 'border-destructive' : ''}
              />
              {errors.ordem && <p className="text-sm text-destructive">{errors.ordem}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Importante:</strong> Este item aparecerá apenas em <strong>novos orçamentos/leads</strong> criados após esta configuração. Checklists já existentes não serão afetados.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
