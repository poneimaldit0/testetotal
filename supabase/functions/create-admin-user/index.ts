import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAdminUserRequest {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  empresa?: string;
  tipo_usuario:
    | 'master'
    | 'admin'
    | 'gestor_conta'
    | 'sdr'
    | 'customer_success'
    | 'gestor_marcenaria'
    | 'consultor_marcenaria'
    | 'closer'
    | 'pre_vendas';
  limite_acessos_diarios?: number;
  limite_acessos_mensais?: number;
  data_termino_contrato?: string;
}

const ADMIN_USER_TYPES = [
  'admin',
  'gestor_conta',
  'sdr',
  'customer_success',
  'gestor_marcenaria',
  'consultor_marcenaria',
  'closer',
  'pre_vendas',
] as const;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseRegular = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData } = await supabaseRegular.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseRegular
      .from('profiles')
      .select('tipo_usuario')
      .eq('id', userData.user.id)
      .single();

    if (!profile || profile.tipo_usuario !== 'master') {
      return new Response(JSON.stringify({ error: 'Only master users can create admin users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userData_req: CreateAdminUserRequest;
    try {
      userData_req = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userData_req.email || !userData_req.password || !userData_req.nome || !userData_req.tipo_usuario) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, nome, tipo_usuario' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(userData_req.email) || userData_req.email.length > 320) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ADMIN_USER_TYPES.includes(userData_req.tipo_usuario)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid user type. Only admin, gestor_conta, sdr, customer_success, gestor_marcenaria, consultor_marcenaria, closer and pre_vendas are allowed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,128}$/;
    if (!passwordRegex.test(userData_req.password)) {
      return new Response(JSON.stringify({ 
        error: 'Password must be 8-128 characters with uppercase, lowercase, and number' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedData = {
      email: userData_req.email.toLowerCase().trim(),
      password: userData_req.password,
      nome: userData_req.nome.substring(0, 100).trim(),
      telefone: userData_req.telefone ? userData_req.telefone.substring(0, 20).replace(/[^\d\s\-\(\)]/g, '') : undefined,
      empresa: userData_req.empresa ? userData_req.empresa.substring(0, 100).trim() : undefined,
      tipo_usuario: userData_req.tipo_usuario,
      limite_acessos_diarios: Math.min(Math.max(userData_req.limite_acessos_diarios || 1000, 1), 10000),
      limite_acessos_mensais: Math.min(Math.max(userData_req.limite_acessos_mensais || 10000, 1), 100000),
      data_termino_contrato: userData_req.data_termino_contrato
    };

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedData.email,
      password: sanitizedData.password,
      email_confirm: true,
      user_metadata: {
        nome: sanitizedData.nome,
        telefone: sanitizedData.telefone,
        empresa: sanitizedData.empresa,
        tipo_usuario: sanitizedData.tipo_usuario
      }
    });

    if (createError) {
      // SECURITY: Log failed user creation attempts
      await supabaseAdmin
        .from('logs_acesso')
        .insert({
          user_id: userData.user.id,
          acao: `tentativa_criacao_usuario_admin_falhada: ${sanitizedData.email} - Erro: ${createError.message}`
        });
      
      return new Response(JSON.stringify({ error: 'Failed to create user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update profile with additional data using sanitized values
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'ativo',
        limite_acessos_diarios: sanitizedData.limite_acessos_diarios,
        limite_acessos_mensais: sanitizedData.limite_acessos_mensais,
        data_termino_contrato: sanitizedData.data_termino_contrato || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the entire operation, just log the error
    }

    // SECURITY: Log successful user creation
    await supabaseAdmin
      .from('logs_acesso')
      .insert({
        user_id: userData.user.id,
        acao: `criacao_usuario_admin: ${newUser.user.id} (${sanitizedData.email}) - Tipo: ${sanitizedData.tipo_usuario}`
      });

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        tipo_usuario: userData_req.tipo_usuario
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-admin-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);