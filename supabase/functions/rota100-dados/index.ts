import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Orçamento pelo rota100_token
    const { data: orc, error: orcError } = await supabase
      .from('orcamentos')
      .select('id, necessidade, categorias, local, tamanho_imovel, dados_contato, data_publicacao, created_at, prazo_envio_proposta_dias, tipo_atendimento_tecnico, data_atendimento_tecnico, hora_atendimento_tecnico')
      .eq('rota100_token', token)
      .maybeSingle();

    if (orcError || !orc) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Dados protegidos em paralelo (bypass RLS via service role)
    const [candsRes, horariosRes, trackingRes, compatRes] = await Promise.all([
      supabase
        .from('candidaturas_fornecedores')
        .select('id, nome, empresa, email, telefone, fornecedor_id, data_candidatura, proposta_enviada, status_acompanhamento, data_desistencia, token_visita, link_reuniao, acessos_reuniao, visita_confirmada_em')
        .eq('orcamento_id', orc.id)
        .is('data_desistencia', null)
        .order('data_candidatura', { ascending: true }),
      supabase
        .from('horarios_visita_orcamento')
        .select('candidatura_id, data_hora')
        .eq('orcamento_id', orc.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('orcamentos_crm_tracking')
        .select('etapa_crm, data_entrada_etapa')
        .eq('orcamento_id', orc.id)
        .maybeSingle(),
      supabase
        .from('compat_requests')
        .select('id')
        .eq('token', token)
        .in('tipo', ['completa', 'individual'])
        .in('status', ['pendente', 'visualizado', 'enviado'])
        .limit(1),
    ]);

    return new Response(
      JSON.stringify({
        orcamento:    orc,
        candidaturas: candsRes.data   ?? [],
        horarios:     horariosRes.data ?? [],
        tracking:     trackingRes.data ?? null,
        hasCompatReq: (compatRes.data ?? []).length > 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err) {
    console.error('[rota100-dados]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
