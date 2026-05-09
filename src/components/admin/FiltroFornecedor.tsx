
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrcamento } from '@/context/OrcamentoContext';
import { Search, Filter, X, TrendingUp } from 'lucide-react';

interface FiltroFornecedorProps {
  onFilteredResults: (filteredOrcamentos: any[]) => void;
  onClearFilter: () => void;
}

export const FiltroFornecedor: React.FC<FiltroFornecedorProps> = ({
  onFilteredResults,
  onClearFilter
}) => {
  const { orcamentos } = useOrcamento();
  const [searchTerm, setSearchTerm] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Buscar orçamentos que contêm o fornecedor
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return orcamentos.filter(orcamento => 
      orcamento.fornecedoresInscritos.some(fornecedor => 
        fornecedor.nome.toLowerCase().includes(term) ||
        fornecedor.email.toLowerCase().includes(term) ||
        fornecedor.empresa.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, orcamentos]);

  // Estatísticas do fornecedor
  const fornecedorStats = useMemo(() => {
    if (!searchTerm.trim() || filteredResults.length === 0) return null;

    const term = searchTerm.toLowerCase();
    const fornecedorData = orcamentos
      .flatMap(o => o.fornecedoresInscritos)
      .find(f => 
        f.nome.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        f.empresa.toLowerCase().includes(term)
      );

    if (!fornecedorData) return null;

    const totalParticipacoes = filteredResults.length;
    const orcamentosFechados = filteredResults.filter(o => o.status === 'fechado').length;
    const orcamentosAbertos = filteredResults.filter(o => o.status === 'aberto').length;

    return {
      fornecedor: fornecedorData,
      totalParticipacoes,
      orcamentosFechados,
      orcamentosAbertos
    };
  }, [searchTerm, filteredResults, orcamentos]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setIsActive(true);
      onFilteredResults(filteredResults);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsActive(false);
    onClearFilter();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-primary" />
          Buscar por Fornecedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Digite nome, email ou empresa do fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={!searchTerm.trim()}
            className="goodref-button-primary"
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          {isActive && (
            <Button 
              onClick={handleClear}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {isActive && fornecedorStats && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-primary">Estatísticas do Fornecedor</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm"><strong>Empresa:</strong> {fornecedorStats.fornecedor.empresa}</p>
                <p className="text-sm"><strong>Responsável:</strong> {fornecedorStats.fornecedor.nome}</p>
                <p className="text-sm"><strong>Email:</strong> {fornecedorStats.fornecedor.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-primary">
                  Total: {fornecedorStats.totalParticipacoes} orçamentos
                </Badge>
                <Badge className="bg-green-500">
                  Fechados: {fornecedorStats.orcamentosFechados}
                </Badge>
                <Badge className="bg-blue-500">
                  Abertos: {fornecedorStats.orcamentosAbertos}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {isActive && searchTerm.trim() && filteredResults.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum orçamento encontrado para este fornecedor.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
