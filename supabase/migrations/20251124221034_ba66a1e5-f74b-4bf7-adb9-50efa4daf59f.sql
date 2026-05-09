-- Adicionar colunas de lead time nas tabelas de configuração de etapas CRM
ALTER TABLE crm_etapas_config 
ADD COLUMN IF NOT EXISTS dias_limite INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cor_atraso TEXT DEFAULT 'bg-red-100 border-red-500';

ALTER TABLE crm_marcenaria_etapas_config 
ADD COLUMN IF NOT EXISTS dias_limite INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cor_atraso TEXT DEFAULT 'bg-red-100 border-red-500';

COMMENT ON COLUMN crm_etapas_config.dias_limite IS 'Número máximo de dias que um orçamento pode permanecer na etapa antes de ser considerado em atraso';
COMMENT ON COLUMN crm_etapas_config.cor_atraso IS 'Classes Tailwind CSS para estilizar cards em atraso (ex: bg-red-100 border-red-500)';

COMMENT ON COLUMN crm_marcenaria_etapas_config.dias_limite IS 'Número máximo de dias que um lead pode permanecer na etapa antes de ser considerado em atraso';
COMMENT ON COLUMN crm_marcenaria_etapas_config.cor_atraso IS 'Classes Tailwind CSS para estilizar cards em atraso (ex: bg-red-100 border-red-500)';