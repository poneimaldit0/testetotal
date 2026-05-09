import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriarNovaContaClienteRequest {
  cliente_id: string;
  cliente_email: string;
  cliente_nome: string;
}

const supabaseUrl = "https://lbrkmidhipvlitpytmre.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceKey!);
const resend = new Resend(resendApiKey);

function gerarSenhaTemporaria(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let senha = "";
  for (let i = 0; i < 12; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cliente_id, cliente_email, cliente_nome }: CriarNovaContaClienteRequest = await req.json();
    
    console.log("Criando nova conta para cliente:", { cliente_id, cliente_email, cliente_nome });

    // Gerar senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();
    console.log("Senha temporária gerada");

    // Criar nova conta Auth para o cliente
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: cliente_email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome: cliente_nome,
        tipo_usuario: 'cliente'
      }
    });

    if (authError) {
      console.error("Erro ao criar conta Auth para cliente:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta: " + authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Nova conta Auth criada para cliente:", newAuthUser.user.id);

    // Atualizar o cliente na tabela com o novo auth_user_id
    const { error: updateError } = await supabase
      .from('clientes')
      .update({
        auth_user_id: newAuthUser.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', cliente_id);

    if (updateError) {
      console.error("Erro ao atualizar cliente com nova conta:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao associar conta ao cliente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cliente atualizado com nova conta Auth");

    // Enviar email com as novas credenciais
    try {
      const emailResponse = await resend.emails.send({
        from: "Reforma100 <noreply@resend.dev>",
        to: [cliente_email],
        subject: "🔑 Suas novas credenciais de acesso - Sistema Reforma100",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Credenciais Atualizadas!</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">Sua conta foi corrigida com sucesso</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Olá, ${cliente_nome}!</h2>
              
              <p style="color: #666; line-height: 1.6;">
                Corrigimos um problema técnico em sua conta. Agora você possui credenciais exclusivas 
                para acessar o sistema e acompanhar seu projeto de reforma.
              </p>

              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">🔐 Suas novas credenciais:</h3>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${cliente_email}</p>
                <p style="margin: 5px 0;"><strong>Nova senha:</strong> <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${senhaTemporaria}</code></p>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  ⚠️ <strong>Importante:</strong> Por segurança, você será solicitado a alterar essa senha 
                  no seu primeiro acesso ao sistema.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://c2cdc66d-faa3-459e-86c0-cbd3c4ae8def.lovableproject.com/auth" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                   🚀 Acessar o Sistema
                </a>
              </div>

              <div style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                  ✅ <strong>Problema Resolvido:</strong> Sua conta agora está separada de outros usuários e funcionando corretamente.
                </p>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
                <p style="margin: 0;"><strong>Dúvidas ou problemas?</strong></p>
                <p style="margin: 5px 0 0 0;">Entre em contato conosco através do sistema ou responda este email.</p>
              </div>
            </div>
          </div>
        `
      });

      console.log("Email enviado:", emailResponse);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      // Continua mesmo se email falhar
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Nova conta criada e credenciais enviadas",
        user_id: newAuthUser.user.id,
        email: cliente_email
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);