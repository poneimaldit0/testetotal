import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronRight } from 'lucide-react';

interface CategoriaHierarquicaProps {
  categoria: string;
  subcategoria?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'badge';
  showSeparator?: boolean;
}

export const CategoriaHierarquica = ({ 
  categoria, 
  subcategoria, 
  className = '', 
  variant = 'default',
  showSeparator = false 
}: CategoriaHierarquicaProps) => {
  const isSubcategorized = subcategoria && subcategoria !== 'Sem apropriação';

  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Badge variant="outline" className="text-xs">
          {categoria}
        </Badge>
        {isSubcategorized && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              {subcategoria}
            </Badge>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`text-sm ${className}`}>
        <span className="font-medium">{categoria}</span>
        {isSubcategorized && (
          <>
            <ChevronRight className="inline w-3 h-3 mx-1 text-muted-foreground" />
            <span className="text-muted-foreground">{subcategoria}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="font-medium text-sm">{categoria}</div>
      {isSubcategorized && (
        <>
          {showSeparator && <Separator className="my-1" />}
          <div className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
            {subcategoria}
          </div>
        </>
      )}
    </div>
  );
};

interface ResumoCategoriasHierarquicoProps {
  categorias: Array<{
    categoria: string;
    tipo: 'entrada' | 'saida';
    valor_total: number;
    quantidade: number;
    subcategorias?: Array<{
      subcategoria: string;
      valor_total: number;
      quantidade: number;
    }>;
  }>;
  formatCurrency: (value: number) => string;
}

export const ResumoCategoriasHierarquico = ({ 
  categorias, 
  formatCurrency 
}: ResumoCategoriasHierarquicoProps) => {
  const [expandidas, setExpandidas] = React.useState<Set<string>>(new Set());

  const toggleExpansao = (categoria: string) => {
    const novasExpandidas = new Set(expandidas);
    if (novasExpandidas.has(categoria)) {
      novasExpandidas.delete(categoria);
    } else {
      novasExpandidas.add(categoria);
    }
    setExpandidas(novasExpandidas);
  };

  return (
    <div className="space-y-2">
      {categorias.map((cat, index) => {
        const temSubcategorias = cat.subcategorias && cat.subcategorias.length > 0;
        const isExpandida = expandidas.has(cat.categoria);
        
        return (
          <div key={index} className="border rounded-lg p-3">
            <div 
              className={`flex items-center justify-between ${temSubcategorias ? 'cursor-pointer hover:bg-muted/30 -m-3 p-3 rounded-lg' : ''}`}
              onClick={() => temSubcategorias && toggleExpansao(cat.categoria)}
            >
              <div className="flex items-center gap-2">
                {temSubcategorias && (
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${isExpandida ? 'rotate-90' : ''}`}
                  />
                )}
                <div>
                  <div className="font-medium">{cat.categoria}</div>
                  <div className="text-xs text-muted-foreground">
                    {cat.quantidade} transação(ões)
                  </div>
                </div>
              </div>
              <div className={`text-right font-semibold ${cat.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cat.valor_total)}
              </div>
            </div>

            {temSubcategorias && isExpandida && (
              <div className="mt-3 pt-3 border-t space-y-2">
                {cat.subcategorias!.map((sub, subIndex) => (
                  <div key={subIndex} className="flex items-center justify-between pl-6 py-1">
                    <div>
                      <div className="text-sm">{sub.subcategoria}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.quantidade} transação(ões)
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${cat.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(sub.valor_total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};