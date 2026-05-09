import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useProdutividadeChecklist } from '@/hooks/useProdutividadeChecklist';

interface CardProdutividadeConciergePros {
  usuarioId: string;
}

export const CardProdutividadeConcierge = ({ usuarioId }: CardProdutividadeConciergePros) => {
  const { produtividadePorConcierge, isLoading } = useProdutividadeChecklist(1, 'orcamentos');

  const meusDados = useMemo(() => {
    return produtividadePorConcierge?.find(p => p.usuarioId === usuarioId);
  }, [produtividadePorConcierge, usuarioId]);

  if (isLoading || !meusDados) {
    return null;
  }

  const porcentagem = meusDados.metaDiaria > 0 
    ? Math.round((meusDados.itensHoje / meusDados.metaDiaria) * 100) 
    : 0;

  const getStatusBadge = () => {
    if (porcentagem >= 100) {
      return <Badge className="bg-green-500 hover:bg-green-600">🏆 Acima da meta</Badge>;
    } else if (porcentagem >= 70) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">✓ No caminho</Badge>;
    } else if (porcentagem >= 40) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">⚠ Atenção</Badge>;
    } else {
      return <Badge variant="destructive">🔻 Crítico</Badge>;
    }
  };

  const getProgressClassName = () => {
    if (porcentagem >= 100) return "[&>div]:bg-green-500";
    if (porcentagem >= 70) return "[&>div]:bg-blue-500";
    if (porcentagem >= 40) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-destructive";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">Sua Produtividade Hoje</h3>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    <strong className="text-foreground">{meusDados.itensHoje}</strong> de{' '}
                    <strong className="text-foreground">{meusDados.metaDiaria}</strong> tarefas
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    <strong className="text-foreground">{porcentagem}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>
                    <strong className="text-foreground">{meusDados.clientesCarteira}</strong> clientes
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-48">
            <Progress 
              value={Math.min(porcentagem, 100)} 
              className={`h-2 ${getProgressClassName()}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
