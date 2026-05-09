import { supabase } from '@/integrations/supabase/client';

export interface DadosNovaContaCliente {
  cliente_id: string;
  cliente_email: string;
  cliente_nome: string;
}

export async function criarNovaContaCliente(dados: DadosNovaContaCliente) {
  try {
    // Chamar a Edge Function para criar a nova conta
    const { data, error } = await supabase.functions.invoke('criar-nova-conta-cliente', {
      body: dados
    });

    if (error) {
      console.error('Erro ao criar nova conta:', error);
      return { success: false, error: error.message };
    }

    console.log('Nova conta criada com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro inesperado:', error);
    return { success: false, error: 'Erro inesperado ao criar conta' };
  }
}

// Função para corrigir email do cliente
export async function corrigirEmailCliente() {
  try {
    const { data, error } = await supabase.functions.invoke('corrigir-email-cliente', {
      body: {
        user_id: 'fa8aa836-4941-447c-a6b1-1b359a251dd6',
        novo_email: 'financeiro@reforma100.com.br',
        cliente_id: '0cc896cc-346f-445d-bf14-c81df30bb3cd'
      }
    });

    if (error) {
      console.error('Erro ao corrigir email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email corrigido com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro inesperado:', error);
    return { success: false, error: 'Erro inesperado ao corrigir email' };
  }
}

// Função específica para corrigir a situação atual
export async function corrigirContaClienteRaphael() {
  return criarNovaContaCliente({
    cliente_id: '0cc896cc-346f-445d-bf14-c81df30bb3cd',
    cliente_email: 'financeiro@reforma100.com.br',
    cliente_nome: 'Raphael Nardi'
  });
}