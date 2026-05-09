
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useMeusOrcamentos } from '@/hooks/useMeusOrcamentos';
import { OrcamentoInscritoCard } from './OrcamentoInscritoCard';
import { LoadingState, NotAuthenticatedState, EmptyState } from './MeusOrcamentosStates';

export const MeusOrcamentos: React.FC = () => {
  const { user } = useAuth();
  const { orcamentosInscritos, loading, recarregar } = useMeusOrcamentos(user?.id);

  console.log('🏠 MeusOrcamentos: Renderizando componente');
  console.log('👤 MeusOrcamentos: User ID:', user?.id);
  console.log('⏳ MeusOrcamentos: Loading state:', loading);
  console.log('📋 MeusOrcamentos: Orçamentos recebidos:', orcamentosInscritos);
  console.log('🔢 MeusOrcamentos: Quantidade de orçamentos:', orcamentosInscritos.length);

  if (!user) {
    console.log('🚫 MeusOrcamentos: Usuário não autenticado');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-secondary">Meus Orçamentos</h2>
        <NotAuthenticatedState />
      </div>
    );
  }

  if (loading) {
    console.log('⏳ MeusOrcamentos: Exibindo estado de loading');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-secondary">Meus Orçamentos</h2>
        <LoadingState />
      </div>
    );
  }

  console.log('🎯 MeusOrcamentos: Preparando para renderizar lista de orçamentos');
  
  // Log detalhado de cada orçamento que será renderizado
  orcamentosInscritos.forEach((orcamento, index) => {
    console.log(`📄 MeusOrcamentos: Orçamento ${index + 1} para renderizar:`, {
      id: orcamento.id,
      status: orcamento.status,
      necessidade: orcamento.necessidade?.substring(0, 50) + '...',
      dataInscricao: orcamento.dataInscricao,
      quantidadeEmpresas: orcamento.quantidadeEmpresas
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary">Meus Orçamentos</h2>
        <Badge variant="outline" className="text-primary border-primary">
          {orcamentosInscritos.length} inscrições
        </Badge>
      </div>

      {orcamentosInscritos.length === 0 ? (
        <>
          {console.log('📭 MeusOrcamentos: Exibindo estado vazio')}
          <EmptyState />
        </>
      ) : (
        <>
          {console.log('📋 MeusOrcamentos: Renderizando grid de orçamentos')}
          <div className="grid gap-4">
            {orcamentosInscritos.map((orcamento, index) => {
              console.log(`🔄 MeusOrcamentos: Renderizando card ${index + 1} - ID: ${orcamento.id} - Status: ${orcamento.status}`);
              return (
                <OrcamentoInscritoCard
                  key={orcamento.id}
                  orcamento={orcamento}
                  onStatusChange={recarregar}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
