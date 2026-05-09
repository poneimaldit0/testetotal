-- Função para importar orçamentos recentes (15/10 até hoje) para CRM Marcenaria
CREATE OR REPLACE FUNCTION importar_orcamentos_recentes_marcenaria()
RETURNS TABLE (
  leads_criados INTEGER,
  periodo_inicio TIMESTAMP,
  periodo_fim TIMESTAMP,
  status_resumo JSONB
) AS $$
DECLARE
  v_count INTEGER := 0;
  v_orcamento RECORD;
  v_status_count JSONB := '{}'::JSONB;
  v_data_inicio TIMESTAMP := '2025-10-15 00:00:00';
  v_data_fim TIMESTAMP := NOW();
  v_lead_id UUID;
BEGIN
  -- Loop pelos orçamentos do período específico (15/10 até hoje)
  FOR v_orcamento IN (
    SELECT 
      o.id,
      o.codigo_orcamento,
      o.status,
      o.dados_contato->>'nome' as cliente_nome,
      o.dados_contato->>'email' as cliente_email,
      o.dados_contato->>'telefone' as cliente_telefone,
      o.created_at
    FROM orcamentos o
    WHERE o.created_at >= v_data_inicio
    AND o.created_at <= v_data_fim
    AND NOT EXISTS (
      SELECT 1 FROM crm_marcenaria_leads cml 
      WHERE cml.orcamento_id = o.id
    )
    ORDER BY o.created_at DESC
  )
  LOOP
    -- Inserir lead na etapa "abordagem_inicial" (desbloqueado)
    INSERT INTO crm_marcenaria_leads (
      orcamento_id,
      codigo_orcamento,
      cliente_nome,
      cliente_email,
      cliente_telefone,
      etapa_marcenaria,
      bloqueado,
      data_desbloqueio,
      data_criacao_lead,
      created_at
    ) VALUES (
      v_orcamento.id,
      v_orcamento.codigo_orcamento,
      v_orcamento.cliente_nome,
      v_orcamento.cliente_email,
      v_orcamento.cliente_telefone,
      'abordagem_inicial',
      FALSE,
      NOW(),
      NOW(),
      v_orcamento.created_at  -- Preserva data original do orçamento
    )
    RETURNING id INTO v_lead_id;
    
    -- Registrar histórico inicial da criação do lead
    INSERT INTO crm_marcenaria_historico (
      lead_id,
      etapa_anterior,
      etapa_nova,
      movido_por_id,
      movido_por_nome,
      observacao,
      data_movimentacao
    ) VALUES (
      v_lead_id,
      NULL,
      'abordagem_inicial',
      NULL,
      'Sistema - Importação',
      format('Lead criado via importação em massa. Orçamento original de %s', v_orcamento.created_at::DATE),
      NOW()
    );
    
    -- Incrementar contador
    v_count := v_count + 1;
    
    -- Atualizar contagem por status do orçamento
    v_status_count := jsonb_set(
      v_status_count,
      ARRAY[v_orcamento.status],
      to_jsonb(COALESCE((v_status_count->v_orcamento.status)::INTEGER, 0) + 1)
    );
  END LOOP;
  
  RETURN QUERY SELECT v_count, v_data_inicio, v_data_fim, v_status_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a importação automaticamente
DO $$
DECLARE
  v_resultado RECORD;
BEGIN
  SELECT * INTO v_resultado FROM importar_orcamentos_recentes_marcenaria();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTAÇÃO CRM MARCENARIA CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Leads criados: %', v_resultado.leads_criados;
  RAISE NOTICE 'Período: % até %', v_resultado.periodo_inicio::DATE, v_resultado.periodo_fim::DATE;
  RAISE NOTICE 'Distribuição por status: %', v_resultado.status_resumo;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Todos os leads foram criados na etapa "abordagem_inicial"';
  RAISE NOTICE 'Status: DESBLOQUEADOS (bloqueado = false)';
  RAISE NOTICE 'Prontos para apropriação e trabalho imediato';
  RAISE NOTICE '========================================';
END $$;

-- Limpar a função após uso (opcional - mantém o ambiente limpo)
DROP FUNCTION IF EXISTS importar_orcamentos_recentes_marcenaria();