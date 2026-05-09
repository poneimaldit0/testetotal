import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const TEXTO_PADRAO = `Para uma análise técnica precisa, envie a proposta em formato estruturado (PDF editável, Excel ou Word), contendo:

• Valor total da proposta
• Escopo detalhado dos serviços
• Separação de mão de obra e materiais
• Prazo de execução e condições de pagamento`;

interface PropostaIncompletaCardProps {
  titulo?: string;
}

export const PropostaIncompletaCard: React.FC<PropostaIncompletaCardProps> = ({
  titulo = 'Não foi possível analisar completamente esta proposta.',
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(TEXTO_PADRAO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <>
      <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {titulo}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              O documento enviado não possui estrutura adequada para leitura automatizada.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-2 text-xs"
        >
          <FileText className="h-3.5 w-3.5" />
          Solicitar proposta estruturada
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-amber-600" />
              Solicitar proposta estruturada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compartilhe as instruções abaixo com o fornecedor para uma análise técnica precisa.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-muted/60 border p-3 text-sm whitespace-pre-line leading-relaxed text-foreground">
            {TEXTO_PADRAO}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={copiarTexto}
            className="gap-2 w-full"
          >
            {copiado ? (
              <><Check className="h-3.5 w-3.5 text-green-600" />Copiado!</>
            ) : (
              <><Copy className="h-3.5 w-3.5" />Copiar texto</>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
