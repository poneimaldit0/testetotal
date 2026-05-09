import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChecklistItens } from '@/hooks/useChecklistItens';

interface ChecklistSelectorProps {
  selectedItems: Array<{ itemId: string; obrigatorio: boolean }>;
  onSelectionChange: (selectedItems: Array<{ itemId: string; obrigatorio: boolean }>) => void;
}

export const ChecklistSelector: React.FC<ChecklistSelectorProps> = ({
  selectedItems,
  onSelectionChange,
}) => {
  const { itemsByCategory, loading } = useChecklistItens();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  const isItemSelected = (itemId: string) => {
    return selectedItems.some(item => item.itemId === itemId);
  };

  const isItemObrigatorio = (itemId: string) => {
    const item = selectedItems.find(item => item.itemId === itemId);
    return item?.obrigatorio || false;
  };

  const handleItemToggle = (itemId: string) => {
    const isSelected = isItemSelected(itemId);
    
    if (isSelected) {
      // Remover item
      const newSelection = selectedItems.filter(item => item.itemId !== itemId);
      onSelectionChange(newSelection);
    } else {
      // Adicionar item
      const newSelection = [...selectedItems, { itemId, obrigatorio: false }];
      onSelectionChange(newSelection);
    }
  };

  const handleObrigatorioToggle = (itemId: string) => {
    const newSelection = selectedItems.map(item => 
      item.itemId === itemId 
        ? { ...item, obrigatorio: !item.obrigatorio }
        : item
    );
    onSelectionChange(newSelection);
  };

  const getCategoryStats = (categoria: string) => {
    const items = itemsByCategory[categoria] || [];
    const selected = items.filter(item => isItemSelected(item.id)).length;
    const obrigatorios = items.filter(item => isItemSelected(item.id) && isItemObrigatorio(item.id)).length;
    return { total: items.length, selected, obrigatorios };
  };

  const getEmojiForCategory = (categoria: string) => {
    const emojiMap: { [key: string]: string } = {
      'Etapas Iniciais': '📦',
      'Demolições e Preparações': '🧱',
      'Infraestrutura hidráulica': '🚰',
      'Infraestrutura elétrica': '⚡',
      'Outras infraestruturas': '🔊',
      'Alvenaria e ajustes de layout': '🧱',
      'Instalação de revestimentos': '🔨',
      'Forro e iluminação': '💡',
      'Acabamentos e pintura': '🎨',
      'Esquadrias, portas e marcenaria': '🚪',
      'Louças e metais': '🚿',
      'Limpeza e entrega final': '🧼',
    };
    return emojiMap[categoria] || '📋';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando checklist...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Checklist de Itens (Opcional)
        </CardTitle>
        <CardDescription>
          Selecione os itens que os fornecedores deverão incluir em suas propostas.
          Itens marcados como obrigatórios devem ser preenchidos pelos fornecedores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(itemsByCategory).map(([categoria, items]) => {
          const stats = getCategoryStats(categoria);
          const isExpanded = expandedCategories.has(categoria);
          
          return (
            <Collapsible key={categoria} open={isExpanded} onOpenChange={() => toggleCategory(categoria)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-lg">{getEmojiForCategory(categoria)}</span>
                  <span className="font-medium">{categoria}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stats.selected > 0 && (
                    <>
                      <Badge variant="secondary">
                        {stats.selected}/{stats.total} selecionados
                      </Badge>
                      {stats.obrigatorios > 0 && (
                        <Badge variant="destructive">
                          {stats.obrigatorios} obrigatórios
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 ml-4 space-y-2">
                {items.map((item) => {
                  const selected = isItemSelected(item.id);
                  const obrigatorio = isItemObrigatorio(item.id);
                  
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-2 border rounded bg-card">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.nome}</span>
                          {selected && (
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={obrigatorio}
                                onCheckedChange={() => handleObrigatorioToggle(item.id)}
                                className="h-3 w-3"
                              />
                              <AlertCircle className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Obrigatório</span>
                            </div>
                          )}
                        </div>
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {selectedItems.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4" />
              Resumo da seleção
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedItems.length} itens selecionados 
              ({selectedItems.filter(item => item.obrigatorio).length} obrigatórios)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};