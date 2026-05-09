import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: { id: string; nome: string; cor: string };
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export function TagBadge({ tag, onRemove, size = 'sm' }: TagBadgeProps) {
  return (
    <Badge
      style={{ backgroundColor: tag.cor, color: '#fff', borderColor: tag.cor }}
      className={cn(
        "gap-1 border font-medium hover:opacity-90 transition-opacity",
        size === 'sm' && "text-xs px-2 py-0.5",
        size === 'md' && "text-sm px-3 py-1"
      )}
    >
      {tag.nome}
      {onRemove && (
        <X
          className={cn(
            "cursor-pointer hover:opacity-70",
            size === 'sm' && "h-3 w-3",
            size === 'md' && "h-4 w-4"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </Badge>
  );
}
