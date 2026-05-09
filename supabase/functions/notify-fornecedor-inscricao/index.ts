import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/22334499/uh3oxs2/';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidaturaId, fornecedorId, orcamentoId } = await req.json();

    console.log('Processando notificação para candidatura:', candidaturaId);

    // Buscar dados completos da candidatura, orçamento e fornecedor
    const { data: candidatura, error: candidaturaError } = await supabase
      .from('candidaturas_fornecedores')
      .select(`
        *,
        orcamentos (
          id,
          codigo_orcamento,
          necessidade,
          local,
          categorias,
          dados_contato
        )
      `)
      .eq('id', candidaturaId)
      .single();

    if (candidaturaError || !candidatura) {
      console.error('Erro ao buscar candidatura:', candidaturaError);
      throw new Error('Candidatura não encontrada');
    }

    // Buscar dados do fornecedor do perfil
    const { data: fornecedor, error: fornecedorError } = await supabase
      .from('profiles')
      .select('id, nome, email, telefone, empresa')
      .eq('id', fornecedorId)
      .single();

    if (fornecedorError || !fornecedor) {
      console.error('Erro ao buscar fornecedor:', fornecedorError);
      throw new Error('Fornecedor não encontrado');
    }

    // Contar quantos fornecedores já se inscreveram neste orçamento para determinar a ordem
    const { count: ordemInscricao, error: countError } = await supabase
      .from('candidaturas_fornecedores')
      .select('*', { count: 'exact', head: true })
      .eq('orcamento_id', orcamentoId);

    if (countError) {
      console.error('Erro ao contar inscrições:', countError);
      throw new Error('Erro ao determinar ordem da inscrição');
    }

    const orcamento = candidatura.orcamentos;
    const dadosContato = orcamento?.dados_contato || {};

    // Estruturar dados para o Zapier
    const zapierData = {
      evento: 'fornecedor_inscrito',
      ordem_inscricao: ordemInscricao || 1,
      cliente: {
        nome: dadosContato.nome || 'Cliente',
        telefone: dadosContato.telefone || '',
        email: dadosContato.email || ''
      },
      fornecedor: {
        nome: fornecedor.nome || candidatura.nome,
        empresa: fornecedor.empresa || candidatura.empresa,
        telefone: fornecedor.telefone || candidatura.telefone,
        email: fornecedor.email || candidatura.email
      },
      orcamento: {
        id: orcamento?.id,
        codigo: orcamento?.codigo_orcamento || '',
        necessidade: orcamento?.necessidade || '',
        local: orcamento?.local || '',
        categorias: orcamento?.categorias || []
      },
      timestamp: new Date().toISOString()
    };

    console.log('Enviando dados para Zapier:', JSON.stringify(zapierData, null, 2));

    // Enviar para Zapier
    const zapierResponse = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapierData)
    });

    if (!zapierResponse.ok) {
      console.error('Erro ao enviar para Zapier:', zapierResponse.status, zapierResponse.statusText);
      throw new Error(`Erro no Zapier: ${zapierResponse.status}`);
    }

    console.log('Notificação enviada com sucesso para Zapier');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        ordem_inscricao: ordemInscricao
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro na notificação do fornecedor:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});