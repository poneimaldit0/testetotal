import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface GestorMarcenaria {
  id: string;
  nome: string;
  email: string;
}

interface SeletorGestorMarcenariaProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  permitirRemover?: boolean;
}

export const SeletorGestorMarcenaria = ({
  value,
  onValueChange,
  placeholder = "Selecione um gestor de marcenaria",
  permitirRemover = false
}: SeletorGestorMarcenariaProps) => {
  const [gestores, setGestores] = useState<GestorMarcenaria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarGestores = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('tipo_usuario', ['gestor_marcenaria', 'consultor_marcenaria'])
          .eq('status', 'ativo')
          .order('nome');

        if (error) {
          console.error('Erro ao buscar gestores de marcenaria:', error);
          return;
        }

        setGestores(data || []);
      } catch (error) {
        console.error('Erro ao buscar gestores:', error);
      } finally {
        setLoading(false);
      }
    };

    buscarGestores();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando gestores...</span>
      </div>
    );
  }

  if (gestores.length === 0) {
    return (
      <div className="p-2 border rounded-md text-sm text-muted-foreground">
        Nenhum gestor de marcenaria ativo encontrado
      </div>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(val) => onValueChange(val === 'remover' ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {permitirRemover && (
          <SelectItem value="remover">
            <span className="text-muted-foreground italic">Remover apropriação</span>
          </SelectItem>
        )}
        {gestores.map((gestor) => (
          <SelectItem key={gestor.id} value={gestor.id}>
            <div className="flex flex-col">
              <span className="font-medium">{gestor.nome}</span>
              <span className="text-xs text-muted-foreground">{gestor.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
