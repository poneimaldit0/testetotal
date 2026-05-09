import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Concierge {
  usuarioId: string;
  nome: string;
  metaDiaria: number;
  clientesCarteira: number;
  taxaProdutividade: number;
  nivelConcierge: string;
}

interface ConfigurarMetasChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concierges: Concierge[];
  onSalvarMeta: (usuarioId: string, nivelConcierge: string, taxaProdutividade: number) => void;
  isSaving: boolean;
}

const NIVEIS_PRESET = {
  junior: 0.30,
  pleno: 0.59,
  senior: 0.70,
  custom: 0.59
};

export function ConfigurarMetasChecklistModal({
  open,
  onOpenChange,
  concierges,
  onSalvarMeta,
  isSaving
}: ConfigurarMetasChecklistModalProps) {
  const [niveis, setNiveis] = useState<Record<string, string>>(
    concierges.reduce((acc, c) => ({ ...acc, [c.usuarioId]: c.nivelConcierge || 'pleno' }), {})
  );
  const [taxas, setTaxas] = useState<Record<string, number>>(
    concierges.reduce((acc, c) => ({ ...acc, [c.usuarioId]: c.taxaProdutividade || 0.59 }), {})
  );
  const [nivelGlobal, setNivelGlobal] = useState<string>('pleno');

  // Atualizar estado quando concierges mudar
  useEffect(() => {
    setNiveis(concierges.reduce((acc, c) => ({ ...acc, [c.usuarioId]: c.nivelConcierge || 'pleno' }), {}));
    setTaxas(concierges.reduce((acc, c) => ({ ...acc, [c.usuarioId]: c.taxaProdutividade || 0.59 }), {}));
  }, [concierges]);

  const handleNivelChange = (usuarioId: string, nivel: string) => {
    setNiveis({ ...niveis, [usuarioId]: nivel });
    if (nivel !== 'custom') {
      setTaxas({ ...taxas, [usuarioId]: NIVEIS_PRESET[nivel as keyof typeof NIVEIS_PRESET] });
    }
  };

  const handleAplicarNivelGlobal = () => {
    const novosNiveis: Record<string, string> = {};
    const novasTaxas: Record<string, number> = {};
    concierges.forEach(c => {
      novosNiveis[c.usuarioId] = nivelGlobal;
      novasTaxas[c.usuarioId] = NIVEIS_PRESET[nivelGlobal as keyof typeof NIVEIS_PRESET];
    });
    setNiveis(novosNiveis);
    setTaxas(novasTaxas);
  };

  const handleSalvarTodas = async () => {
    for (const concierge of concierges) {
      const nivel = niveis[concierge.usuarioId];
      const taxa = taxas[concierge.usuarioId];
      onSalvarMeta(concierge.usuarioId, nivel, taxa);
    }
  };

  const calcularMetaDiaria = (clientesCarteira: number, taxa: number) => {
    return Math.round(clientesCarteira * taxa);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Metas de Checklist</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nível Global */}
          <div className="border-b pb-4">
            <Label className="text-sm font-medium mb-2 block">
              Aplicar Nível Global a Todos
            </Label>
            <div className="flex gap-2">
              <Select value={nivelGlobal} onValueChange={setNivelGlobal}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Júnior (30%)</SelectItem>
                  <SelectItem value="pleno">Pleno (59%)</SelectItem>
                  <SelectItem value="senior">Sênior (70%)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAplicarNivelGlobal}
              >
                Aplicar a Todos
              </Button>
            </div>
          </div>

          {/* Configurações Individuais */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Configurações Individuais
            </Label>
            <div className="space-y-4">
              {concierges.map((concierge) => {
                const nivel = niveis[concierge.usuarioId] || 'pleno';
                const taxa = taxas[concierge.usuarioId] || 0.59;
                const metaCalculada = calcularMetaDiaria(concierge.clientesCarteira, taxa);

                return (
                  <div key={concierge.usuarioId} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{concierge.nome}</Label>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{concierge.clientesCarteira} clientes</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nível</Label>
                        <Select 
                          value={nivel} 
                          onValueChange={(v) => handleNivelChange(concierge.usuarioId, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="junior">Júnior</SelectItem>
                            <SelectItem value="pleno">Pleno</SelectItem>
                            <SelectItem value="senior">Sênior</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Taxa</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={taxa}
                          onChange={(e) => {
                            const novoNivel = { ...niveis, [concierge.usuarioId]: 'custom' };
                            const novaTaxa = { ...taxas, [concierge.usuarioId]: Number(e.target.value) };
                            setNiveis(novoNivel);
                            setTaxas(novaTaxa);
                          }}
                          className="h-9"
                          disabled={nivel !== 'custom'}
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Meta Diária</Label>
                        <div className="h-9 flex items-center justify-center border rounded-md bg-muted font-semibold">
                          {metaCalculada}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarTodas}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Todas as Metas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
