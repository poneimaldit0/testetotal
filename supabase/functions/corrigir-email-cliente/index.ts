import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from 'https://esm.sh/resend@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrigirEmailClienteRequest {
  user_id: string;
  novo_email: string;
  cliente_id: string;
}

// Supabase clients
const supabaseUrl = "https://lbrkmidhipvlitpytmre.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey!);

// Resend client
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resend = new Resend(resendApiKey);

function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 12; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, novo_email, cliente_id }: CorrigirEmailClienteRequest = await req.json();
    
    console.log('Iniciando correção de email:', {
      user_id,
      novo_email,
      cliente_id
    });

    // ETAPA 1: Gerar nova senha temporária
    const novaSenhaTemporaria = gerarSenhaTemporaria();
    console.log('Nova senha temporária gerada');

    // ETAPA 2: Atualizar email no Supabase Auth
    console.log('ETAPA 2: Atualizando email no Supabase Auth...');
    const { data: updateUserData, error: updateUserError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        email: novo_email,
        password: novaSenhaTemporaria,
        email_confirm: true,
        user_metadata: {
          nome: 'Raphael Nardi',
          tipo_usuario: 'cliente'
        }
      }
    );

    if (updateUserError) {
      console.error('Erro ao atualizar usuário no Auth:', updateUserError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar email no Auth: ' + updateUserError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Email atualizado no Auth com sucesso:', updateUserData.user?.email);

    // ETAPA 3: Atualizar registro do cliente
    console.log('ETAPA 3: Atualizando registro do cliente...');
    const { data: updateClienteData, error: updateClienteError } = await supabase
      .from('clientes')
      .update({ 
        email: novo_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', cliente_id);

    if (updateClienteError) {
      console.error('Erro ao atualizar cliente:', updateClienteError);
      // Não falhar aqui, pois o email já foi atualizado no Auth
    } else {
      console.log('Registro do cliente atualizado com sucesso');
    }

    // ETAPA 4: Enviar email com novas credenciais
    console.log('ETAPA 4: Enviando email com novas credenciais...');
    const emailData = {
      from: 'noreply@reforma100.com.br',
      to: novo_email,
      subject: 'Email corrigido - Suas credenciais de acesso',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Email Corrigido com Sucesso!</h2>
          
          <p>Olá <strong>Raphael Nardi</strong>,</p>
          
          <p>Corrigimos o seu email de acesso. Agora você pode fazer login com:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${novo_email}</p>
            <p><strong>Senha temporária:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${novaSenhaTemporaria}</code></p>
          </div>
          
          <p><strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro login por segurança.</p>
          
          <p>Agora você pode acessar seu painel de cliente e acompanhar o andamento do seu projeto.</p>
          
          <p>Atenciosamente,<br>
          Equipe Reforma100</p>
        </div>
      `
    };

    console.log('Enviando email:', emailData.subject);
    const { data: emailResult, error: emailError } = await resend.emails.send(emailData);
    
    console.log('Email enviado:', {
      data: emailResult,
      error: emailError
    });

    // ETAPA 5: Registrar log da correção
    const { error: logError } = await supabase
      .from('logs_acesso')
      .insert({
        user_id: user_id,
        acao: `correcao_email: ${novo_email} (cliente_id: ${cliente_id})`
      });

    if (logError) {
      console.error('Erro ao registrar log:', logError);
    }

    console.log('Correção de email concluída com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email corrigido com sucesso',
        email_corrigido: novo_email,
        credenciais_enviadas: !emailError
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro inesperado na correção de email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor: ' + (error as Error).message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});