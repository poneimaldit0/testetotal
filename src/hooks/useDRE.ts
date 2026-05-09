import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DadosDRE {
  periodo: {
    inicio: string;
    fim: string;
  };
  receitas: {
    categoria: string;
    valor: number;
    quantidade: number;
    subcategorias?: Array<{
      subcategoria: string;
      valor: number;
      quantidade: number;
    }>;
  }[];
  despesas: {
    categoria: string;
    valor: number;
    quantidade: number;
    subcategorias?: Array<{
      subcategoria: string;
      valor: number;
      quantidade: number;
    }>;
  }[];
  totalReceitas: number;
  totalDespesas: number;
  resultadoOperacional: number;
  margemOperacional: number;
}

export interface ComparativoDRE {
  periodo1: DadosDRE;
  periodo2: DadosDRE;
  variacao: {
    receitas: number;
    despesas: number;
    resultado: number;
  };
}

export const useDRE = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const buscarDadosDRE = async (dataInicio: string, dataFim: string): Promise<DadosDRE | null> => {
    setLoading(true);
    
    try {
      // Buscar receitas por categoria
      const { data: receitasData, error: receitasError } = await supabase
        .from('transacoes_financeiras')
        .select(`
          valor,
          conta_receber:contas_receber(
            categoria:categorias_financeiras(nome),
            subcategoria:subcategorias_financeiras(nome)
          )
        `)
        .eq('tipo', 'recebimento')
        .gte('data_transacao', dataInicio)
        .lte('data_transacao', dataFim);

      if (receitasError) throw receitasError;

      // Buscar despesas por categoria
      const { data: despesasData, error: despesasError } = await supabase
        .from('transacoes_financeiras')
        .select(`
          valor,
          conta_pagar:contas_pagar(
            categoria:categorias_financeiras(nome),
            subcategoria:subcategorias_financeiras(nome)
          )
        `)
        .eq('tipo', 'pagamento')
        .gte('data_transacao', dataInicio)
        .lte('data_transacao', dataFim);

      if (despesasError) throw despesasError;

      // Agrupar receitas por categoria e subcategoria
      const receitasAgrupadas = new Map<string, { 
        valor: number; 
        quantidade: number; 
        subcategorias: Map<string, { valor: number; quantidade: number }>;
      }>();
      receitasData?.forEach(transacao => {
        const categoria = transacao.conta_receber?.categoria?.nome || 'Sem categoria';
        const subcategoria = transacao.conta_receber?.subcategoria?.nome || 'Sem apropriação';
        
        const atual = receitasAgrupadas.get(categoria) || { 
          valor: 0, 
          quantidade: 0, 
          subcategorias: new Map() 
        };
        
        atual.valor += (transacao.valor || 0);
        atual.quantidade += 1;
        
        const subAtual = atual.subcategorias.get(subcategoria) || { valor: 0, quantidade: 0 };
        subAtual.valor += (transacao.valor || 0);
        subAtual.quantidade += 1;
        atual.subcategorias.set(subcategoria, subAtual);
        
        receitasAgrupadas.set(categoria, atual);
      });

      // Agrupar despesas por categoria e subcategoria
      const despesasAgrupadas = new Map<string, { 
        valor: number; 
        quantidade: number; 
        subcategorias: Map<string, { valor: number; quantidade: number }>;
      }>();
      despesasData?.forEach(transacao => {
        const categoria = transacao.conta_pagar?.categoria?.nome || 'Sem categoria';
        const subcategoria = transacao.conta_pagar?.subcategoria?.nome || 'Sem apropriação';
        
        const atual = despesasAgrupadas.get(categoria) || { 
          valor: 0, 
          quantidade: 0, 
          subcategorias: new Map() 
        };
        
        atual.valor += (transacao.valor || 0);
        atual.quantidade += 1;
        
        const subAtual = atual.subcategorias.get(subcategoria) || { valor: 0, quantidade: 0 };
        subAtual.valor += (transacao.valor || 0);
        subAtual.quantidade += 1;
        atual.subcategorias.set(subcategoria, subAtual);
        
        despesasAgrupadas.set(categoria, atual);
      });

      // Converter para arrays com subcategorias
      const receitas = Array.from(receitasAgrupadas.entries()).map(([categoria, dados]) => ({
        categoria,
        valor: dados.valor,
        quantidade: dados.quantidade,
        subcategorias: Array.from(dados.subcategorias.entries()).map(([sub, subDados]) => ({
          subcategoria: sub,
          valor: subDados.valor,
          quantidade: subDados.quantidade
        }))
      }));

      const despesas = Array.from(despesasAgrupadas.entries()).map(([categoria, dados]) => ({
        categoria,
        valor: dados.valor,
        quantidade: dados.quantidade,
        subcategorias: Array.from(dados.subcategorias.entries()).map(([sub, subDados]) => ({
          subcategoria: sub,
          valor: subDados.valor,
          quantidade: subDados.quantidade
        }))
      }));

      const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0);
      const totalDespesas = despesas.reduce((acc, item) => acc + item.valor, 0);
      const resultadoOperacional = totalReceitas - totalDespesas;
      const margemOperacional = totalReceitas > 0 ? (resultadoOperacional / totalReceitas) * 100 : 0;

      return {
        periodo: { inicio: dataInicio, fim: dataFim },
        receitas,
        despesas,
        totalReceitas,
        totalDespesas,
        resultadoOperacional,
        margemOperacional
      };
    } catch (error: any) {
      toast({
        title: "Erro ao buscar dados do DRE",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const buscarComparativoDRE = async (
    periodo1: { inicio: string; fim: string },
    periodo2: { inicio: string; fim: string }
  ): Promise<ComparativoDRE | null> => {
    const dados1 = await buscarDadosDRE(periodo1.inicio, periodo1.fim);
    const dados2 = await buscarDadosDRE(periodo2.inicio, periodo2.fim);

    if (!dados1 || !dados2) return null;

    const variacao = {
      receitas: dados2.totalReceitas > 0 ? ((dados1.totalReceitas - dados2.totalReceitas) / dados2.totalReceitas) * 100 : 0,
      despesas: dados2.totalDespesas > 0 ? ((dados1.totalDespesas - dados2.totalDespesas) / dados2.totalDespesas) * 100 : 0,
      resultado: dados2.resultadoOperacional !== 0 ? ((dados1.resultadoOperacional - dados2.resultadoOperacional) / Math.abs(dados2.resultadoOperacional)) * 100 : 0
    };

    return {
      periodo1: dados1,
      periodo2: dados2,
      variacao
    };
  };

  return {
    loading,
    buscarDadosDRE,
    buscarComparativoDRE
  };
};