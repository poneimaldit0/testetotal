import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriarClienteRequest {
  proposta_id: string;
  orcamento_id: string;
  dados_cliente: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    endereco_atual: any;
    endereco_reforma: any;
  };
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
    const { proposta_id, orcamento_id, dados_cliente }: CriarClienteRequest = await req.json();
    
    console.log("Iniciando criação de cliente:", { proposta_id, orcamento_id, email: dados_cliente.email });

    let authUser: any = null;
    let senhaTemporaria: string | null = null;
    let usuarioJaExistia = false;

    // ETAPA 1: Criar conta única para cada cliente
    console.log("ETAPA 1: Criando conta única para cliente...");
    
    // Gerar senha temporária
    senhaTemporaria = gerarSenhaTemporaria();
    console.log("Senha temporária gerada para nova conta");
    
    // Criar conta diretamente com o email do cliente (sem email temporário)
    console.log("Criando conta no Auth com email do cliente:", dados_cliente.email);
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: dados_cliente.email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome: dados_cliente.nome,
        tipo_usuario: 'cliente'
      }
    });

    if (authError || !newAuthUser?.user) {
      console.error("Erro ao criar conta para cliente:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta de cliente: " + authError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    authUser = newAuthUser;
    console.log("✅ Conta criada com sucesso:", authUser.user.id);
    
    // ETAPA 1.1: Atualizar a tabela profiles (que foi criada pelo trigger)
    console.log("Atualizando dados do profile para:", dados_cliente.nome);
    
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ 
        nome: dados_cliente.nome,
        email: dados_cliente.email // Garantir que está correto
      })
      .eq('id', authUser.user.id);

    if (updateProfileError) {
      console.error("Erro ao atualizar profile:", updateProfileError);
      // Não retornar erro aqui, profile já foi criado pelo trigger
    }
    
    console.log("✅ Profile configurado para cliente:", dados_cliente.email);
    console.log("✅ Conta do cliente configurada - Auth ID:", authUser.user.id, "Email:", dados_cliente.email);

    // ETAPA 2: Verificar se cliente já existe na tabela
    console.log("ETAPA 2: Verificando cliente na tabela...");
    let cliente: any = null;
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', dados_cliente.email)
      .single();

    if (clienteExistente) {
      console.log("Cliente já existe na tabela:", clienteExistente.id);
      cliente = clienteExistente;
    } else {
      // Buscar dados da proposta antes de criar cliente e resolver IDs corretos
      console.log("Consultando dados da proposta e resolvendo IDs...");
      
      let propostaRealId = proposta_id; // ID real da checklist_propostas
      let candidaturaId = null; // ID da candidatura para referências
      
      // Primeiro tentar buscar como proposta_id (checklist_propostas.id)
      let { data: proposta, error: propostaError } = await supabase
        .from('checklist_propostas')
        .select(`
          id,
          candidatura_id,
          valor_total_estimado,
          candidaturas_fornecedores!inner(
            id,
            fornecedor_id,
            profiles!inner(
              id,
              nome,
              empresa
            )
          )
        `)
        .eq('id', proposta_id)
        .maybeSingle();

      if (proposta) {
        // É um ID válido de checklist_propostas
        propostaRealId = proposta.id;
        candidaturaId = proposta.candidatura_id;
        console.log("Usando checklist_propostas.id:", propostaRealId);
      } else {
        // Se não encontrou como proposta_id, tentar buscar como candidatura_id
        console.log("ID não é proposta, tentando buscar como candidatura_id:", proposta_id);
        
        const { data: propostaViaCandidatura, error: propostaViaCandidaturaError } = await supabase
          .from('checklist_propostas')
          .select(`
            id,
            candidatura_id,
            valor_total_estimado,
            candidaturas_fornecedores!inner(
              id,
              fornecedor_id,
              profiles!inner(
                id,
                nome,
                empresa
              )
            )
          `)
          .eq('candidatura_id', proposta_id)
          .maybeSingle();
        
        if (propostaViaCandidatura) {
          proposta = propostaViaCandidatura;
          propostaError = propostaViaCandidaturaError;
          propostaRealId = propostaViaCandidatura.id; // ID correto da checklist_propostas
          candidaturaId = proposta_id; // O ID original era de candidatura
          console.log("Resolvendo candidatura_id:", candidaturaId, "para checklist_propostas.id:", propostaRealId);
        }
      }

      if (propostaError || !proposta) {
        console.error("Erro ao consultar proposta:", propostaError);
        return new Response(
          JSON.stringify({ 
            error: "Proposta não encontrada", 
            details: `ID ${proposta_id} não encontrado como proposta nem como candidatura`,
            proposta_id: proposta_id
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar cliente na tabela usando o ID correto da proposta
      console.log("Criando cliente na tabela com proposta_aceita_id:", propostaRealId);
      const { data: novoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: dados_cliente.nome,
          cpf: dados_cliente.cpf,
          email: dados_cliente.email, // SEMPRE usar o email original do cliente
          telefone: dados_cliente.telefone,
          endereco_atual: dados_cliente.endereco_atual,
          endereco_reforma: dados_cliente.endereco_reforma,
          status: 'ativo',
          orcamento_id: orcamento_id,
          proposta_aceita_id: propostaRealId, // Usar o ID correto da checklist_propostas
          auth_user_id: authUser.user.id
        })
        .select()
        .single();

      if (clienteError) {
        console.error("Erro ao criar cliente:", clienteError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar registro do cliente" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cliente = novoCliente;
      console.log("Cliente criado:", cliente.id);
    }

    // ETAPA 3: Atualizar status da proposta se ainda não foi atualizada
    console.log("ETAPA 3: Verificando/atualizando status da proposta...");
    
    // Usar o ID correto já resolvido (se cliente foi criado, já temos o propostaRealId)
    let propostaRealId = proposta_id;
    
    // Se temos o cliente existente, usar o proposta_aceita_id dele
    if (clienteExistente) {
      propostaRealId = clienteExistente.proposta_aceita_id;
    } else {
      // Se criamos um novo cliente, já resolvemos o propostaRealId acima
      // Buscar ID correto se ainda não temos
      let { data: propostaParaResolucao } = await supabase
        .from('checklist_propostas')
        .select('id')
        .eq('id', proposta_id)
        .maybeSingle();
      
      if (!propostaParaResolucao) {
        // Buscar via candidatura_id
        const { data: propostaViaCandidatura } = await supabase
          .from('checklist_propostas')
          .select('id')
          .eq('candidatura_id', proposta_id)
          .maybeSingle();
        
        if (propostaViaCandidatura) {
          propostaRealId = propostaViaCandidatura.id;
        }
      }
    }
    
    const { data: propostaParaUpdate } = await supabase
      .from('checklist_propostas')
      .select('id, status')
      .eq('id', propostaRealId)
      .maybeSingle();

    if (propostaParaUpdate && propostaParaUpdate.status !== 'enviado') {
      console.log("Atualizando status da proposta para 'enviado'...");
      const { error: propostaUpdateError } = await supabase
        .from('checklist_propostas')
        .update({ 
          status: 'enviado',
          updated_at: new Date().toISOString()
        })
        .eq('id', propostaParaUpdate.id);

      if (propostaUpdateError) {
        console.error("Erro ao atualizar proposta:", propostaUpdateError);
        // Não retornar erro aqui, continuar o fluxo
      } else {
        console.log("Status da proposta atualizado para 'enviado'");
      }
    } else if (propostaParaUpdate && propostaParaUpdate.status === 'enviado') {
      console.log("Proposta já está com status 'enviado'");
    } else {
      console.log("Proposta não encontrada para atualização");
    }

    // ETAPA 4: Criar contrato e obra (transacional)
    console.log("ETAPA 4: Verificando contrato e obra...");
    
    // Usar o ID correto da proposta já resolvido
    let propostaParaContrato = propostaRealId;
    
    // Se não temos ainda, resolver o ID correto
    if (!propostaParaContrato || propostaParaContrato === proposta_id) {
      const { data: propostaReal } = await supabase
        .from('checklist_propostas')
        .select('id')
        .eq('id', proposta_id)
        .maybeSingle();
      
      if (propostaReal) {
        propostaParaContrato = propostaReal.id;
      } else {
        // Buscar via candidatura_id
        const { data: propostaViaCandidatura } = await supabase
          .from('checklist_propostas')
          .select('id')
          .eq('candidatura_id', proposta_id)
          .maybeSingle();
        
        if (propostaViaCandidatura) {
          propostaParaContrato = propostaViaCandidatura.id;
        }
      }
    }
    
    // Buscar sempre os dados da proposta (para notificações e contratos)
    console.log("Buscando dados da proposta:", propostaParaContrato);
    const { data: propostaContrato } = await supabase
      .from('checklist_propostas')
      .select(`
        valor_total_estimado,
        candidaturas_fornecedores!inner(
          fornecedor_id
        )
      `)
      .eq('id', propostaParaContrato)
      .maybeSingle();

    if (!propostaContrato) {
      console.error("Erro: Proposta não encontrada:", propostaParaContrato);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Proposta não encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Verificar se contrato já existe
    const { data: contratoExistente } = await supabase
      .from('contratos')
      .select('id')
      .eq('cliente_id', cliente.id)
      .eq('proposta_id', propostaParaContrato)
      .maybeSingle();

    let contratoId = null;
    let obraId = null;

    if (!contratoExistente) {
      // Criar contrato usando dados já carregados
      console.log("Criando contrato...");

      const { data: novoContrato, error: contratoError } = await supabase
        .from('contratos')
        .insert({
          cliente_id: cliente.id,
          fornecedor_id: propostaContrato.candidaturas_fornecedores.fornecedor_id,
          orcamento_id: orcamento_id,
          proposta_id: propostaParaContrato,
          tipo: 'principal',
          valor_contrato: propostaContrato.valor_total_estimado,
          status_assinatura: 'aguardando'
        })
        .select()
        .single();

      if (contratoError) {
        console.error("Erro ao criar contrato:", contratoError);
      } else {
        console.log("Contrato criado com sucesso:", novoContrato.id);
        contratoId = novoContrato.id;
        
        // ETAPA 4.1: Criar obra vinculada ao contrato
        console.log("Criando obra...");
        const { data: novaObra, error: obraError } = await supabase
          .from('obras')
          .insert({
            contrato_id: contratoId,
            cliente_id: cliente.id,
            fornecedor_id: propostaContrato.candidaturas_fornecedores.fornecedor_id,
            orcamento_id: orcamento_id,
            proposta_id: propostaParaContrato,
            endereco_obra: dados_cliente.endereco_reforma,
            valor_total: propostaContrato.valor_total_estimado,
            status: 'aguardando_inicio'
          })
          .select()
          .single();

        if (obraError) {
          console.error("Erro ao criar obra:", obraError);
        } else {
          console.log("Obra criada com sucesso:", novaObra.id);
          obraId = novaObra.id;
          
          // ETAPA 4.2: Popular cronograma automaticamente
          console.log("Populando cronograma da obra...");
          const { error: cronogramaError } = await supabase
            .rpc('popular_cronograma_obra', {
              p_obra_id: obraId,
              p_proposta_id: propostaParaContrato
            });
          
          if (cronogramaError) {
            console.error("Erro ao popular cronograma:", cronogramaError);
          } else {
            console.log("Cronograma populado com sucesso");
          }
        }
      }
    } else {
      console.log("Contrato já existe:", contratoExistente.id);
      contratoId = contratoExistente.id;
      
      // Verificar se obra já existe
      const { data: obraExistente } = await supabase
        .from('obras')
        .select('id')
        .eq('contrato_id', contratoId)
        .maybeSingle();
      
      if (obraExistente) {
        obraId = obraExistente.id;
        console.log("Obra já existe:", obraId);
      }
    }

    // ETAPA 5: Criar notificações do sistema
    console.log("ETAPA 5: Criando notificações...");
    
    if (obraId && contratoId) {
      // Buscar dados do fornecedor
      const { data: fornecedorData } = await supabase
        .from('checklist_propostas')
        .select(`
          candidaturas_fornecedores!inner(
            fornecedor_id,
            profiles!inner(nome, empresa)
          )
        `)
        .eq('id', propostaParaContrato)
        .maybeSingle();

      if (fornecedorData) {
        const fornecedorId = fornecedorData.candidaturas_fornecedores.fornecedor_id;
        const fornecedorNome = fornecedorData.candidaturas_fornecedores.profiles.nome;
        
        // Notificação para fornecedor
        try {
          await supabase
            .from('notificacoes_sistema')
            .insert({
              usuario_id: fornecedorId,
              tipo: 'proposta_aceita',
              titulo: '🎉 Proposta Aceita!',
              mensagem: `Sua proposta foi aceita por ${dados_cliente.nome}. A obra já foi criada e está aguardando início.`,
              tipo_referencia: 'obra',
              referencia_id: obraId,
                dados_extras: {
                  cliente_nome: dados_cliente.nome,
                  cliente_email: dados_cliente.email,
                  cliente_telefone: dados_cliente.telefone,
                  valor_contrato: propostaContrato.valor_total_estimado,
                  endereco_obra: dados_cliente.endereco_reforma
                }
            });
          
          console.log("Notificação criada para fornecedor:", fornecedorId);
        } catch (notifError) {
          console.error("Erro ao criar notificação para fornecedor:", notifError);
        }

        // Notificação para cliente (se já tem auth_user_id)
        if (cliente.auth_user_id) {
          try {
            await supabase
              .from('notificacoes_sistema')
              .insert({
                usuario_id: cliente.auth_user_id,
                tipo: 'obra_criada',
                titulo: '✅ Obra Iniciada',
                mensagem: `Sua obra com ${fornecedorNome} foi criada e está aguardando início. Acompanhe o progresso no seu painel.`,
                tipo_referencia: 'obra',
                referencia_id: obraId,
                dados_extras: {
                  fornecedor_nome: fornecedorNome,
                  valor_contrato: propostaContrato.valor_total_estimado,
                  contrato_id: contratoId
                }
              });
            
            console.log("Notificação criada para cliente:", cliente.auth_user_id);
          } catch (notifError) {
            console.error("Erro ao criar notificação para cliente:", notifError);
          }
        }

        console.log("Notificações criadas com sucesso");
      }
    }

    // ETAPA 6: Marcar necessidade de troca de senha
    if (authUser && !usuarioJaExistia) {
      console.log("ETAPA 6: Marcando necessidade de troca de senha...");
      try {
        const { error: passwordFlagError } = await supabase
          .from('profiles')
          .update({ must_change_password: true })
          .eq('id', authUser.user.id);

        if (passwordFlagError) {
          console.error("Erro ao marcar necessidade de troca de senha:", passwordFlagError);
        } else {
          console.log("Necessidade de troca de senha marcada com sucesso");
        }
      } catch (flagError) {
        console.error("Erro ao processar flag de troca de senha:", flagError);
      }
    }

    // ETAPA 7: Enviar email com credenciais
    if (senhaTemporaria) {
      console.log("ETAPA 5: Enviando email com credenciais...");
      const tipoMensagem = usuarioJaExistia ? "Credenciais atualizadas para sua nova proposta aceita!" : "Conta criada para sua proposta aceita!";
      console.log(`Enviando email: ${tipoMensagem}`);
      
      try {
        // Buscar dados do fornecedor para o email - usar ID correto da proposta
        let propostaParaEmail = propostaRealId || proposta_id;
        
        // Resolver ID correto se ainda não foi resolvido
        if (propostaParaEmail === proposta_id) {
          const { data: propostaReal } = await supabase
            .from('checklist_propostas')
            .select('id')
            .eq('id', proposta_id)
            .maybeSingle();
          
          if (propostaReal) {
            propostaParaEmail = propostaReal.id;
          } else {
            // Buscar via candidatura_id
            const { data: propostaViaCandidatura } = await supabase
              .from('checklist_propostas')
              .select('id')
              .eq('candidatura_id', proposta_id)
              .maybeSingle();
            
            if (propostaViaCandidatura) {
              propostaParaEmail = propostaViaCandidatura.id;
            }
          }
        }

        let { data: dadosFornecedor } = await supabase
          .from('checklist_propostas')
          .select(`
            candidaturas_fornecedores!inner(
              profiles!inner(
                nome,
                empresa
              )
            )
          `)
          .eq('id', propostaParaEmail)
          .maybeSingle();

        // Se não encontrou dados do fornecedor, algo está errado
        if (!dadosFornecedor) {
          console.error("Dados do fornecedor não encontrados para ID:", propostaParaEmail);
        }

        const emailResponse = await resend.emails.send({
          from: "Reforma100 <noreply@resend.dev>",
          to: [dados_cliente.email],
          subject: "🎉 Proposta Aceita - Seus dados de acesso ao sistema",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Parabéns!</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">Sua proposta foi aceita com sucesso!</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Olá, ${dados_cliente.nome}!</h2>
                
                <p style="color: #666; line-height: 1.6;">
                  Sua proposta para o projeto de reforma foi aceita! Criamos uma conta exclusiva para você acompanhar 
                  todo o progresso do seu projeto, comunicar-se com o fornecedor e visualizar todas as informações importantes.
                </p>

                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <h3 style="color: #333; margin-top: 0;">🔐 Seus dados de acesso:</h3>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${dados_cliente.email}</p>
                  <p style="margin: 5px 0;"><strong>Senha temporária:</strong> <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${senhaTemporaria}</code></p>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    ⚠️ <strong>Importante:</strong> Por segurança, você será solicitado a alterar essa senha temporária 
                    no seu primeiro acesso ao sistema.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://c2cdc66d-faa3-459e-86c0-cbd3c4ae8def.lovableproject.com/auth" 
                     style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                     🚀 Acessar o Sistema Agora
                  </a>
                </div>

                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #495057; font-size: 14px;">
                    💡 <strong>Como acessar:</strong><br>
                    1. Clique no botão acima ou acesse: <strong>https://c2cdc66d-faa3-459e-86c0-cbd3c4ae8def.lovableproject.com/auth</strong><br>
                    2. Use seu email e a senha temporária fornecida<br>
                    3. Você será solicitado a criar uma nova senha no primeiro acesso
                  </p>
                </div>

                <h3 style="color: #333;">📋 O que você encontrará na sua área:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li><strong>Detalhes do Projeto:</strong> Informações completas da sua reforma</li>
                  <li><strong>Acompanhamento:</strong> Status em tempo real do progresso</li>
                  <li><strong>Comunicação:</strong> Chat direto com seu fornecedor</li>
                  <li><strong>Documentos:</strong> Contratos, medições e comprovantes</li>
                  <li><strong>Cronograma:</strong> Datas e etapas da obra</li>
                  <li><strong>Diário da Obra:</strong> Fotos e relatórios diários</li>
                </ul>

                ${dadosFornecedor ? `
                <div style="background: #e8f5e8; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #2d5016;">
                    💼 <strong>Fornecedor responsável:</strong> ${dadosFornecedor.candidaturas_fornecedores.profiles.empresa || dadosFornecedor.candidaturas_fornecedores.profiles.nome}
                  </p>
                </div>
                ` : ''}

                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 14px; text-align: center;">
                  Este é um email automático. Se você tem dúvidas, entre em contato conosco.<br>
                  <strong>Reforma100</strong> - Conectando você ao fornecedor ideal
                </p>
              </div>
            </div>
          `,
        });

        console.log("Email enviado:", emailResponse);
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Não falhar o processo por causa do email
      }
    } else {
      console.log("Erro: Senha temporária não foi gerada");
    }

    console.log("Processo concluído com sucesso!");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Cliente processado com sucesso e credenciais enviadas por email",
        credenciais: {
          email: dados_cliente.email,
          senha_temporaria: senhaTemporaria
        },
        cliente_id: cliente.id,
        usuario_existia: usuarioJaExistia
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);