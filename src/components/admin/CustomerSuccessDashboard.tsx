import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, UserCheck, UserX, AlertTriangle, 
  Calendar, Clock, HelpCircle, Shield, TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageHeader } from '@/components/ui/PremiumPageHeader';

interface CSMetrics {
  fornecedoresAtivos: number;
  fornecedoresInativos: number;
  fornecedoresProximoVencimento: number;
  fornecedoresBaixoEngajamento: number;
  penalidadesAtivas: number;
  solicitacoesAjudaPendentes: number;
  contratosMes: number;
  taxaRetencao: number;
}

export const CustomerSuccessDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<CSMetrics>({
    fornecedoresAtivos: 0,
    fornecedoresInativos: 0,
    fornecedoresProximoVencimento: 0,
    fornecedoresBaixoEngajamento: 0,
    penalidadesAtivas: 0,
    solicitacoesAjudaPendentes: 0,
    contratosMes: 0,
    taxaRetencao: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      // 1. Fornecedores Ativos vs Inativos
      const { data: fornecedoresAtivos } = await supabase
        .from('profiles')
        .select('id')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo');

      const { data: fornecedoresInativos } = await supabase
        .from('profiles')
        .select('id')
        .eq('tipo_usuario', 'fornecedor')
        .in('status', ['inativo', 'suspenso']);

      // 2. Contratos próximos do vencimento (30 dias)
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + 30);
      
      const { data: proximoVencimento } = await supabase
        .from('profiles')
        .select('id, data_termino_contrato')
        .eq('tipo_usuario', 'fornecedor')
        .not('data_termino_contrato', 'is', null)
        .lte('data_termino_contrato', dataLimite.toISOString());

      // 3. Fornecedores com baixo engajamento (sem login há 30+ dias)
      const dataEngajamento = new Date();
      dataEngajamento.setDate(dataEngajamento.getDate() - 30);
      
      const { data: logsRecentes } = await supabase
        .from('logs_acesso')
        .select('user_id')
        .gte('data_acesso', dataEngajamento.toISOString());
      
      const userIdsComAcesso = new Set(logsRecentes?.map(log => log.user_id) || []);
      
      const { data: todosFornecedores } = await supabase
        .from('profiles')
        .select('id')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo');
      
      const baixoEngajamento = todosFornecedores?.filter(f => !userIdsComAcesso.has(f.id)) || [];

      // 4. Penalidades Ativas - usar count aproximado
      const penalidadesAtivas = 0; // TODO: implementar quando tabela estiver disponível

      // 5. Solicitações de Ajuda Pendentes - usar count aproximado
      const solicitacoesAjudaPendentes = 0; // TODO: implementar quando tabela estiver disponível

      // 6. Novos contratos no mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data: contratosMes } = await supabase
        .from('profiles')
        .select('id')
        .eq('tipo_usuario', 'fornecedor')
        .gte('data_inicio_contrato', inicioMes.toISOString());

      // 7. Taxa de Retenção (fornecedores ativos / total)
      const totalFornecedores = (fornecedoresAtivos?.length || 0) + (fornecedoresInativos?.length || 0);
      const taxaRetencao = totalFornecedores > 0 
        ? Math.round((fornecedoresAtivos?.length || 0) / totalFornecedores * 100)
        : 0;

      setMetrics({
        fornecedoresAtivos: fornecedoresAtivos?.length || 0,
        fornecedoresInativos: fornecedoresInativos?.length || 0,
        fornecedoresProximoVencimento: proximoVencimento?.length || 0,
        fornecedoresBaixoEngajamento: baixoEngajamento.length,
        penalidadesAtivas,
        solicitacoesAjudaPendentes,
        contratosMes: contratosMes?.length || 0,
        taxaRetencao,
      });

    } catch (error) {
      console.error('Erro ao buscar métricas CS:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as métricas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        title="Customer Success"
        subtitle="Visão geral de fornecedores · Reforma100"
      />

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fornecedores Ativos */}
        <Card className="bg-gradient-to-br from-green-50 to-background border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Fornecedores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {metrics.fornecedoresAtivos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.taxaRetencao}% taxa de retenção
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Fornecedores Inativos/Suspensos */}
        <Card className="bg-gradient-to-br from-red-50 to-background border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Inativos/Suspensos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {metrics.fornecedoresInativos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Contratos Vencendo */}
        <Card className="bg-gradient-to-br from-yellow-50 to-background border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Contratos Vencendo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {metrics.fornecedoresProximoVencimento}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Novos Contratos */}
        <Card className="bg-gradient-to-br from-blue-50 to-background border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Novos Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {metrics.contratosMes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Neste mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Ações Prioritárias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 5: Baixo Engajamento */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Baixo Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.fornecedoresBaixoEngajamento}
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                Sem acesso 30+ dias
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Considerar ação de reengajamento
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Penalidades Ativas */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              Penalidades Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">
                {metrics.penalidadesAtivas}
              </div>
              <Badge variant="destructive">
                Ativas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Fornecedores com restrições
            </p>
          </CardContent>
        </Card>

        {/* Card 7: Solicitações de Ajuda */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              Solicitações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.solicitacoesAjudaPendentes}
              </div>
              <Badge variant="outline" className="border-purple-300 text-purple-700">
                Aguardando
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requerem resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Saúde dos Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-around py-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {metrics.taxaRetencao}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Taxa de Retenção</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {metrics.fornecedoresAtivos}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Ativos</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">
                {metrics.fornecedoresBaixoEngajamento}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Em Risco</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
