/**
 * ativar-versao-fontes
 *
 * Ativa uma versão pendente_validacao de fontes de preço.
 * Arquiva a versão ativa anterior.
 * Apenas admin e master podem chamar.
 *
 * POST body: { versao_id: string }
 *
 * Regras:
 *  - IA NÃO pode chamar este endpoint — requer token de usuário autenticado
 *  - Versão alvo deve estar em status pendente_validacao
 *  - Versão ativa anterior é arquivada (nunca deletada)
 *  - Histórico mensal é sempre preservado
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase        = createClient(supabaseUrl, supabaseService);

    // ── Validar caller (somente usuário autenticado, não service_role) ───────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token      = authHeader.replace("Bearer ", "");

    if (!token) return json401("Authorization header obrigatório");

    const userClient = createClient(supabaseUrl, token);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();

    if (authErr || !user) return json401("Token inválido");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tipo_usuario, nome")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) return json403("Perfil não encontrado");
    if (!["admin","master"].includes(profile.tipo_usuario)) {
      return json403("Apenas admin e master podem ativar versões de fontes");
    }

    const body = await req.json();
    const { versao_id } = body;
    if (!versao_id) return json400("versao_id é obrigatório");

    // ── Buscar versão alvo ───────────────────────────────────────────────────
    const { data: versaoAlvo, error: versaoErr } = await supabase
      .from("fontes_preco_versoes")
      .select("id, mes_referencia, status")
      .eq("id", versao_id)
      .single();

    if (versaoErr || !versaoAlvo) return json404("Versão não encontrada");

    if (versaoAlvo.status !== "pendente_validacao") {
      return json400(`Versão não está pendente — status atual: ${versaoAlvo.status}`);
    }

    // ── Arquivar versão ativa atual (se existir) ─────────────────────────────
    const { data: versaoAtual } = await supabase
      .from("fontes_preco_versoes")
      .select("id, mes_referencia")
      .eq("status", "ativa")
      .maybeSingle();

    if (versaoAtual) {
      const { error: arquivarErr } = await supabase
        .from("fontes_preco_versoes")
        .update({ status: "arquivada" })
        .eq("id", versaoAtual.id);

      if (arquivarErr) {
        console.error("[ativar-versao] Erro ao arquivar versão atual:", arquivarErr);
        return json500("Erro ao arquivar versão atual");
      }
      console.log(`[ativar-versao] Versão ${versaoAtual.id} (${versaoAtual.mes_referencia}) arquivada`);
    }

    // ── Ativar versão alvo ────────────────────────────────────────────────────
    const { error: ativarErr } = await supabase
      .from("fontes_preco_versoes")
      .update({
        status:      "ativa",
        ativada_at:  new Date().toISOString(),
        ativada_por: user.id,
      })
      .eq("id", versao_id);

    if (ativarErr) {
      console.error("[ativar-versao] Erro ao ativar versão:", ativarErr);

      // Rollback: reativar versão anterior se necessário
      if (versaoAtual) {
        await supabase
          .from("fontes_preco_versoes")
          .update({ status: "ativa" })
          .eq("id", versaoAtual.id);
        console.log("[ativar-versao] Rollback: versão anterior restaurada");
      }
      return json500("Erro ao ativar versão");
    }

    console.log(`[ativar-versao] Versão ${versao_id} (${versaoAlvo.mes_referencia}) ativada por ${profile.nome ?? user.id}`);

    return jsonOk({
      status:               "ativa",
      versao_id:            versao_id,
      mes_referencia:       versaoAlvo.mes_referencia,
      versao_anterior_id:   versaoAtual?.id ?? null,
      ativada_por_nome:     profile.nome ?? user.id,
      ativada_em:           new Date().toISOString(),
    });

  } catch (err) {
    console.error("[ativar-versao] Exception:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json400(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json401(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json403(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json404(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function json500(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
