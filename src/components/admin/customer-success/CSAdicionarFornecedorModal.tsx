import { useState } from 'react';
import { useCSEtapas, useFornecedoresDisponiveis, useCSResponsaveis, useAdicionarFornecedorCS } from '@/hooks/useCustomerSuccessCRM';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CSAdicionarFornecedorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSAdicionarFornecedorModal({ open, onOpenChange }: CSAdicionarFornecedorModalProps) {
  const { data: fornecedores } = useFornecedoresDisponiveis();
  const { data: responsaveis } = useCSResponsaveis();
  const { data: etapas } = useCSEtapas();
  const adicionar = useAdicionarFornecedorCS();

  const [fornecedorId, setFornecedorId] = useState('');
  const [csResponsavelId, setCsResponsavelId] = useState('');
  const [etapaId, setEtapaId] = useState('');

  const handleSubmit = async () => {
    if (!fornecedorId || !csResponsavelId || !etapaId) return;
    await adicionar.mutateAsync({ fornecedor_id: fornecedorId, cs_responsavel_id: csResponsavelId, etapa_atual_id: etapaId });
    onOpenChange(false);
    setFornecedorId('');
    setCsResponsavelId('');
    setEtapaId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar Fornecedor ao CS</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {fornecedores?.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome} - {f.empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CS Responsável</Label>
            <Select value={csResponsavelId} onValueChange={setCsResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {responsaveis?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Etapa Inicial</Label>
            <Select value={etapaId} onValueChange={setEtapaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {etapas?.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={adicionar.isPending || !fornecedorId || !csResponsavelId || !etapaId}>
            {adicionar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
