import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, CheckCircle2, AlertCircle, Shield, Info } from 'lucide-react';
import { useCronogramaObra } from '@/hooks/useCronogramaObra';
import { useObras } from '@/hooks/useObras';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CronogramaObraProps {
  contratoId: string;
}

export const CronogramaObra: React.FC<CronogramaObraProps> = ({ contratoId }) => {
  const { cronograma, loading } = useCronogramaObra(contratoId);
  const { obras, loading: loadingObras } = useObras();
  
  // Encontrar a obra correspondente ao contrato
  const obraAtual = obras.find(obra => obra.contrato_id === contratoId);
  const cronogramaAprovado = obraAtual?.cronograma_inicial_aprovado || false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500';
      case 'em_andamento':
        return 'bg-blue-500';
      case 'atrasado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'em_andamento':
        return <Clock className="h-4 w-4" />;
      case 'atrasado':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading || loadingObras) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cronograma da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando cronograma...</p>
        </CardContent>
      </Card>
    );
  }

  if (cronograma.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cronograma da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Cronograma em desenvolvimento</h4>
            </div>
            <p className="text-sm text-blue-700">
              O fornecedor está preparando o cronograma inicial da obra. 
              Assim que estiver pronto e aprovado, você poderá acompanhar 
              todas as etapas e o progresso da execução.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cronograma da Obra
          </div>
          {cronogramaAprovado && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              Cronograma Aprovado
            </Badge>
          )}
        </CardTitle>
        {cronogramaAprovado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-green-700">
              ✅ Este cronograma foi aprovado pelo fornecedor e representa o planejamento 
              oficial da obra. Acompanhe o progresso de cada etapa conforme a execução.
            </p>
          </div>
        )}
        {!cronogramaAprovado && cronograma.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-amber-700">
              ⚠️ Este cronograma ainda está em desenvolvimento e pode sofrer alterações. 
              O fornecedor está ajustando os detalhes antes da aprovação final.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas gerais do cronograma */}
        {cronograma.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">Total de Etapas</p>
              <p className="text-2xl font-bold text-blue-700">{cronograma.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm font-medium text-green-900">Etapas Concluídas</p>
              <p className="text-2xl font-bold text-green-700">
                {cronograma.filter(item => item.status === 'concluido').length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm font-medium text-orange-900">Progresso Médio</p>
              <p className="text-2xl font-bold text-orange-700">
                {Math.round(cronograma.reduce((acc, item) => acc + (item.porcentagem_conclusao || 0), 0) / cronograma.length)}%
              </p>
            </div>
          </div>
        )}

        {cronograma.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(item.status)} variant="secondary">
                  {getStatusIcon(item.status)}
                  <span className="ml-1 capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                </Badge>
                <span className="font-medium">{item.categoria}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {item.porcentagem_conclusao}% concluído
              </span>
            </div>
            
            <h4 className="font-medium">{item.item_checklist}</h4>
            
            <Progress value={item.porcentagem_conclusao} className="w-full" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Data prevista início:</span>
                <p>
                  {item.data_inicio_prevista 
                    ? format(new Date(item.data_inicio_prevista), "dd/MM/yyyy", { locale: ptBR })
                    : "Não definida"
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Data prevista fim:</span>
                <p>
                  {item.data_fim_prevista 
                    ? format(new Date(item.data_fim_prevista), "dd/MM/yyyy", { locale: ptBR })
                    : "Não definida"
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Data real início:</span>
                <p>
                  {item.data_inicio_real 
                    ? format(new Date(item.data_inicio_real), "dd/MM/yyyy", { locale: ptBR })
                    : "Não iniciado"
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Data real fim:</span>
                <p>
                  {item.data_fim_real 
                    ? format(new Date(item.data_fim_real), "dd/MM/yyyy", { locale: ptBR })
                    : "Em andamento"
                  }
                </p>
              </div>
            </div>
            
            {item.observacoes && (
              <div>
                <span className="text-muted-foreground text-sm">Observações:</span>
                <p className="text-sm mt-1">{item.observacoes}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};