
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useOrcamentosGlobal } from '@/hooks/useOrcamentosGlobal';
import { MeusOrcamentosCard } from './MeusOrcamentosCard';
import { StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

export const MeusOrcamentosSimples: React.FC = () => {
  const { obterMeusOrcamentos, loading, error, recarregar } = useOrcamentosGlobal();
  const meusOrcamentos = obterMeusOrcamentos();

  console.log('🏠 MeusOrcamentosSimples: Renderizando componente');
  console.log('📋 MeusOrcamentosSimples: Meus orçamentos:', meusOrcamentos.length);

  if (meusOrcamentos.length > 0) {
    console.log('📊 MeusOrcamentosSimples: Detalhes dos meus orçamentos:');
    meusOrcamentos.forEach((orcamento, index) => {
      console.log(`  ${index + 1}. ${orcamento.id.slice(-8)} - Status: ${orcamento.status} - Inscrito: ${orcamento.estaInscrito}`);
    });
    
    const statusSummary = {
      abertos: meusOrcamentos.filter(o => o.status === 'aberto').length,
      fechados: meusOrcamentos.filter(o => o.status === 'fechado').length
    };
    console.log('📊 MeusOrcamentosSimples: Resumo por status:', statusSummary);
  }

  if (loading) {
    console.log('⏳ MeusOrcamentosSimples: Mostrando loading state');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando seus orçamentos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    console.log('❌ MeusOrcamentosSimples: Mostrando error state:', error);
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

  if (meusOrcamentos.length === 0) {
    console.log('📭 MeusOrcamentosSimples: Mostrando estado vazio');
    return (
      <div className="space-y-4">
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

  console.log('📋 MeusOrcamentosSimples: Renderizando lista de orçamentos');
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            {meusOrcamentos.length} {meusOrcamentos.length === 1 ? 'inscrição' : 'inscrições'}
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
        {meusOrcamentos.map((orcamento, index) => {
          console.log(`🔄 MeusOrcamentosSimples: Renderizando card ${index + 1} - ${orcamento.id.slice(-8)} - Status: ${orcamento.status}`);
          
          // Garantir que dataInicio seja sempre uma Date para o componente
          const dataInicioProcessada = orcamento.dataInicio instanceof Date 
            ? orcamento.dataInicio 
            : new Date(); // Fallback para data atual se for string
          
          return (
            <MeusOrcamentosCard
              key={orcamento.inscricaoId || orcamento.id}
              orcamento={{
                id: orcamento.id,
                necessidade: orcamento.necessidade,
                categorias: orcamento.categorias,
                local: orcamento.local,
                tamanhoImovel: orcamento.tamanhoImovel,
                dataPublicacao: orcamento.dataPublicacao,
                dataInicio: dataInicioProcessada,
                dataInscricao: orcamento.inscritoEm!,
                status: orcamento.status,
                quantidadeEmpresas: orcamento.quantidadeEmpresas,
                dadosContato: orcamento.dadosContato,
                inscricaoId: orcamento.inscricaoId!,
                statusAcompanhamento: (orcamento.statusAcompanhamento as StatusAcompanhamento) || undefined,
              }}
              onStatusChange={recarregar}
            />
          );
        })}
      </div>
    </div>
  );
};
