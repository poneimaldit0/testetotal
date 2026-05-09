
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinanceiro } from '@/hooks/useFinanceiro';

interface CadastroPendente {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  empresa: string;
  created_at: string;
}

interface ContaReceberFormData {
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  categoria_id: string;
  observacoes: string;
  is_recorrente: boolean;
  frequencia_recorrencia: "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral" | "anual";
  quantidade_parcelas: number;
}

interface AprovarFornecedorData {
  userId: string;
  dataTerminoContrato: string;
  limiteAcessosDiarios: number;
  limiteAcessosMensais: number;
  observacoes?: string;
  contasReceber?: ContaReceberFormData[];
  clienteNome?: string;
  clienteEmail?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: string;
  email?: string;
}

export const useAprovacaoFornecedor = () => {
  const [cadastrosPendentes, setCadastrosPendentes] = useState<CadastroPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { criarContaReceberRecorrente } = useFinanceiro();

  const buscarCadastrosPendentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('obter_cadastros_pendentes');
      
      if (error) throw error;
      
      setCadastrosPendentes(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar cadastros pendentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cadastros pendentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aprovarFornecedor = async (dados: AprovarFornecedorData) => {
    try {
      const { data, error } = await supabase.rpc('aprovar_fornecedor_admin', {
        p_user_id: dados.userId,
        p_data_termino_contrato: dados.dataTerminoContrato,
        p_limite_acessos_diarios: dados.limiteAcessosDiarios,
        p_limite_acessos_mensais: dados.limiteAcessosMensais,
        p_observacoes: dados.observacoes
      });

      if (error) throw error;

      const response = data as unknown as ApiResponse;
      
      if (response?.success) {
        // Se há contas a receber para criar
        if (dados.contasReceber && dados.contasReceber.length > 0 && dados.clienteNome) {
          let contasCriadas = 0;
          let contasComErro = 0;
          
          for (const conta of dados.contasReceber) {
            try {
              const contaData = {
                cliente_nome: dados.clienteNome,
                cliente_email: dados.clienteEmail || "",
                cliente_telefone: "",
                descricao: conta.descricao,
                valor_original: conta.valor_original,
                data_vencimento: conta.data_vencimento,
                categoria_id: conta.categoria_id,
                observacoes: conta.observacoes,
                tipo_cliente: "novo" as const,
                fornecedor_id: "",
                is_recorrente: conta.is_recorrente,
                frequencia_recorrencia: conta.frequencia_recorrencia,
                quantidade_parcelas: conta.quantidade_parcelas
              };
              
              const contaCriada = await criarContaReceberRecorrente(contaData);
              if (contaCriada) {
                contasCriadas++;
              } else {
                contasComErro++;
              }
            } catch (error) {
              console.error('Erro ao criar conta a receber:', error);
              contasComErro++;
            }
          }
          
          if (contasCriadas > 0) {
            toast({
              title: "Fornecedor aprovado",
              description: `${response.email} foi aprovado e ${contasCriadas} conta(s) a receber criada(s)${contasComErro > 0 ? ` (${contasComErro} com erro)` : ''}`,
            });
          } else if (contasComErro > 0) {
            toast({
              title: "Fornecedor aprovado",
              description: `${response.email} foi aprovado, mas houve erro ao criar as contas a receber`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Fornecedor aprovado",
            description: `${response.email} foi aprovado com sucesso`,
          });
        }
        
        // Atualizar lista removendo o usuário aprovado
        setCadastrosPendentes(prev => 
          prev.filter(cadastro => cadastro.id !== dados.userId)
        );
        
        return true;
      } else {
        throw new Error(response?.message || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao aprovar fornecedor:', error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
      return false;
    }
  };

  const rejeitarFornecedor = async (userId: string, motivo?: string) => {
    try {
      const { data, error } = await supabase.rpc('rejeitar_fornecedor_admin', {
        p_user_id: userId,
        p_motivo: motivo
      });

      if (error) throw error;

      const response = data as unknown as ApiResponse;

      if (response?.success) {
        toast({
          title: "Fornecedor rejeitado",
          description: `${response.email} foi rejeitado e removido do sistema`,
        });
        
        // Atualizar lista removendo o usuário rejeitado
        setCadastrosPendentes(prev => 
          prev.filter(cadastro => cadastro.id !== userId)
        );
        
        return true;
      } else {
        throw new Error(response?.message || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao rejeitar fornecedor:', error);
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    cadastrosPendentes,
    loading,
    buscarCadastrosPendentes,
    aprovarFornecedor,
    rejeitarFornecedor,
  };
};
