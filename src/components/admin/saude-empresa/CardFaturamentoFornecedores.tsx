import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Users } from 'lucide-react';
import { MetasSaudeEmpresa, DadosRealizados } from '@/hooks/useSaudeEmpresa';

interface CardFaturamentoFornecedoresProps {
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

export const CardFaturamentoFornecedores = ({ metas, realizados }: CardFaturamentoFornecedoresProps) => {
  if (!metas || !realizados) return null;

  const percSemanal = calcularPercentual(realizados.fatFornecedoresSemanal, metas.fat_fornecedores_meta_semanal);
  const percMensal = calcularPercentual(realizados.fatFornecedoresMensal, metas.fat_fornecedores_meta_mensal);
  const percReunioes = calcularPercentual(realizados.reunioesMensal, metas.reunioes_meta_mensal);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <DollarSign className="w-5 h-5" />
          Faturamento de Fornecedores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Semana</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Previsto: R$ {metas.fat_fornecedores_meta_semanal.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs">
                Realizado: R$ {realizados.fatFornecedoresSemanal.toLocaleString('pt-BR')}
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
                Previsto: R$ {metas.fat_fornecedores_meta_mensal.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs">
                Realizado: R$ {realizados.fatFornecedoresMensal.toLocaleString('pt-BR')}
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

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Reuniões:</span>
            </div>
            <div className="flex gap-4">
              <span className="text-muted-foreground">
                Previstas: <span className="font-semibold text-foreground">{metas.reunioes_meta_mensal}</span>
              </span>
              <span className="text-muted-foreground">
                Realizadas: <span className="font-semibold text-foreground">{realizados.reunioesMensal}</span>
              </span>
              <span className={`font-bold ${getStatusColor(percReunioes)}`}>
                {percReunioes}% {getStatusIcon(percReunioes)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
