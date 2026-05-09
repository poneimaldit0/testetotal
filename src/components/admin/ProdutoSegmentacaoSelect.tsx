import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProdutosSegmentacao } from '@/hooks/useProdutosSegmentacao';
import { Tag } from 'lucide-react';

interface ProdutoSegmentacaoSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  label?: string;
  description?: string;
  showEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

export const ProdutoSegmentacaoSelect: React.FC<ProdutoSegmentacaoSelectProps> = ({
  value,
  onValueChange,
  label = 'Produto/Segmentação',
  description,
  showEmpty = true,
  emptyLabel = 'Todos os produtos',
  disabled = false,
}) => {
  const { produtosAtivos, loading } = useProdutosSegmentacao();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        {label}
      </Label>
      <Select
        value={value || 'TODOS'}
        onValueChange={(val) => onValueChange(val === 'TODOS' ? null : val)}
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione um produto'} />
        </SelectTrigger>
        <SelectContent>
          {showEmpty && (
            <SelectItem value="TODOS">
              <span className="text-muted-foreground">{emptyLabel}</span>
            </SelectItem>
          )}
          {produtosAtivos.map((produto) => (
            <SelectItem key={produto.id} value={produto.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: produto.cor }}
                />
                {produto.nome}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
