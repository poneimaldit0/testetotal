import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGestorConta } from '@/hooks/useGestorConta';
import { useCanManageOrcamentos } from '@/hooks/useCanManageOrcamentos';
import { UserCheck, UserX, Shuffle } from 'lucide-react';

interface GestorSelectorProps {
  value?: string;
  onValueChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  permitirSelecaoAutomatica?: boolean;
}

export const GestorSelector: React.FC<GestorSelectorProps> = ({
  value,
  onValueChange,
  label = "Gestor Responsável",
  placeholder = "Selecione um gestor de conta",
  disabled = false,
  permitirSelecaoAutomatica = false,
}) => {
  const { gestores, loading } = useGestorConta();
  const canManage = useCanManageOrcamentos();

  if (!canManage) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select
          value={value || "none"}
          onValueChange={(val) => onValueChange(val === "none" ? null : val)}
          disabled={disabled || loading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {permitirSelecaoAutomatica && (
              <>
                <SelectItem value="AUTO">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">
                      Selecionar Automaticamente (Próximo da Fila)
                    </span>
                  </div>
                </SelectItem>
                <SelectSeparator />
              </>
            )}
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-muted-foreground" />
                Sem gestor apropriado
              </div>
            </SelectItem>
            {gestores.map((gestor) => (
              <SelectItem key={gestor.id} value={gestor.id}>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">{gestor.nome}</div>
                    <div className="text-xs text-muted-foreground">{gestor.empresa}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onValueChange(null)}
            disabled={disabled}
            className="px-3"
          >
            <UserX className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {value && (
        <div className="text-xs text-muted-foreground">
          {gestores.find(g => g.id === value)?.nome} será responsável por este orçamento
        </div>
      )}
    </div>
  );
};