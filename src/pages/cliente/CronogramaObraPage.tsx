import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CronogramaObra } from '@/components/cliente/CronogramaObra';

export const CronogramaObraPage: React.FC = () => {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  if (!obraId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Obra não encontrada</h1>
          <Button onClick={() => navigate('/cliente/obras')}>
            Voltar para Minhas Obras
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cronograma da Obra</h1>
        <Button
          variant="outline"
          onClick={() => navigate('/cliente/obras')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Minhas Obras
        </Button>
      </div>

      {/* Componente do cronograma - buscar contrato_id baseado na obra */}
      <CronogramaObraByObra obraId={obraId} />
    </div>
  );
};

// Componente auxiliar para buscar o contrato_id baseado na obra
const CronogramaObraByObra: React.FC<{ obraId: string }> = ({ obraId }) => {
  const { data: obra, isLoading } = useQuery({
    queryKey: ['obra', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('contrato_id')
        .eq('id', obraId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando cronograma...</p>
      </div>
    );
  }

  if (!obra?.contrato_id) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Não foi possível carregar o cronograma da obra.</p>
      </div>
    );
  }

  return <CronogramaObra contratoId={obra.contrato_id} />;
};