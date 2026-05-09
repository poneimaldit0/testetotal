import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔓 Iniciando desbloqueio de leads de marcenaria...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Desbloquear leads que atingiram data_desbloqueio
    const { data, error } = await supabase
      .from('crm_marcenaria_leads')
      .update({ 
        bloqueado: false,
        etapa_marcenaria: 'abordagem_inicial'
      })
      .eq('bloqueado', true)
      .lte('data_desbloqueio', new Date().toISOString())
      .select()
    
    if (error) {
      console.error('❌ Erro ao desbloquear leads:', error)
      throw error
    }

    const leadsDesbloqueados = data?.length || 0
    console.log(`✅ ${leadsDesbloqueados} leads desbloqueados com sucesso`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        leads_desbloqueados: leadsDesbloqueados,
        message: `${leadsDesbloqueados} leads desbloqueados` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
