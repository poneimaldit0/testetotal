import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { CATEGORIAS_SERVICO, PRAZOS_INICIO, OPCOES_ORDENACAO } from '@/constants/orcamento';

interface Filtros {
  local: string;
  categoria: string;
  prazoInicio: string;
  metragemMin: string;
  metragemMax: string;
  dataInicio: string;
  dataFim: string;
  ordenacao: string;
}

interface OrcamentoFiltersProps {
  filtros: Filtros;
  onFiltroChange: (field: string, value: string) => void;
  onLimparFiltros: () => void;
  filtrosAtivos: number;
}

export const OrcamentoFilters: React.FC<OrcamentoFiltersProps> = ({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  filtrosAtivos,
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="goodref-card">
      <CardHeader className="pb-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Filter className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Filtros
                  {filtrosAtivos > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {filtrosAtivos}
                    </Badge>
                  )}
                  {isMobile && (isOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            {filtrosAtivos > 0 && (
              <Button
                onClick={onLimparFiltros}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs md:text-sm"
              >
                <X className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Limpar</span>
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <CardContent className="px-0 pt-4">
              {/* Primeira linha - Filtros principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="categoria" className="text-xs md:text-sm">Categoria</Label>
                  <Select value={filtros.categoria} onValueChange={(value) => onFiltroChange('categoria', value === 'todas' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {CATEGORIAS_SERVICO.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="prazoInicio" className="text-xs md:text-sm">Prazo de Início</Label>
                  <Select value={filtros.prazoInicio} onValueChange={(value) => onFiltroChange('prazoInicio', value === 'todos' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {PRAZOS_INICIO.map((prazo) => (
                        <SelectItem key={prazo} value={prazo}>
                          {prazo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="ordenacao" className="text-xs md:text-sm">Ordenar por</Label>
                  <Select value={filtros.ordenacao} onValueChange={(value) => onFiltroChange('ordenacao', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mais recentes" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_ORDENACAO.map((opcao) => (
                        <SelectItem key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="local" className="text-xs md:text-sm">Local</Label>
                  <Input
                    id="local"
                    value={filtros.local}
                    onChange={(e) => onFiltroChange('local', e.target.value)}
                    placeholder="Cidade, estado..."
                  />
                </div>
              </div>

              {/* Segunda linha - Filtros adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="metragemMin" className="text-xs md:text-sm">Metragem Mín.</Label>
                  <Input
                    id="metragemMin"
                    type="number"
                    value={filtros.metragemMin}
                    onChange={(e) => onFiltroChange('metragemMin', e.target.value)}
                    placeholder="Ex: 50"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="metragemMax" className="text-xs md:text-sm">Metragem Máx.</Label>
                  <Input
                    id="metragemMax"
                    type="number"
                    value={filtros.metragemMax}
                    onChange={(e) => onFiltroChange('metragemMax', e.target.value)}
                    placeholder="Ex: 200"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dataInicio" className="text-xs md:text-sm">Data Publicação (de)</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => onFiltroChange('dataInicio', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dataFim" className="text-xs md:text-sm">Data Publicação (até)</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => onFiltroChange('dataFim', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
};
