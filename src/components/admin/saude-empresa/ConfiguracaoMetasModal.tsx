import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MetasSaudeEmpresa } from '@/hooks/useSaudeEmpresa';

interface ConfiguracaoMetasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metasAtuais: MetasSaudeEmpresa | null;
  onSalvar: () => void;
}

export const ConfiguracaoMetasModal = ({ open, onOpenChange, metasAtuais, onSalvar }: ConfiguracaoMetasModalProps) => {
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState<MetasSaudeEmpresa>({
    fat_fornecedores_meta_semanal: metasAtuais?.fat_fornecedores_meta_semanal || 0,
    fat_fornecedores_meta_mensal: metasAtuais?.fat_fornecedores_meta_mensal || 0,
    reunioes_meta_semanal: metasAtuais?.reunioes_meta_semanal || 0,
    reunioes_meta_mensal: metasAtuais?.reunioes_meta_mensal || 0,
    fat_comissoes_meta_semanal: metasAtuais?.fat_comissoes_meta_semanal || 0,
    fat_comissoes_meta_mensal: metasAtuais?.fat_comissoes_meta_mensal || 0,
    publicacoes_meta_semanal: metasAtuais?.publicacoes_meta_semanal || 0,
    publicacoes_meta_mensal: metasAtuais?.publicacoes_meta_mensal || 0,
    tarefas_meta_semanal: metasAtuais?.tarefas_meta_semanal || 0,
    tarefas_meta_mensal: metasAtuais?.tarefas_meta_mensal || 0,
  });

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      // Desativar meta atual
      await supabase
        .from('metas_saude_empresa')
        .update({ ativo: false })
        .eq('ativo', true);

      // Criar nova meta
      const { error } = await supabase
        .from('metas_saude_empresa')
        .insert([{
          ...formData,
          ativo: true,
          vigente_a_partir_de: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;

      toast.success('Metas atualizadas com sucesso!');
      onSalvar();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Metas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Faturamento Fornecedores */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Faturamento de Fornecedores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meta Semanal (R$)</Label>
                <Input
                  type="number"
                  value={formData.fat_fornecedores_meta_semanal}
                  onChange={(e) => setFormData({ ...formData, fat_fornecedores_meta_semanal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Meta Mensal (R$)</Label>
                <Input
                  type="number"
                  value={formData.fat_fornecedores_meta_mensal}
                  onChange={(e) => setFormData({ ...formData, fat_fornecedores_meta_mensal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reuniões Semanais</Label>
                <Input
                  type="number"
                  value={formData.reunioes_meta_semanal}
                  onChange={(e) => setFormData({ ...formData, reunioes_meta_semanal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reuniões Mensais</Label>
                <Input
                  type="number"
                  value={formData.reunioes_meta_mensal}
                  onChange={(e) => setFormData({ ...formData, reunioes_meta_mensal: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Faturamento Comissões */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Faturamento de Comissões</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meta Semanal (R$)</Label>
                <Input
                  type="number"
                  value={formData.fat_comissoes_meta_semanal}
                  onChange={(e) => setFormData({ ...formData, fat_comissoes_meta_semanal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Meta Mensal (R$)</Label>
                <Input
                  type="number"
                  value={formData.fat_comissoes_meta_mensal}
                  onChange={(e) => setFormData({ ...formData, fat_comissoes_meta_mensal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Publicações Semanais</Label>
                <Input
                  type="number"
                  value={formData.publicacoes_meta_semanal}
                  onChange={(e) => setFormData({ ...formData, publicacoes_meta_semanal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Publicações Mensais</Label>
                <Input
                  type="number"
                  value={formData.publicacoes_meta_mensal}
                  onChange={(e) => setFormData({ ...formData, publicacoes_meta_mensal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Tarefas Semanais</Label>
                <Input
                  type="number"
                  value={formData.tarefas_meta_semanal}
                  onChange={(e) => setFormData({ ...formData, tarefas_meta_semanal: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Tarefas Mensais</Label>
                <Input
                  type="number"
                  value={formData.tarefas_meta_mensal}
                  onChange={(e) => setFormData({ ...formData, tarefas_meta_mensal: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Metas'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
