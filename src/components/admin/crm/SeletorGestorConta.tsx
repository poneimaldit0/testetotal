import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Gestor {
  id: string;
  nome: string;
  email: string;
}

interface SeletorGestorContaProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  permitirRemover?: boolean;
}

export const SeletorGestorConta = ({
  value,
  onValueChange,
  placeholder = "Selecionar gestor responsável",
  permitirRemover = true
}: SeletorGestorContaProps) => {
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const carregarGestores = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .eq('tipo_usuario', 'gestor_conta')
          .eq('status', 'ativo')
          .order('nome');

        if (error) throw error;
        setGestores(data || []);
      } catch (error) {
        console.error('Erro ao carregar gestores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarGestores();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando gestores...</span>
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
            {gestor.nome} ({gestor.email})
          </SelectItem>
        ))}
        {gestores.length === 0 && (
          <div className="py-2 px-3 text-sm text-muted-foreground">
            Nenhum gestor de conta ativo encontrado
          </div>
        )}
      </SelectContent>
    </Select>
  );
};