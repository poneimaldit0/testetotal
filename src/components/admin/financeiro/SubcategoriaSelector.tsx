import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import type { SubcategoriaFinanceira } from '@/types/financeiro';

interface SubcategoriaSelectorProps {
  categoriaId: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}

export function SubcategoriaSelector({
  categoriaId,
  value,
  onValueChange,
  placeholder = "Sem apropriação",
  disabled = false,
  required = false,
  label = "Subcategoria (opcional)",
  className
}: SubcategoriaSelectorProps) {
  const [subcategorias, setSubcategorias] = useState<SubcategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(false);
  const { buscarSubcategorias } = useConfiguracaoFinanceira();
  
  // Refs para controlar carregamento e evitar loops
  const loadingRef = useRef(false);
  const lastCategoriaRef = useRef<string>('');
  
  // Preservar o valor inicial para exibir durante o carregamento
  const initialValueRef = useRef<string | undefined>(value);

  // Atualizar ref inicial quando value muda de fora (ex: ao abrir modal de edição)
  useEffect(() => {
    if (value && !initialValueRef.current) {
      initialValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const carregarSubcategorias = async () => {
      // Se não há categoria, limpar
      if (!categoriaId) {
        setSubcategorias([]);
        setLoading(false);
        lastCategoriaRef.current = '';
        initialValueRef.current = undefined;
        return;
      }

      // Se já está carregando esta categoria, ignorar
      if (loadingRef.current && lastCategoriaRef.current === categoriaId) {
        return;
      }

      // Se já carregou esta categoria e tem dados, não recarregar
      if (lastCategoriaRef.current === categoriaId && subcategorias.length > 0) {
        return;
      }

      loadingRef.current = true;
      lastCategoriaRef.current = categoriaId;
      setLoading(true);
      
      try {
        const subs = await buscarSubcategorias(categoriaId);
        const subsAtivas = subs.filter(s => s.ativa);
        setSubcategorias(subsAtivas);
        
        // Forçar re-seleção se o valor inicial existe na lista carregada
        if (initialValueRef.current && subsAtivas.find(s => s.id === initialValueRef.current)) {
          onValueChange(initialValueRef.current);
        }
      } catch (error) {
        console.error('Erro ao carregar subcategorias:', error);
        setSubcategorias([]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    };

    carregarSubcategorias();
  }, [categoriaId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!categoriaId) {
    return null;
  }

  // Determinar o valor a ser exibido
  const displayValue = value || "none";
  
  // Encontrar nome da subcategoria selecionada (incluindo valores que ainda não estão na lista carregada)
  const getSubcategoriaNome = () => {
    if (!value) return null;
    const found = subcategorias.find(s => s.id === value);
    if (found) return found.nome;
    // Se ainda está carregando e temos um valor, mostrar que está carregando
    if (loading && value) return 'Carregando...';
    return null;
  };

  // Key dinâmica para forçar re-render quando subcategorias carregam
  const selectKey = `${categoriaId}-${subcategorias.length}-${value || 'none'}`;

  return (
    <div className={className} style={{ position: 'relative', zIndex: 5 }}>
      <Label htmlFor="subcategoria">{label}</Label>
      <Select 
        key={selectKey}
        value={displayValue} 
        onValueChange={(val) => onValueChange(val === "none" ? "" : val)}
        disabled={disabled || loading}
      >
        <SelectTrigger className="mt-1" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}>
          <SelectValue placeholder={loading ? "Carregando subcategorias..." : placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[60] bg-background border shadow-lg">
          <SelectItem value="none">Sem apropriação</SelectItem>
          {subcategorias.map((subcategoria) => (
            <SelectItem key={subcategoria.id} value={subcategoria.id}>
              {subcategoria.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <p className="text-xs text-muted-foreground mt-1">
          Carregando subcategorias...
        </p>
      )}
      {!loading && subcategorias.length === 0 && categoriaId && (
        <p className="text-xs text-muted-foreground mt-1">
          Nenhuma subcategoria disponível para esta categoria
        </p>
      )}
      {!loading && value && getSubcategoriaNome() && (
        <p className="text-xs text-muted-foreground mt-1">
          Subcategoria selecionada: {getSubcategoriaNome()}
        </p>
      )}
    </div>
  );
}