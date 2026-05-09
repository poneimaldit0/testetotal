import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Clock, 
  HelpCircle, 
  TrendingUp, 
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FilaDesistenciasPropostas } from './FilaDesistenciasPropostas';
import { FilaSolicitacoesAjuda } from './FilaSolicitacoesAjuda';

interface DashboardStats {
  solicitacoesAjudaPendentes: number;
  desistenciasPendentes: number;
  fornecedoresProximoLimite: number;
  propostasVencidas: number;
  totalPropostasAbertas: number;
}

export const DashboardControlePropostas: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    solicitacoesAjudaPendentes: 0,
    desistenciasPendentes: 0,
    fornecedoresProximoLimite: 0,
    propostasVencidas: 0,
    totalPropostasAbertas: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("urgentes");
  const { toast } = useToast();

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);

      // Solicitações de ajuda pendentes
      const { count: ajudaCount } = await supabase
        .from('solicitacoes_ajuda')
        .select('*', { count: 'exact', head: true })
        .eq('respondida', false);

      // Desistências pendentes
      const { count: desistenciaCount } = await supabase
        .from('desistencias_propostas')
        .select('*', { count: 'exact', head: true })
        .is('aprovada', null);

      // Propostas abertas
      const { count: propostasCount } = await supabase
        .from('candidaturas_fornecedores')
        .select('*', { count: 'exact', head: true })
        .eq('proposta_enviada', false)
        .is('data_desistencia', null);

      // Propostas vencidas (apenas orçamentos com prazo explícito)
      const { data: propostasVencidas } = await supabase
        .from('candidaturas_fornecedores')
        .select(`
          data_limite_envio,
          orcamentos!inner(prazo_explicitamente_definido)
        `)
        .eq('proposta_enviada', false)
        .is('data_desistencia', null)
        .not('data_limite_envio', 'is', null)
        .lt('data_limite_envio', new Date().toISOString())
        .eq('orcamentos.prazo_explicitamente_definido', true);

      setStats({
        solicitacoesAjudaPendentes: ajudaCount || 0,
        desistenciasPendentes: desistenciaCount || 0,
        fornecedoresProximoLimite: 0, // TODO: implementar
        propostasVencidas: propostasVencidas?.length || 0,
        totalPropostasAbertas: propostasCount || 0
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const statCards = [
    {
      title: "Solicitações de Ajuda",
      value: stats.solicitacoesAjudaPendentes,
      icon: <HelpCircle className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: "Ver solicitações",
      onClick: () => setActiveTab("ajuda")
    },
    {
      title: "Desistências Pendentes",
      value: stats.desistenciasPendentes,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      action: "Analisar desistências",
      onClick: () => setActiveTab("desistencias")
    },
    {
      title: "Propostas Vencidas",
      value: stats.propostasVencidas,
      icon: <Clock className="h-5 w-5" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
      action: "Ver vencidas",
      onClick: () => setActiveTab("urgentes")
    },
    {
      title: "Propostas Abertas",
      value: stats.totalPropostasAbertas,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      action: "Ver todas",
      onClick: () => setActiveTab("relatorios")
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Controle de Propostas</h2>
        <Button onClick={carregarEstatisticas} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <div className={card.color}>
                    {card.icon}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2 text-xs"
                onClick={card.onClick}
              >
                {card.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs para diferentes seções */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="urgentes">Urgentes</TabsTrigger>
          <TabsTrigger value="ajuda">Solicitações de Ajuda</TabsTrigger>
          <TabsTrigger value="desistencias">Desistências</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="urgentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Ações Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.solicitacoesAjudaPendentes > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Solicitações de ajuda pendentes</p>
                      <p className="text-sm text-gray-600">{stats.solicitacoesAjudaPendentes} fornecedores aguardam resposta</p>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab("ajuda")}>Responder</Button>
                  </div>
                )}
                
                {stats.desistenciasPendentes > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Desistências para analisar</p>
                      <p className="text-sm text-gray-600">{stats.desistenciasPendentes} solicitações aguardam decisão</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("desistencias")}>Analisar</Button>
                  </div>
                )}

                {stats.propostasVencidas > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">Propostas vencidas</p>
                      <p className="text-sm text-gray-600">{stats.propostasVencidas} propostas passaram do prazo</p>
                    </div>
                    <Button size="sm" variant="destructive">Verificar</Button>
                  </div>
                )}

                {stats.solicitacoesAjudaPendentes === 0 && stats.desistenciasPendentes === 0 && stats.propostasVencidas === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Nenhuma ação urgente pendente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajuda">
          <FilaSolicitacoesAjuda />
        </TabsContent>

        <TabsContent value="desistencias">
          <FilaDesistenciasPropostas />
        </TabsContent>

        <TabsContent value="relatorios">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios e Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Relatórios detalhados serão implementados aqui.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};