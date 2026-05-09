-- Primeiro, corrigir o checklist atual que tem contribuições mas não consolidou
-- Atualizar o contador de contribuições recebidas para refletir as contribuições únicas
UPDATE checklist_colaborativo 
SET contribuicoes_recebidas = (
  SELECT COUNT(DISTINCT fornecedor_id) 
  FROM contribuicoes_checklist cc 
  WHERE cc.checklist_colaborativo_id = checklist_colaborativo.id
)
WHERE status = 'fase_colaborativa';

-- Consolidar automaticamente checklists que atingiram o número necessário de contribuições
UPDATE checklist_colaborativo 
SET status = 'checklist_definido',
    data_consolidacao = now()
WHERE status = 'fase_colaborativa' 
  AND contribuicoes_recebidas >= total_fornecedores;

-- Criar função para atualizar contador de contribuições
CREATE OR REPLACE FUNCTION atualizar_contribuicoes_checklist()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contador de contribuições únicas
  UPDATE checklist_colaborativo 
  SET contribuicoes_recebidas = (
    SELECT COUNT(DISTINCT fornecedor_id)
    FROM contribuicoes_checklist 
    WHERE checklist_colaborativo_id = 
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.checklist_colaborativo_id
        ELSE NEW.checklist_colaborativo_id
      END
  ),
  updated_at = now()
  WHERE id = 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.checklist_colaborativo_id
      ELSE NEW.checklist_colaborativo_id
    END;

  -- Verificar se deve consolidar automaticamente
  UPDATE checklist_colaborativo 
  SET status = 'checklist_definido',
      data_consolidacao = now(),
      updated_at = now()
  WHERE id = 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.checklist_colaborativo_id
      ELSE NEW.checklist_colaborativo_id
    END
    AND status = 'fase_colaborativa'
    AND contribuicoes_recebidas >= total_fornecedores;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar automaticamente quando contribuições são inseridas/atualizadas/deletadas
DROP TRIGGER IF EXISTS trigger_atualizar_contribuicoes_checklist ON contribuicoes_checklist;

CREATE TRIGGER trigger_atualizar_contribuicoes_checklist
  AFTER INSERT OR UPDATE OR DELETE ON contribuicoes_checklist
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_contribuicoes_checklist();

-- Criar função para forçar consolidação manual (usada pelos admins)
CREATE OR REPLACE FUNCTION forcar_consolidacao_checklist(checklist_id uuid)
RETURNS json AS $$
DECLARE
  checklist_record checklist_colaborativo%ROWTYPE;
BEGIN
  -- Buscar o checklist
  SELECT * INTO checklist_record 
  FROM checklist_colaborativo 
  WHERE id = checklist_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Checklist não encontrado');
  END IF;
  
  IF checklist_record.status != 'fase_colaborativa' THEN
    RETURN json_build_object('success', false, 'message', 'Checklist já foi consolidado');
  END IF;
  
  -- Forçar consolidação
  UPDATE checklist_colaborativo 
  SET status = 'checklist_definido',
      data_consolidacao = now(),
      updated_at = now()
  WHERE id = checklist_id;
  
  RETURN json_build_object('success', true, 'message', 'Checklist consolidado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover a função existente para poder recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS verificar_checklists_expirados();

-- Criar função para verificar checklists expirados e consolidá-los automaticamente
CREATE OR REPLACE FUNCTION verificar_checklists_expirados()
RETURNS json AS $$
DECLARE
  checklists_expirados INT;
BEGIN
  -- Consolidar checklists expirados
  UPDATE checklist_colaborativo 
  SET status = 'checklist_definido',
      data_consolidacao = now(),
      updated_at = now()
  WHERE status = 'fase_colaborativa' 
    AND prazo_contribuicao < now();
  
  GET DIAGNOSTICS checklists_expirados = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true, 
    'message', format('Processados %s checklists expirados', checklists_expirados),
    'checklists_processados', checklists_expirados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;