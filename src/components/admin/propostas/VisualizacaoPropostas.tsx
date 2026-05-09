import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, Filter } from 'lucide-react';
import { TabelaPropostas } from './TabelaPropostas';
import { DetalhesPropostaModal } from './DetalhesPropostaModal';
import { FiltrosPropostas } from './FiltrosPropostas';
import { usePropostas, PropostaResumo, FiltrosPropostas as TipoFiltros } from '@/hooks/usePropostas';
import { useToast } from '@/hooks/use-toast';
import { exportarListaPropostas } from '@/utils/exportacaoPropostas';

export const VisualizacaoPropostas: React.FC = () => {
  const { propostas, loading, carregarPropostas } = usePropostas();
  const [propostaSelecionada, setPropostaSelecionada] = useState<string | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  const handleVerDetalhes = (propostaId: string) => {
    setPropostaSelecionada(propostaId);
    setModalDetalhesAberto(true);
  };

  const handleAplicarFiltros = (filtros: TipoFiltros) => {
    carregarPropostas(filtros);
    setFiltrosAbertos(false);
  };

  const handleLimparFiltros = () => {
    carregarPropostas();
    setFiltrosAbertos(false);
  };

  const handleExportarLista = async () => {
    try {
      setExportando(true);
      const sucesso = exportarListaPropostas(propostas);
      
      if (sucesso) {
        toast({
          title: 'Sucesso',
          description: 'Lista de propostas exportada com sucesso!'
        });
      } else {
        throw new Error('Falha na exportação');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar a lista de propostas',
        variant: 'destructive'
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="goodref-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl text-secondary">Propostas de Orçamentos</CardTitle>
              <p className="text-muted-foreground">
                Visualize e gerencie todas as propostas enviadas pelos fornecedores
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button
                onClick={handleExportarLista}
                variant="outline"
                disabled={exportando || propostas.length === 0}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {exportando ? 'Exportando...' : 'Exportar Lista'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {filtrosAbertos && (
          <CardContent className="border-t">
            <FiltrosPropostas
              onAplicarFiltros={handleAplicarFiltros}
              onLimparFiltros={handleLimparFiltros}
            />
          </CardContent>
        )}
      </Card>

      <Card className="goodref-card">
        <CardContent className="p-0">
          <TabelaPropostas
            propostas={propostas}
            loading={loading}
            onVerDetalhes={handleVerDetalhes}
          />
        </CardContent>
      </Card>

      <DetalhesPropostaModal
        propostaId={propostaSelecionada}
        isOpen={modalDetalhesAberto}
        onClose={() => {
          setModalDetalhesAberto(false);
          setPropostaSelecionada(null);
        }}
      />
    </div>
  );
};