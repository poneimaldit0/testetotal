import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EtapaCRM } from '@/types/crm';
import { ETAPAS_CRM } from '@/constants/crmEtapas';
import { X, Loader2 } from 'lucide-react';

interface BarraAcoesMassaProps {
  quantidadeSelecionada: number;
  onMoverEmMassa: (etapaDestino: EtapaCRM, observacao?: string) => void;
  onDesselecionar: () => void;
  isMovendo: boolean;
}

export const BarraAcoesMassa = ({
  quantidadeSelecionada,
  onMoverEmMassa,
  onDesselecionar,
  isMovendo
}: BarraAcoesMassaProps) => {
  const [etapaDestino, setEtapaDestino] = useState<EtapaCRM | ''>('');
  const [observacao, setObservacao] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);

  const handleConfirmarMovimento = () => {
    if (!etapaDestino) return;
    onMoverEmMassa(etapaDestino, observacao || undefined);
    setEtapaDestino('');
    setObservacao('');
    setDialogAberto(false);
  };

  const etapaSelecionada = ETAPAS_CRM.find(e => e.valor === etapaDestino);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg animate-in slide-in-from-bottom-2">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-primary">☑️ {quantidadeSelecionada} selecionado(s)</span>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm whitespace-nowrap">Mover para:</Label>
              <Select value={etapaDestino} onValueChange={(v) => setEtapaDestino(v as EtapaCRM)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_CRM.map((etapa) => (
                    <SelectItem key={etapa.valor} value={etapa.valor}>
                      {etapa.icone} {etapa.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => setDialogAberto(true)}
                disabled={!etapaDestino || isMovendo}
              >
                {isMovendo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Movendo...
                  </>
                ) : (
                  'Mover'
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDesselecionar}
              disabled={isMovendo}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar Movimentação em Massa</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Deseja mover <strong>{quantidadeSelecionada} orçamento(s)</strong> para a etapa{' '}
                <strong>"{etapaSelecionada?.titulo}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Esta ação será registrada no histórico de cada orçamento.
              </p>

              <div className="space-y-2">
                <Label className="text-sm">Observação (opcional)</Label>
                <Textarea
                  placeholder="Adicione uma observação que será aplicada a todos os orçamentos..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarMovimento}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};