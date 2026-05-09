import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, FileText, CheckSquare } from 'lucide-react';
import { MetasSaudeEmpresa, DadosRealizados } from '@/hooks/useSaudeEmpresa';

interface CardFaturamentoComissoesProps {
  metas: MetasSaudeEmpresa | null;
  realizados: DadosRealizados | null;
}

const calcularPercentual = (realizado: number, previsto: number) => {
  if (previsto === 0) return 0;
  return Math.round((realizado / previsto) * 100);
};

const getStatusIcon = (percentual: number) => {
  if (percentual >= 100) return '✅';
  if (percentual >= 80) return '⚠️';
  return '❌';
};

const getStatusColor = (percentual: number) => {
  if (percentual >= 100) return 'text-green-600';
  if (percentual >= 80) return 'text-yellow-600';
  return 'text-red-600';
};

export const CardFaturamentoComissoes = ({ metas, realizados }: CardFaturamentoComissoesProps) => {
  if (!metas || !realizados) return null;

  const percSemanal = calcularPercentual(realizados.fatComissoesSemanal, metas.fat_comissoes_meta_semanal);
  const percMensal = calcularPercentual(realizados.fatComissoesMensal, metas.fat_comissoes_meta_mensal);
  const percPublicacoes = calcularPercentual(realizados.publicacoesMensal, metas.publicacoes_meta_mensal);
  const percTarefas = calcularPercentual(realizados.tarefasMensal, metas.tarefas_meta_mensal);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="w-5 h-5" />
          Faturamento de Comissões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Semana</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Previsto: R$ {metas.fat_comissoes_meta_semanal.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs">
                Realizado: R$ {realizados.fatComissoesSemanal.toLocaleString('pt-BR')}
              </div>
              <div className={`text-sm font-bold ${getStatusColor(percSemanal)}`}>
                {percSemanal}% {getStatusIcon(percSemanal)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Mês</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Previsto: R$ {metas.fat_comissoes_meta_mensal.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs">
                Realizado: R$ {realizados.fatComissoesMensal.toLocaleString('pt-BR')}
              </div>
              <div className={`text-sm font-bold ${getStatusColor(percMensal)}`}>
                {percMensal}% {getStatusIcon(percMensal)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Progresso (Mês)</div>
            <Progress value={Math.min(percMensal, 100)} className="h-3" />
            <div className={`text-xs font-semibold text-center ${getStatusColor(percMensal)}`}>
              {percMensal}%
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Publicações:</span>
            </div>
            <div className="flex gap-4">
              <span className="text-muted-foreground">
                Prev: <span className="font-semibold text-foreground">{metas.publicacoes_meta_mensal}</span>
              </span>
              <span className="text-muted-foreground">
                Real: <span className="font-semibold text-foreground">{realizados.publicacoesMensal}</span>
              </span>
              <span className={`font-bold ${getStatusColor(percPublicacoes)}`}>
                {percPublicacoes}% {getStatusIcon(percPublicacoes)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="w-4 h-4" />
              <span>Tarefas:</span>
            </div>
            <div className="flex gap-4">
              <span className="text-muted-foreground">
                Prev: <span className="font-semibold text-foreground">{metas.tarefas_meta_mensal}</span>
              </span>
              <span className="text-muted-foreground">
                Real: <span className="font-semibold text-foreground">{realizados.tarefasMensal}</span>
              </span>
              <span className={`font-bold ${getStatusColor(percTarefas)}`}>
                {percTarefas}% {getStatusIcon(percTarefas)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
