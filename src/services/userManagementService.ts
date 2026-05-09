import { supabase } from '@/integrations/supabase/client';
import { Profile, EstatisticasFornecedor } from '@/types/supabase';
import { DeleteUserResponse, CreateUserData, CreateAdminUserData } from '@/types/userManagement';

export const userManagementService = {
  async fetchUsers(): Promise<Profile[]> {
    console.log('🔍 [SERVICE] Iniciando busca de usuários...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 [SERVICE] Resposta do Supabase:', { data, error });

    if (error) {
      console.error('❌ [SERVICE] Erro na query:', error);
      throw error;
    }
    
    if (!data) {
      console.warn('⚠️ [SERVICE] Nenhum dado retornado');
      return [];
    }

    console.log('📋 [SERVICE] Total de registros retornados:', data.length);
    
    // Processar dados - mantendo os status originais incluindo pendente_aprovacao
    const processedUsers: Profile[] = data.map((user, index) => {
      console.log(`🔄 [SERVICE] Processando usuário ${index + 1}:`, user);
      
      return {
        ...user,
        tipo_usuario: (user.tipo_usuario === 'master' || user.tipo_usuario === 'admin' || user.tipo_usuario === 'fornecedor' || user.tipo_usuario === 'gestor_conta' || user.tipo_usuario === 'sdr' || user.tipo_usuario === 'customer_success' || user.tipo_usuario === 'cliente' || user.tipo_usuario === 'gestor_marcenaria' || user.tipo_usuario === 'consultor_marcenaria' || user.tipo_usuario === 'closer' || user.tipo_usuario === 'pre_vendas') 
          ? user.tipo_usuario 
          : 'fornecedor',
        status: (user.status === 'ativo' || user.status === 'inativo' || user.status === 'suspenso' || user.status === 'pendente_aprovacao') 
          ? user.status 
          : 'ativo'
      };
    });
    
    console.log('✅ [SERVICE] Usuários processados:', processedUsers.length);
    console.log('👥 [SERVICE] Lista final de usuários:', processedUsers.map(u => ({ id: u.id, email: u.email, nome: u.nome, status: u.status })));

    return processedUsers;
  },

  async createUser(userData: CreateUserData): Promise<boolean> {
    console.log('➕ [SERVICE] Criando usuário:', userData.email);
    
    const redirectUrl = `${window.location.origin}/verify`;
    const tempPassword = `TempPass${Math.random().toString(36).substring(2, 15)}${Date.now()}!`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: tempPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: userData.nome,
          tipo_usuario: userData.tipo_usuario,
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error(`O email ${userData.email} já está cadastrado no sistema.`);
      }
      throw authError;
    }

    if (authData.user) {
      // Aguardar e atualizar perfil
      setTimeout(async () => {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: userData.nome,
            telefone: userData.telefone,
            empresa: userData.empresa,
            tipo_usuario: userData.tipo_usuario,
        limite_acessos_diarios: userData.limite_acessos_diarios || 1,
        limite_acessos_mensais: userData.limite_acessos_mensais || 15,
        limite_candidaturas_diarias: userData.limite_candidaturas_diarias || 1,
        limite_candidaturas_mensais: userData.limite_candidaturas_mensais || 15,
            data_termino_contrato: userData.data_termino_contrato || null,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('❌ [SERVICE] Erro ao atualizar perfil:', profileError);
        }
      }, 2000);
      
      return true;
    }
    
    return false;
  },

  async updateUser(userId: string, updates: Partial<Profile>): Promise<boolean> {
    console.log('📝 [SERVICE] Atualizando usuário:', { userId, updates });
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    console.log('🗑️ [SERVICE] Excluindo usuário:', userId);
    
    const { data, error } = await supabase.rpc('excluir_usuario_admin', {
      p_user_id: userId
    });

    if (error) throw error;

    // Fazer cast da resposta para o tipo correto
    return data as unknown as DeleteUserResponse;
  },

  async getUserStats(userId: string): Promise<EstatisticasFornecedor | null> {
    const { data, error } = await supabase.rpc('obter_estatisticas_fornecedor', {
      fornecedor_id: userId
    });

    if (error) throw error;
    
    return data as unknown as EstatisticasFornecedor;
  },

  async createAdminUser(userData: CreateAdminUserData): Promise<boolean> {
    console.log('🔐 [SERVICE] Criando usuário administrativo:', userData.email);
    
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: userData
    });

    if (error) {
      console.error('❌ [SERVICE] Erro na Edge Function:', error);
      throw error;
    }

    if (!data?.success) {
      console.error('❌ [SERVICE] Resposta de erro da Edge Function:', data?.error);
      throw new Error(data?.error || 'Erro desconhecido ao criar usuário administrativo');
    }

    console.log('✅ [SERVICE] Usuário administrativo criado:', data.user);
    return true;
  }
};