import { useState, useMemo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useFornecedorSearch } from '@/hooks/useFornecedorSearch';

interface FornecedorSearchInputProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const FornecedorSearchInput = ({
  selectedIds,
  onSelectionChange,
}: FornecedorSearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { fornecedores, isLoading, error, isSearching } = useFornecedorSearch(searchTerm);

  const handleToggleFornecedor = (fornecedorId: string) => {
    if (selectedIds.includes(fornecedorId)) {
      onSelectionChange(selectedIds.filter(id => id !== fornecedorId));
    } else {
      onSelectionChange([...selectedIds, fornecedorId]);
    }
  };

  const handleRemoveSelected = (fornecedorId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== fornecedorId));
  };

  // Mapa de fornecedores selecionados para exibir badges
  const selectedFornecedores = useMemo(() => {
    return fornecedores.filter(f => selectedIds.includes(f.fornecedor_id));
  }, [fornecedores, selectedIds]);

  return (
    <div className="space-y-3">
      {/* Input de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Digite nome, empresa ou email do fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {(isSearching || isLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isSearching && !isLoading && searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Badges de Selecionados */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFornecedores.map((fornecedor) => (
            <Badge
              key={fornecedor.fornecedor_id}
              variant="secondary"
              className="gap-1"
            >
              {fornecedor.nome}
              <button
                onClick={() => handleRemoveSelected(fornecedor.fornecedor_id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Lista de Resultados */}
      <div className="border rounded-md bg-card">
        <ScrollArea className="h-[300px]">
          {/* Estado: Digite para buscar */}
          {!searchTerm.trim() && (
            <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar fornecedores
              </p>
            </div>
          )}

          {/* Estado: Termo muito curto */}
          {searchTerm.trim() && searchTerm.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Digite mais caracteres para buscar
              </p>
            </div>
          )}

          {/* Estado: Carregando */}
          {(isLoading || isSearching) && searchTerm.trim().length >= 2 && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado: Erro */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
              <X className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive">
                Erro ao buscar fornecedores
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente novamente em alguns instantes
              </p>
            </div>
          )}

          {/* Estado: Sem resultados */}
          {!isLoading && !error && searchTerm.trim().length >= 2 && fornecedores.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum fornecedor encontrado com "{searchTerm}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente buscar por nome, empresa ou email
              </p>
            </div>
          )}

          {/* Lista de Fornecedores */}
          {!isLoading && !error && fornecedores.length > 0 && (
            <div className="p-2">
              {fornecedores.map((fornecedor) => {
                const isSelected = selectedIds.includes(fornecedor.fornecedor_id);
                return (
                  <button
                    key={fornecedor.fornecedor_id}
                    onClick={() => handleToggleFornecedor(fornecedor.fornecedor_id)}
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleFornecedor(fornecedor.fornecedor_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fornecedor.nome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {fornecedor.empresa}
                      </p>
                      {fornecedor.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {fornecedor.email}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Contador de Selecionados */}
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selectedIds.length} fornecedor{selectedIds.length !== 1 ? 'es' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};
