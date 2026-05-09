-- Recriar a função com nome de coluna correto (empresa em vez de nome_empresa)
CREATE OR REPLACE FUNCTION public.atualizar_etapa_crm_automatico()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orcamento_id UUID;
  v_etapa_atual TEXT;
  v_etapa_destino TEXT;
  v_ordem_atual INTEGER;
  v_ordem_destino INTEGER;
  v_max_ordem_fornecedores INTEGER;
  v_concierge_id UUID;
  v_fornecedor_nome TEXT;
  v_codigo_orcamento TEXT;
  v_etapa_titulo_atual TEXT;
  v_etapa_titulo_nova TEXT;
BEGIN
  -- Só processa se houve mudança de status
  IF OLD.status_acompanhamento IS NOT DISTINCT FROM NEW.status_acompanhamento THEN
    RETURN NEW;
  END IF;
  
  v_orcamento_id := NEW.orcamento_id;
  
  -- Buscar dados do tracking CRM
  SELECT t.etapa_crm, t.concierge_responsavel_id, o.codigo_orcamento
  INTO v_etapa_atual, v_concierge_id, v_codigo_orcamento
  FROM orcamentos_crm_tracking t
  JOIN orcamentos o ON o.id = t.orcamento_id
  WHERE t.orcamento_id = v_orcamento_id;
  
  -- Se não existe tracking, não faz nada
  IF v_etapa_atual IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar nome do fornecedor (CORRIGIDO: empresa em vez de nome_empresa)
  SELECT COALESCE(p.empresa, p.nome) INTO v_fornecedor_nome
  FROM profiles p WHERE p.id = NEW.fornecedor_id;
  
  -- CASO 1: ORÇAMENTO ARQUIVADO - Notificação Especial
  IF v_etapa_atual IN ('ganho', 'perdido') THEN
    IF v_concierge_id IS NOT NULL THEN
      INSERT INTO notificacoes_sistema (
        usuario_id, tipo, titulo, mensagem,
        referencia_id, tipo_referencia, dados_extras
      ) VALUES (
        v_concierge_id,
        'crm_atividade_orcamento_arquivado',
        'Atividade em Orçamento ' || INITCAP(v_etapa_atual),
        'Atenção: O fornecedor "' || COALESCE(v_fornecedor_nome, 'Desconhecido') || 
        '" atualizou seu status para "' || NEW.status_acompanhamento || 
        '" no orçamento #' || COALESCE(v_codigo_orcamento, 'N/A') || 
        ' que já está marcado como ' || UPPER(v_etapa_atual) || '. Verifique se é necessária alguma ação.',
        v_orcamento_id, 'orcamento_crm',
        jsonb_build_object(
          'etapa_atual', v_etapa_atual,
          'novo_status_fornecedor', NEW.status_acompanhamento,
          'fornecedor_id', NEW.fornecedor_id,
          'fornecedor_nome', v_fornecedor_nome,
          'codigo_orcamento', v_codigo_orcamento,
          'urgente', true
        )
      );
    END IF;
    
    -- Registrar no histórico como bloqueado
    INSERT INTO orcamentos_crm_historico (
      orcamento_id, etapa_anterior, etapa_nova, 
      movido_por_id, movido_por_nome,
      tipo_movimentacao, observacao
    ) VALUES (
      v_orcamento_id, v_etapa_atual::etapa_crm_enum, v_etapa_atual::etapa_crm_enum,
      NEW.fornecedor_id, COALESCE(v_fornecedor_nome, 'Sistema'),
      'automatica',
      'Movimentação bloqueada (arquivado). Fornecedor ' || 
      COALESCE(v_fornecedor_nome, 'Desconhecido') || ' -> ' || NEW.status_acompanhamento
    );
    
    RETURN NEW;
  END IF;
  
  -- CASO 2: ORÇAMENTO ATIVO - Verificar movimentação
  SELECT MAX(m.ordem_prioridade) INTO v_max_ordem_fornecedores
  FROM candidaturas_fornecedores cf
  JOIN mapeamento_status_etapa_crm m 
    ON m.status_fornecedor = cf.status_acompanhamento AND m.ativo = true
  WHERE cf.orcamento_id = v_orcamento_id;
  
  IF v_max_ordem_fornecedores IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar etapa destino
  SELECT etapa_crm_destino INTO v_etapa_destino
  FROM mapeamento_status_etapa_crm
  WHERE ordem_prioridade = v_max_ordem_fornecedores AND ativo = true
  LIMIT 1;
  
  -- Buscar ordens para comparação
  SELECT ordem INTO v_ordem_atual FROM crm_etapas_config WHERE valor = v_etapa_atual AND ativo = true;
  SELECT ordem INTO v_ordem_destino FROM crm_etapas_config WHERE valor = v_etapa_destino AND ativo = true;
  
  -- Só move se destino é MAIOR que atual
  IF v_ordem_destino IS NOT NULL AND v_ordem_atual IS NOT NULL 
     AND v_ordem_destino > v_ordem_atual THEN
    
    SELECT titulo INTO v_etapa_titulo_atual FROM crm_etapas_config WHERE valor = v_etapa_atual;
    SELECT titulo INTO v_etapa_titulo_nova FROM crm_etapas_config WHERE valor = v_etapa_destino;
    
    UPDATE orcamentos_crm_tracking
    SET 
      etapa_crm = v_etapa_destino::etapa_crm_enum,
      data_entrada_etapa = NOW(),
      data_entrada_etapa_atual = NOW(),
      updated_at = NOW()
    WHERE orcamento_id = v_orcamento_id;
    
    INSERT INTO orcamentos_crm_historico (
      orcamento_id, etapa_anterior, etapa_nova, 
      movido_por_id, movido_por_nome,
      tipo_movimentacao, observacao
    ) VALUES (
      v_orcamento_id, v_etapa_atual::etapa_crm_enum, v_etapa_destino::etapa_crm_enum,
      NEW.fornecedor_id, COALESCE(v_fornecedor_nome, 'Sistema'),
      'automatica',
      'Automático: ' || COALESCE(v_fornecedor_nome, 'Fornecedor') || ' -> ' || NEW.status_acompanhamento
    );
    
    IF v_concierge_id IS NOT NULL THEN
      INSERT INTO notificacoes_sistema (
        usuario_id, tipo, titulo, mensagem,
        referencia_id, tipo_referencia, dados_extras
      ) VALUES (
        v_concierge_id,
        'crm_movimentacao_automatica',
        'Card Movido: #' || COALESCE(v_codigo_orcamento, 'N/A'),
        'O orçamento #' || COALESCE(v_codigo_orcamento, 'N/A') || 
        ' foi movido automaticamente de "' || COALESCE(v_etapa_titulo_atual, v_etapa_atual) ||
        '" para "' || COALESCE(v_etapa_titulo_nova, v_etapa_destino) || 
        '" porque ' || COALESCE(v_fornecedor_nome, 'um fornecedor') || 
        ' atualizou status para "' || NEW.status_acompanhamento || '".',
        v_orcamento_id, 'orcamento_crm',
        jsonb_build_object(
          'etapa_anterior', v_etapa_atual,
          'etapa_nova', v_etapa_destino,
          'fornecedor_id', NEW.fornecedor_id,
          'fornecedor_nome', v_fornecedor_nome,
          'status_fornecedor', NEW.status_acompanhamento,
          'codigo_orcamento', v_codigo_orcamento
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;