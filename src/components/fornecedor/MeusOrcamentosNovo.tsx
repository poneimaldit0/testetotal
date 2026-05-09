
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMeusOrcamentosFix } from '@/hooks/useMeusOrcamentosFix';
import { MeusOrcamentosCard } from './MeusOrcamentosCard';
import { RevisionWorkflow } from './RevisionWorkflow';

export const MeusOrcamentosNovo: React.FC = () => {
  const { user } = useAuth();
  const { orcamentos, loading, error, recarregar } = useMeusOrcamentosFix(user?.id);

  console.log('🏠 MeusOrcamentosNovo: Renderizando componente');
  console.log('👤 MeusOrcamentosNovo: User ID:', user?.id);
  console.log('⏳ MeusOrcamentosNovo: Loading state:', loading);
  console.log('❌ MeusOrcamentosNovo: Error state:', error);
  console.log('📋 MeusOrcamentosNovo: Orçamentos recebidos:', orcamentos.length);

  if (orcamentos.length > 0) {
    console.log('📊 MeusOrcamentosNovo: Detalhes dos orçamentos:');
    orcamentos.forEach((orcamento, index) => {
      console.log(`  ${index + 1}. ${orcamento.id.slice(-8)} - Status: ${orcamento.status} - ${orcamento.necessidade.substring(0, 30)}...`);
    });
    
    const statusSummary = {
      abertos: orcamentos.filter(o => o.status === 'aberto').length,
      fechados: orcamentos.filter(o => o.status === 'fechado').length
    };
    console.log('📊 MeusOrcamentosNovo: Resumo por status:', statusSummary);
  }

  // Estado de loading
  if (loading) {
    console.log('⏳ MeusOrcamentosNovo: Mostrando loading state');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando seus orçamentos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    console.log('❌ MeusOrcamentosNovo: Mostrando error state:', error);
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <Card className="bg-white shadow-lg border border-red-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={recarregar}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usuário não autenticado
  if (!user) {
    console.log('🚫 MeusOrcamentosNovo: Usuário não autenticado');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center text-gray-600">
            Você precisa estar logado para ver seus orçamentos.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado vazio
  if (orcamentos.length === 0) {
    console.log('📭 MeusOrcamentosNovo: Mostrando estado vazio');
    return (
      <div className="space-y-6">
        {/* Workflow de Revisões - mesmo no estado vazio */}
        <RevisionWorkflow />
        
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            0 inscrições
          </Badge>
        </div>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center text-gray-600">
            <div className="mb-4">📋</div>
            <p className="mb-4">Você ainda não se inscreveu em nenhum orçamento.</p>
            <p className="text-sm text-gray-500">
              Vá para a aba "Orçamentos Disponíveis" para encontrar oportunidades.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lista de orçamentos
  console.log('📋 MeusOrcamentosNovo: Renderizando lista de orçamentos');
  return (
    <div className="space-y-6">
      {/* Workflow de Revisões - sempre no topo */}
      <RevisionWorkflow />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            {orcamentos.length} {orcamentos.length === 1 ? 'inscrição' : 'inscrições'}
          </Badge>
          <Button 
            onClick={recarregar}
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {orcamentos.map((orcamento, index) => {
          console.log(`🔄 MeusOrcamentosNovo: Renderizando card ${index + 1} - ${orcamento.id.slice(-8)} - Status: ${orcamento.status}`);
          return (
            <MeusOrcamentosCard
              key={orcamento.inscricaoId}
              orcamento={orcamento}
              onStatusChange={recarregar}
            />
          );
        })}
      </div>
    </div>
  );
};
