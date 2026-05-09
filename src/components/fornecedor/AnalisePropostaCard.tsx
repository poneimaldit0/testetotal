import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, ArrowRight, AlertTriangle, Info, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AnaliseCompletaViewer } from './AnaliseCompletaViewer';
import type { AnaliseIA } from '@/hooks/useAnalisePropostaIA';

interface AnalisePropostaCardProps {
  analise: AnaliseIA;
  nomeCliente?: string;
}

const posicionamentoConfig: Record<string, { label: string; cor: string }> = {
  dentro_media: { label: 'Dentro da média', cor: 'bg-blue-500 hover:bg-blue-600 text-white' },
  acima_media: { label: 'Acima da média', cor: 'bg-red-500 hover:bg-red-600 text-white' },
  abaixo_media: { label: 'Abaixo da média', cor: 'bg-green-500 hover:bg-green-600 text-white' },
};

const formatCurrency = (value: number | null) => {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

export const AnalisePropostaCard: React.FC<AnalisePropostaCardProps> = ({ analise, nomeCliente }) => {
  const [open, setOpen] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const config = posicionamentoConfig[analise.posicionamento || 'dentro_media'];

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg overflow-hidden">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Análise Reforma100 — exclusiva para você
              </span>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-green-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-green-600" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3">
              {/* Badge de posicionamento */}
              <Badge className={cn('text-xs', config.cor)}>{config.label}</Badge>

              {/* Valores */}
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Sua proposta</span>
                  <p className="font-semibold">{formatCurrency(analise.valor_proposta)}</p>
                </div>
                <span className="text-muted-foreground">vs.</span>
                <div>
                  <span className="text-muted-foreground text-xs">Referência mercado</span>
                  <p className="font-semibold">{formatCurrency(analise.valor_referencia_mercado)}</p>
                </div>
              </div>

              {/* Pontos fortes */}
              {analise.pontos_fortes.length > 0 && (
                <div className="space-y-1">
                  {analise.pontos_fortes.map((ponto, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                      <span>{ponto}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pontos de atenção */}
              {analise.pontos_atencao.length > 0 && (
                <div className="space-y-1">
                  {analise.pontos_atencao.map((ponto, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span>{ponto}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão para ver análise completa */}
              {analise.analise_completa && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerOpen(true);
                  }}
                  className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Eye className="h-4 w-4" />
                  Ver análise completa (7 seções)
                </Button>
              )}

              {/* Rodapé */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-green-200 dark:border-green-800">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Esta análise é privada e visível apenas para você
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Viewer modal */}
      {analise.analise_completa && (
        <AnaliseCompletaViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          analise={analise.analise_completa}
          nomeCliente={nomeCliente}
          posicionamento={analise.posicionamento || undefined}
        />
      )}
    </>
  );
};

const LIMITE_ANALISE_BYTES = 10 * 1024 * 1024; // 10 MB

export type EstadoFallback = 'aguardando' | 'arquivo_grande' | 'sem_dados' | 'falha';

interface AnaliseFallbackCardProps {
  estado: EstadoFallback;
  tamanhoBytes?: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const AnaliseFallbackCard: React.FC<AnaliseFallbackCardProps> = ({ estado, tamanhoBytes }) => {
  if (estado === 'aguardando') {
    return (
      <div className="border border-muted bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            Arquivo anexado, aguardando análise.
          </span>
        </div>
      </div>
    );
  }

  if (estado === 'arquivo_grande') {
    const tamanhoStr = tamanhoBytes != null ? ` (${formatBytes(tamanhoBytes)})` : '';
    return (
      <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Proposta anexada, mas NÃO analisada automaticamente{tamanhoStr}.
          </p>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">
          Motivo: arquivo acima do limite de 10 MB. Envie uma versão reduzida ou divida o PDF em partes menores.
        </p>
      </div>
    );
  }

  if (estado === 'sem_dados') {
    return (
      <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Proposta anexada, mas a IA não conseguiu extrair dados suficientes.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Revise o arquivo ou envie uma versão mais clara e legível.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 'falha' — erro genérico
  return (
    <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-sm text-amber-800 dark:text-amber-300">
          Análise indisponível no momento — sua proposta foi recebida com sucesso.
        </span>
      </div>
    </div>
  );
};
