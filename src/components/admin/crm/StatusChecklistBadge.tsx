import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';

interface StatusChecklistBadgeProps {
  total?: number;
  concluidos?: number;
  temAlertas?: boolean;
}

export const StatusChecklistBadge = ({ total, concluidos, temAlertas }: StatusChecklistBadgeProps) => {
  // Garantir valores válidos (tratar undefined/null como 0)
  const totalValido = total ?? 0;
  const concluidosValido = concluidos ?? 0;
  
  const percentual = totalValido > 0 ? Math.round((concluidosValido / totalValido) * 100) : 0;

  // Determinar cor e ícone baseado no status
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  let Icon = Circle;
  let label = `${concluidosValido}/${totalValido}`;

  if (temAlertas ?? false) {
    variant = 'destructive';
    Icon = AlertCircle;
  } else if (percentual === 100 && totalValido > 0) {
    variant = 'default';
    Icon = CheckCircle2;
  }

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </Badge>
  );
};
