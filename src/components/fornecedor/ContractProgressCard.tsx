import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building, TrendingUp, Clock, Target } from "lucide-react";

interface ContractProgressData {
  valorTotal: number;
  valorMedido: number;
  percentualConcluido: number;
  valorRestante: number;
  totalItens: number;
  itensIniciados: number;
  itensCompletos: number;
}

interface ContractProgressCardProps {
  clienteNome: string;
  progress: ContractProgressData;
}

export function ContractProgressCard({ clienteNome, progress }: ContractProgressCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "hsl(var(--accent))"; // Verde para quase completo
    if (percentage >= 50) return "hsl(var(--primary))"; // Azul para progresso médio
    if (percentage >= 25) return "hsl(25 95% 53%)"; // Laranja para início
    return "hsl(var(--muted-foreground))"; // Cinza para pouco progresso
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Progresso do Contrato</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de Progresso Principal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Conclusão Geral</span>
            <Badge variant="secondary" className="text-xs">
              {progress.percentualConcluido.toFixed(1)}%
            </Badge>
          </div>
          <Progress 
            value={progress.percentualConcluido} 
            className="h-3"
            style={{
              '--progress-background': getProgressColor(progress.percentualConcluido)
            } as React.CSSProperties}
          />
        </div>

        {/* Métricas Financeiras */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Valor Medido</span>
            </div>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(progress.valorMedido)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-sm font-semibold">
              {formatCurrency(progress.valorTotal)}
            </p>
          </div>
        </div>

        {/* Estatísticas de Itens */}
        <div className="pt-2 border-t border-border">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Itens</p>
              <p className="text-lg font-bold">{progress.totalItens}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Em Progresso</p>
              <p className="text-lg font-bold text-primary">{progress.itensIniciados}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completos</p>
              <p className="text-lg font-bold text-accent">{progress.itensCompletos}</p>
            </div>
          </div>
        </div>

        {/* Valor Restante */}
        {progress.valorRestante > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Valor Restante</p>
              <p className="text-sm font-semibold">{formatCurrency(progress.valorRestante)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}