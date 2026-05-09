import React, { useState, useEffect } from 'react';
import { Upload, FileText, BarChart3, Search, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ETAPAS = [
  { icone: Upload, texto: 'Recebendo documento...' },
  { icone: FileText, texto: 'Lendo o orçamento...' },
  { icone: BarChart3, texto: 'Comparando com o mercado...' },
  { icone: Search, texto: 'Identificando pontos de atenção...' },
  { icone: Sparkles, texto: 'Gerando análise...' },
];

export const PropostaProcessando: React.FC = () => {
  const [etapaAtual, setEtapaAtual] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setEtapaAtual((prev) => (prev < ETAPAS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const progresso = ((etapaAtual + 1) / ETAPAS.length) * 100;

  return (
    <div className="space-y-4">
      <Progress value={progresso} className="h-2" />

      <div className="space-y-3">
        {ETAPAS.map((etapa, index) => {
          const Icone = etapa.icone;
          const isAtiva = index === etapaAtual;
          const isConcluida = index < etapaAtual;

          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-all duration-500',
                isAtiva && 'bg-primary/10 text-primary font-medium',
                isConcluida && 'text-muted-foreground',
                !isAtiva && !isConcluida && 'text-muted-foreground/40'
              )}
            >
              <Icone
                className={cn(
                  'h-4 w-4 shrink-0 transition-all duration-500',
                  isAtiva && 'animate-pulse text-primary'
                )}
              />
              <span className="text-sm">{etapa.texto}</span>
              {isConcluida && <span className="text-xs text-green-500 ml-auto">✓</span>}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground italic mt-4">
        Sua proposta está sendo analisada pela IA Reforma100
      </p>
    </div>
  );
};
