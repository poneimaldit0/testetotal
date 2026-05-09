-- Adicionar novos valores ao ENUM (um por vez para evitar problemas de transação)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ganho' AND enumtypid = 'etapa_crm_enum'::regtype) THEN
    ALTER TYPE etapa_crm_enum ADD VALUE 'ganho';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'perdido' AND enumtypid = 'etapa_crm_enum'::regtype) THEN
    ALTER TYPE etapa_crm_enum ADD VALUE 'perdido';
  END IF;
END $$;

COMMENT ON TYPE etapa_crm_enum IS 
  'Etapas do CRM: orcamento_postado, contato_agendamento, em_orcamento, propostas_enviadas, compatibilizacao, fechamento_contrato, pos_venda_feedback, ganho, perdido';