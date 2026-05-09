
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrcamento } from '@/context/OrcamentoContext';
import { Search, Filter, X, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIAS_SERVICO } from '@/types';

interface FiltroAvancadoOrcamentosProps {
  onFilteredResults: (filteredOrcamentos: any[]) => void;
  onClearFilter: () => void;
}

export const FiltroAvancadoOrcamentos: React.FC<FiltroAvancadoOrcamentosProps> = ({
  onFilteredResults,
  onClearFilter
}) => {
  const { orcamentos } = useOrcamento();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  const [filtros, setFiltros] = useState({
    buscaGeral: '',
    status: '',
    categoria: '',
    local: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    fornecedorNome: '',
    fornecedorEmpresa: '',
    fornecedorTelefone: '',
    fornecedorEmail: '',
    tamanhoMin: '',
    tamanhoMax: '',
  });

  // Função para normalizar texto (remover acentos e converter para minúsculo)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Aplicar filtros
  const filteredResults = useMemo(() => {
    if (!Object.values(filtros).some(value => value.trim())) return [];

    return orcamentos.filter(orcamento => {
      // Busca geral - pesquisa em todos os campos textuais
      if (filtros.buscaGeral.trim()) {
        const searchTerm = normalizeText(filtros.buscaGeral);
        const searchableFields = [
          orcamento.id,
          orcamento.necessidade,
          orcamento.local,
          ...orcamento.categorias,
          orcamento.dadosContato?.nome || '',
          orcamento.dadosContato?.telefone || '',
          orcamento.dadosContato?.email || '',
          ...orcamento.fornecedoresInscritos.map(f => `${f.nome} ${f.empresa} ${f.email} ${f.telefone}`)
        ];
        
        const matches = searchableFields.some(field => 
          normalizeText(field.toString()).includes(searchTerm)
        );
        
        if (!matches) return false;
      }

      // Filtro por status
      if (filtros.status && orcamento.status !== filtros.status) {
        return false;
      }

      // Filtro por categoria
      if (filtros.categoria && !orcamento.categorias.includes(filtros.categoria)) {
        return false;
      }

      // Filtro por local
      if (filtros.local && !normalizeText(orcamento.local).includes(normalizeText(filtros.local))) {
        return false;
      }

      // Filtros de cliente
      if (filtros.clienteNome && orcamento.dadosContato) {
        if (!normalizeText(orcamento.dadosContato.nome || '').includes(normalizeText(filtros.clienteNome))) {
          return false;
        }
      }
      
      if (filtros.clienteTelefone && orcamento.dadosContato) {
        if (!orcamento.dadosContato.telefone?.includes(filtros.clienteTelefone)) {
          return false;
        }
      }
      
      if (filtros.clienteEmail && orcamento.dadosContato) {
        if (!normalizeText(orcamento.dadosContato.email || '').includes(normalizeText(filtros.clienteEmail))) {
          return false;
        }
      }

      // Filtros de fornecedor
      if (filtros.fornecedorNome || filtros.fornecedorEmpresa || filtros.fornecedorTelefone || filtros.fornecedorEmail) {
        const matchesFornecedor = orcamento.fornecedoresInscritos.some(fornecedor => {
          if (filtros.fornecedorNome && !normalizeText(fornecedor.nome).includes(normalizeText(filtros.fornecedorNome))) {
            return false;
          }
          if (filtros.fornecedorEmpresa && !normalizeText(fornecedor.empresa).includes(normalizeText(filtros.fornecedorEmpresa))) {
            return false;
          }
          if (filtros.fornecedorTelefone && !fornecedor.telefone.includes(filtros.fornecedorTelefone)) {
            return false;
          }
          if (filtros.fornecedorEmail && !normalizeText(fornecedor.email).includes(normalizeText(filtros.fornecedorEmail))) {
            return false;
          }
          return true;
        });
        
        if (!matchesFornecedor) return false;
      }

      // Filtro por tamanho do imóvel
      if (filtros.tamanhoMin && orcamento.tamanhoImovel < parseInt(filtros.tamanhoMin)) {
        return false;
      }
      if (filtros.tamanhoMax && orcamento.tamanhoImovel > parseInt(filtros.tamanhoMax)) {
        return false;
      }

      return true;
    });
  }, [orcamentos, filtros]);

  const handleFiltroChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    if (Object.values(filtros).some(value => value.trim())) {
      setIsActive(true);
      onFilteredResults(filteredResults);
    }
  };

  const handleClear = () => {
    setFiltros({
      buscaGeral: '',
      status: '',
      categoria: '',
      local: '',
      clienteNome: '',
      clienteTelefone: '',
      clienteEmail: '',
      fornecedorNome: '',
      fornecedorEmpresa: '',
      fornecedorTelefone: '',
      fornecedorEmail: '',
      tamanhoMin: '',
      tamanhoMax: '',
    });
    setIsActive(false);
    onClearFilter();
  };

  const hasActiveFilters = Object.values(filtros).some(value => value.trim());

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filtro Avançado de Orçamentos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-w-full overflow-hidden">
        {/* Busca Geral */}
        <div className="flex gap-2 max-w-full">
          <Input
            placeholder="Busca geral..."
            value={filtros.buscaGeral}
            onChange={(e) => handleFiltroChange('buscaGeral', e.target.value)}
            className="flex-1 max-w-full min-w-0"
          />
          <Button 
            onClick={handleSearch}
            disabled={!hasActiveFilters}
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

        {/* Filtros Específicos (Expandível) */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Filtros do Orçamento */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-primary">Dados do Orçamento</h4>
              
              <Select value={filtros.status} onValueChange={(value) => handleFiltroChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtros.categoria} onValueChange={(value) => handleFiltroChange('categoria', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_SERVICO.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Local"
                value={filtros.local}
                onChange={(e) => handleFiltroChange('local', e.target.value)}
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Tamanho mín. (m²)"
                  type="number"
                  value={filtros.tamanhoMin}
                  onChange={(e) => handleFiltroChange('tamanhoMin', e.target.value)}
                />
                <Input
                  placeholder="Tamanho máx. (m²)"
                  type="number"
                  value={filtros.tamanhoMax}
                  onChange={(e) => handleFiltroChange('tamanhoMax', e.target.value)}
                />
              </div>
            </div>

            {/* Filtros do Cliente */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-primary">Dados do Cliente</h4>
              
              <Input
                placeholder="Nome do cliente"
                value={filtros.clienteNome}
                onChange={(e) => handleFiltroChange('clienteNome', e.target.value)}
              />
              
              <Input
                placeholder="Telefone do cliente"
                value={filtros.clienteTelefone}
                onChange={(e) => handleFiltroChange('clienteTelefone', e.target.value)}
              />
              
              <Input
                placeholder="Email do cliente"
                value={filtros.clienteEmail}
                onChange={(e) => handleFiltroChange('clienteEmail', e.target.value)}
              />
            </div>

            {/* Filtros do Fornecedor */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-primary">Dados do Fornecedor</h4>
              
              <Input
                placeholder="Nome do fornecedor"
                value={filtros.fornecedorNome}
                onChange={(e) => handleFiltroChange('fornecedorNome', e.target.value)}
              />
              
              <Input
                placeholder="Empresa do fornecedor"
                value={filtros.fornecedorEmpresa}
                onChange={(e) => handleFiltroChange('fornecedorEmpresa', e.target.value)}
              />
              
              <Input
                placeholder="Telefone do fornecedor"
                value={filtros.fornecedorTelefone}
                onChange={(e) => handleFiltroChange('fornecedorTelefone', e.target.value)}
              />
              
              <Input
                placeholder="Email do fornecedor"
                value={filtros.fornecedorEmail}
                onChange={(e) => handleFiltroChange('fornecedorEmail', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Resultados e Estatísticas */}
        {isActive && filteredResults.length > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-primary">Resultados da Busca</h4>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-primary">
                Total: {filteredResults.length} orçamentos
              </Badge>
              <Badge className="bg-green-500">
                Abertos: {filteredResults.filter(o => o.status === 'aberto').length}
              </Badge>
              <Badge className="bg-blue-500">
                Fechados: {filteredResults.filter(o => o.status === 'fechado').length}
              </Badge>
            </div>
          </div>
        )}

        {isActive && hasActiveFilters && filteredResults.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum orçamento encontrado com os filtros aplicados.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
