import { useState, useEffect } from 'react';
import { Profile, EstatisticasFornecedor } from '@/types/supabase';
import { CreateUserData, CreateAdminUserData } from '@/types/userManagement';
import { useToast } from '@/hooks/use-toast';
import { userManagementService } from '@/services/userManagementService';
import { useFinanceiro } from '@/hooks/useFinanceiro';

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

interface CreateUserWithContasData extends CreateUserData {
  contasReceber?: ContaReceberFormData[];
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { criarContaReceberRecorrente } = useFinanceiro();

  const fetchUsers = async () => {
    console.log('🔍 [HOOK] Iniciando busca de usuários...');
    setLoading(true);
    
    try {
      const users = await userManagementService.fetchUsers();
      setUsers(users);
    } catch (error) {
      console.error('❌ [HOOK] Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    console.log('🔄 [HOOK] Refresh manual solicitado');
    await fetchUsers();
    toast({
      title: "Atualizado",
      description: "Lista de usuários atualizada",
    });
  };

  const createUser = async (userData: CreateUserData | CreateAdminUserData) => {
    console.log('➕ [HOOK] Criando usuário:', userData.email);
    
    try {
      const isAdminUser = ['admin', 'master', 'gestor_conta', 'customer_success', 'sdr', 'gestor_marcenaria', 'consultor_marcenaria', 'closer', 'pre_vendas'].includes(userData.tipo_usuario);
      const hasPassword = 'password' in userData;

      let success: boolean;
      
      if (isAdminUser && hasPassword) {
        // Use admin creation for administrative users with password
        success = await userManagementService.createAdminUser(userData as CreateAdminUserData);
        if (success) {
          toast({
            title: "Usuário administrativo criado com sucesso!",
            description: `O usuário ${userData.nome} foi criado e pode fazer login imediatamente.`,
          });
        }
      } else {
        // Use regular creation for suppliers or admin users without password
        success = await userManagementService.createUser(userData);
        if (success) {
          toast({
            title: "Usuário criado com sucesso!",
            description: `Um email de confirmação foi enviado para ${userData.email}.`,
          });
        }
      }

      if (success) {
        // Recarregar lista após delay
        setTimeout(() => {
          fetchUsers();
        }, 3000);
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ [HOOK] Erro ao criar usuário:', error);
      
      if (error.message.includes('já está cadastrado')) {
        toast({
          title: "Usuário já existe",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar usuário",
          description: error.message || "Erro inesperado ao criar usuário",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    console.log('📝 [HOOK] Atualizando usuário:', { userId, updates });
    
    try {
      await userManagementService.updateUser(userId, updates);
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
      
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('❌ [HOOK] Erro ao atualizar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    console.log('🗑️ [HOOK] Excluindo usuário:', userId);
    
    try {
      const response = await userManagementService.deleteUser(userId);

      if (response?.success) {
        toast({
          title: "Usuário excluído",
          description: `Usuário ${response.email} foi excluído com sucesso`,
        });
        
        await fetchUsers();
        return true;
      } else {
        toast({
          title: "Erro ao excluir usuário",
          description: response?.message || "Erro desconhecido",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ [HOOK] Erro ao excluir usuário:', error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserStats = async (userId: string): Promise<EstatisticasFornecedor | null> => {
    try {
      return await userManagementService.getUserStats(userId);
    } catch (error) {
      console.error('❌ [HOOK] Erro ao buscar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas do usuário",
        variant: "destructive",
      });
      return null;
    }
  };

  // Carregamento inicial
  useEffect(() => {
    console.log('🚀 [HOOK] Iniciando carregamento inicial de usuários');
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
  };
};