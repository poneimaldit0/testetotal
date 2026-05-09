import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NovoRegistroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: () => void;
}

export const NovoRegistroModal = ({ open, onOpenChange, onSalvar }: NovoRegistroModalProps) => {
  const { profile } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [tipo, setTipo] = useState<'faturamento_fornecedor' | 'faturamento_comissao' | 'reuniao'>('faturamento_fornecedor');
  const [valor, setValor] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [descricao, setDescricao] = useState('');
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0]);

  const handleSalvar = async () => {
    if (tipo !== 'reuniao' && !valor) {
      toast.error('Informe o valor');
      return;
    }

    if (tipo === 'reuniao' && (!quantidade || Number(quantidade) < 1)) {
      toast.error('Informe a quantidade de reuniões');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('registros_saude_empresa')
        .insert([{
          tipo,
          valor: tipo === 'reuniao' ? Number(quantidade) : Number(valor),
          descricao,
          data_registro: dataRegistro,
          registrado_por_id: profile?.id,
          registrado_por_nome: profile?.nome || profile?.email
        }]);

      if (error) throw error;

      toast.success('Registro adicionado com sucesso!');
      onSalvar();
      onOpenChange(false);
      
      // Limpar form
      setTipo('faturamento_fornecedor');
      setValor('');
      setQuantidade('1');
      setDescricao('');
      setDataRegistro(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      toast.error('Erro ao salvar registro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Registro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Registro</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faturamento_fornecedor">Faturamento Fornecedor</SelectItem>
                <SelectItem value="faturamento_comissao">Faturamento Comissão</SelectItem>
                <SelectItem value="reuniao">Reunião</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data do Registro</Label>
            <Input
              type="date"
              value={dataRegistro}
              onChange={(e) => setDataRegistro(e.target.value)}
            />
          </div>

          {tipo === 'reuniao' ? (
            <div>
              <Label>Quantidade de Reuniões</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="1"
              />
            </div>
          ) : (
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o registro..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
