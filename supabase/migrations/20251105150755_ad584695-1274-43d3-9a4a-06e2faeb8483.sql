-- Corrigir search_path da função mover_orcamento_etapa para permitir acesso aos tipos do schema public

DROP FUNCTION IF EXISTS public.mover_orcamento_etapa(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.mover_orcamento_etapa(
  p_orcamento_id uuid,
  p_nova_etapa text,
  p_usuario_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- CORREÇÃO: permitir acesso aos tipos do schema public
AS $function$
DECLARE
  v_etapa_atual text;
  v_usuario_nome text;
BEGIN
  -- Buscar etapa atual
  SELECT etapa_crm::text INTO v_etapa_atual
  FROM orcamentos_crm_tracking
  WHERE orcamento_id = p_orcamento_id;

  IF v_etapa_atual IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Orçamento não encontrado no CRM'
    );
  END IF;

  -- Buscar nome do usuário
  SELECT nome INTO v_usuario_nome
  FROM profiles
  WHERE id = p_usuario_id;

  -- Atualizar etapa E data_entrada_etapa
  UPDATE orcamentos_crm_tracking
  SET 
    etapa_crm = p_nova_etapa::etapa_crm_enum,
    updated_at = NOW(),
    data_entrada_etapa = NOW()
  WHERE orcamento_id = p_orcamento_id;

  -- Registrar no histórico
  INSERT INTO orcamentos_crm_historico (
    orcamento_id,
    etapa_anterior,
    etapa_nova,
    movido_por_id,
    movido_por_nome,
    observacao
  ) VALUES (
    p_orcamento_id,
    v_etapa_atual::etapa_crm_enum,
    p_nova_etapa::etapa_crm_enum,
    p_usuario_id,
    v_usuario_nome,
    p_observacao
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Orçamento movido com sucesso',
    'etapa_anterior', v_etapa_atual,
    'etapa_nova', p_nova_etapa
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'Erro ao mover orçamento: ' || SQLERRM
    );
END;
$function$;