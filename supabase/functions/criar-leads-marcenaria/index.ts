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
    console.log('🪚 Iniciando criação automática de leads de marcenaria...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Chamar função SQL (agora já apropria automaticamente ao consultor padrão)
    const { error } = await supabase.rpc('criar_lead_marcenaria_apos_7_dias')
    
    if (error) {
      console.error('❌ Erro ao criar leads:', error)
      throw error
    }

    console.log('✅ Leads de marcenaria criados com sucesso (já apropriados ao consultor padrão)')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Leads de marcenaria criados com sucesso' 
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
