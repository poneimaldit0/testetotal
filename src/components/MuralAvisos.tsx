import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAvisos } from '@/hooks/useAvisos';
import { cn } from '@/lib/utils';

interface MuralAvisosProps {
  className?: string;
}

const tipoConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-50'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/50 dark:border-yellow-900 dark:text-yellow-50'
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/50 dark:border-green-900 dark:text-green-50'
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-900 dark:text-red-50'
  }
};

export const MuralAvisos = ({ className }: MuralAvisosProps) => {
  const { avisosAtivos, isLoading } = useAvisos();
  const [avisosOcultos, setAvisosOcultos] = useState<string[]>(() => {
    const stored = localStorage.getItem('avisos_ocultos');
    return stored ? JSON.parse(stored) : [];
  });

  // Limpar avisos ocultos que não existem mais
  useEffect(() => {
    if (avisosAtivos && avisosOcultos.length > 0) {
      const idsAtivos = avisosAtivos.map(a => a.id);
      const novosOcultos = avisosOcultos.filter(id => idsAtivos.includes(id));
      if (novosOcultos.length !== avisosOcultos.length) {
        setAvisosOcultos(novosOcultos);
        localStorage.setItem('avisos_ocultos', JSON.stringify(novosOcultos));
      }
    }
  }, [avisosAtivos, avisosOcultos]);

  const ocultarAviso = (avisoId: string) => {
    const novosOcultos = [...avisosOcultos, avisoId];
    setAvisosOcultos(novosOcultos);
    localStorage.setItem('avisos_ocultos', JSON.stringify(novosOcultos));
  };

  if (isLoading) {
    return null;
  }

  const avisosVisiveis = avisosAtivos?.filter(aviso => !avisosOcultos.includes(aviso.id)) || [];

  if (avisosVisiveis.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {avisosVisiveis.map((aviso) => {
        const config = tipoConfig[aviso.tipo];
        const Icon = config.icon;

        return (
          <Alert 
            key={aviso.id} 
            className={cn(
              'relative animate-fade-in border-l-4',
              config.className
            )}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle className="mb-1 pr-6">
              {aviso.titulo}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {aviso.conteudo}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 hover:bg-black/10"
              onClick={() => ocultarAviso(aviso.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
};