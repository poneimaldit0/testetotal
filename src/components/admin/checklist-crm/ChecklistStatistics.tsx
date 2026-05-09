import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { ChecklistStatistics as Stats } from '@/hooks/useChecklistsAdmin';

interface ChecklistStatisticsProps {
  statistics: Stats;
}

export function ChecklistStatistics({ statistics }: ChecklistStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastrados no sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Itens Ativos</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{statistics.ativos}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Em uso nos novos checklists
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Itens Inativos</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">{statistics.inativos}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Desabilitados temporariamente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média de Alerta</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.mediaDiasAlerta}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {statistics.mediaDiasAlerta === 1 ? 'dia' : 'dias'} para alerta
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
