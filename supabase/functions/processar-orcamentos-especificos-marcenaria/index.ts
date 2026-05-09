import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  orcamento_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orcamento_ids }: RequestBody = await req.json();

    if (!orcamento_ids || !Array.isArray(orcamento_ids) || orcamento_ids.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'orcamento_ids é obrigatório e deve ser um array não vazio' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processando ${orcamento_ids.length} orçamentos específicos para marcenaria`);

    let leads_criados = 0;
    let leads_ja_existentes = 0;
    const erros: string[] = [];

    // Processar cada orçamento
    for (const orcamento_id of orcamento_ids) {
      try {
        // Verificar se o orçamento existe e está no CRM Kanban
        const { data: orcamentoCRM, error: errorOrcamento } = await supabaseClient
          .from('orcamentos_crm_tracking')
          .select(`
            orcamento_id,
            orcamentos (
              id,
              codigo_orcamento,
              dados_contato,
              necessidade,
              local,
              categorias,
              created_at
            )
          `)
          .eq('orcamento_id', orcamento_id)
          .single();

        if (errorOrcamento || !orcamentoCRM) {
          erros.push(`Orçamento ${orcamento_id} não encontrado no CRM Kanban`);
          continue;
        }

        // Verificar se já existe lead de marcenaria
        const { data: leadExistente, error: errorLead } = await supabaseClient
          .from('crm_marcenaria_leads')
          .select('id')
          .eq('orcamento_id', orcamento_id)
          .maybeSingle();

        if (errorLead) {
          erros.push(`Erro ao verificar lead existente para ${orcamento_id}: ${errorLead.message}`);
          continue;
        }

        if (leadExistente) {
          leads_ja_existentes++;
          console.log(`Lead já existe para orçamento ${orcamento_id}`);
          continue;
        }

        // Criar lead de marcenaria
        const orcamento = orcamentoCRM.orcamentos;
        const dataDesbloqueio = new Date();
        dataDesbloqueio.setDate(dataDesbloqueio.getDate() + 7);

        const { error: errorInsert } = await supabaseClient
          .from('crm_marcenaria_leads')
          .insert({
            orcamento_id: orcamento.id,
            codigo_orcamento: orcamento.codigo_orcamento,
            cliente_nome: orcamento.dados_contato?.nome || null,
            cliente_email: orcamento.dados_contato?.email || null,
            cliente_telefone: orcamento.dados_contato?.telefone || null,
            etapa_marcenaria: 'identificacao_automatica',
            bloqueado: true,
            data_desbloqueio: dataDesbloqueio.toISOString()
          });

        if (errorInsert) {
          erros.push(`Erro ao criar lead para ${orcamento_id}: ${errorInsert.message}`);
          continue;
        }

        leads_criados++;
        console.log(`Lead criado com sucesso para orçamento ${orcamento_id}`);

      } catch (err) {
        erros.push(`Exceção ao processar ${orcamento_id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leads_criados,
        leads_ja_existentes,
        total_processados: orcamento_ids.length,
        erros: erros.length > 0 ? erros : undefined,
        message: `Processamento concluído: ${leads_criados} leads criados, ${leads_ja_existentes} já existentes`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
