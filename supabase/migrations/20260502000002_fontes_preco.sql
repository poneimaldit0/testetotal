-- ============================================================
-- Fontes de Preço — sistema de versionamento semi-automático
-- 3 tabelas: versoes, itens, relatorios
-- Todas as operações de escrita via service_role (edge functions)
-- ou diretamente por admin/master autenticados
-- ============================================================

-- 1. Versões — ciclo de aprovação
CREATE TABLE IF NOT EXISTS fontes_preco_versoes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia   TEXT        NOT NULL,   -- 'YYYY-MM'
  status           TEXT        NOT NULL DEFAULT 'pendente_validacao',
  criada_at        TIMESTAMPTZ DEFAULT now(),
  criada_por       UUID        REFERENCES auth.users(id),
  ativada_at       TIMESTAMPTZ,
  ativada_por      UUID        REFERENCES auth.users(id),
  rejeitada_at     TIMESTAMPTZ,
  rejeitada_por    UUID        REFERENCES auth.users(id),
  motivo_rejeicao  TEXT,
  total_itens      INTEGER     DEFAULT 0,
  itens_novos      INTEGER     DEFAULT 0,
  itens_removidos  INTEGER     DEFAULT 0,
  itens_alterados  INTEGER     DEFAULT 0,
  itens_fora_curva INTEGER     DEFAULT 0,
  resumo_mudancas  JSONB,
  CONSTRAINT fpv_status_valid CHECK (status IN ('pendente_validacao','ativa','arquivada','rejeitada'))
);

-- Apenas uma versão ativa no sistema a qualquer momento
CREATE UNIQUE INDEX IF NOT EXISTS fontes_preco_versoes_ativa_unique
  ON fontes_preco_versoes (status)
  WHERE status = 'ativa';

COMMENT ON TABLE fontes_preco_versoes                IS 'Versionamento das bases de preços de referência para estimativas IA. Aprovação manual obrigatória.';
COMMENT ON COLUMN fontes_preco_versoes.mes_referencia IS 'Mês de referência da coleta: formato YYYY-MM';
COMMENT ON COLUMN fontes_preco_versoes.status         IS 'pendente_validacao | ativa | arquivada | rejeitada';

-- 2. Itens — ~50 valores canônicos por versão
CREATE TABLE IF NOT EXISTS fontes_preco_itens (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id           UUID          NOT NULL REFERENCES fontes_preco_versoes(id) ON DELETE CASCADE,
  fonte               TEXT          NOT NULL,
  categoria           TEXT          NOT NULL,
  codigo              TEXT          NOT NULL,   -- ex: 'sinapi_labor_pedreiro', 'cub_r1n'
  descricao           TEXT          NOT NULL,
  unidade             TEXT,
  valor_referencia    NUMERIC(14,4) NOT NULL,
  valor_minimo        NUMERIC(14,4),
  valor_maximo        NUMERIC(14,4),
  variacao_percentual NUMERIC(8,4),             -- % vs versão ativa anterior (negativo = queda)
  data_referencia     DATE,
  status_coleta       TEXT          DEFAULT 'coletado',
  observacoes         TEXT,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT fpi_fonte_valid         CHECK (fonte IN ('sinapi_sp','cub_sp','crea_sp','seconci_sp','aecweb','andora','chronoshare','catalogos')),
  CONSTRAINT fpi_status_coleta_valid CHECK (status_coleta IN ('coletado','pendente_revisao','nao_encontrado','fora_da_curva'))
);

CREATE INDEX IF NOT EXISTS fontes_preco_itens_versao_idx ON fontes_preco_itens(versao_id);
CREATE INDEX IF NOT EXISTS fontes_preco_itens_codigo_idx ON fontes_preco_itens(codigo);

COMMENT ON TABLE fontes_preco_itens                      IS 'Valores canônicos de referência de mercado (SP) por item e versão';
COMMENT ON COLUMN fontes_preco_itens.codigo              IS 'Código canônico do item. Fixo no sistema — ex: sinapi_labor_pedreiro';
COMMENT ON COLUMN fontes_preco_itens.variacao_percentual IS '% de variação em relação à versão ativa anterior (negativo = queda de preço)';
COMMENT ON COLUMN fontes_preco_itens.status_coleta       IS 'coletado | pendente_revisao | nao_encontrado | fora_da_curva (>15% variação)';

-- 3. Relatórios — um por versão, gerado na coleta
CREATE TABLE IF NOT EXISTS fontes_preco_relatorios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id        UUID        NOT NULL REFERENCES fontes_preco_versoes(id) ON DELETE CASCADE,
  gerado_at        TIMESTAMPTZ DEFAULT now(),
  gerado_por       UUID        REFERENCES auth.users(id),
  conteudo         JSONB       NOT NULL DEFAULT '{}',   -- corpo do relatório
  alertas          JSONB       DEFAULT '[]',             -- array de strings com alertas
  recomendacao     TEXT        CHECK (recomendacao IN ('aprovar','revisar')),
  resumo_por_fonte JSONB       DEFAULT '{}'              -- sumário por fonte
);

CREATE UNIQUE INDEX IF NOT EXISTS fontes_preco_relatorios_versao_unique
  ON fontes_preco_relatorios(versao_id);

COMMENT ON TABLE fontes_preco_relatorios              IS 'Relatório de comparação gerado pela IA em cada coleta';
COMMENT ON COLUMN fontes_preco_relatorios.recomendacao IS 'Recomendação da IA: aprovar (maioria coletada) | revisar (muitos incertos)';

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE fontes_preco_versoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fontes_preco_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fontes_preco_relatorios ENABLE ROW LEVEL SECURITY;

-- Leitura: todos autenticados (edge functions e frontend precisam ler a versão ativa)
CREATE POLICY "fpv_select_authenticated" ON fontes_preco_versoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "fpi_select_authenticated" ON fontes_preco_itens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "fpr_select_authenticated" ON fontes_preco_relatorios
  FOR SELECT TO authenticated USING (true);

-- Escrita: apenas admin e master (service_role bypassa RLS automaticamente)
CREATE POLICY "fpv_write_admin_master" ON fontes_preco_versoes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  );

CREATE POLICY "fpi_write_admin_master" ON fontes_preco_itens
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  );

CREATE POLICY "fpr_write_admin_master" ON fontes_preco_relatorios
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo_usuario IN ('admin','master'))
  );
