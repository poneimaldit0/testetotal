-- Alterar campo forma_pagamento para armazenar JSON com estrutura de dados mais rica
ALTER TABLE public.checklist_propostas 
ALTER COLUMN forma_pagamento TYPE jsonb USING 
CASE 
  WHEN forma_pagamento IS NULL OR forma_pagamento = '' THEN NULL::jsonb
  ELSE jsonb_build_object('tipo', 'personalizado', 'texto_personalizado', forma_pagamento)
END;

-- Adicionar comentário para documentar a estrutura esperada
COMMENT ON COLUMN public.checklist_propostas.forma_pagamento IS 'Estrutura JSON: {
  "tipo": "a_vista|entrada_medicoes|medicoes|boletos|cartao|personalizado",
  "desconto_percentual": number (para a_vista),
  "entrada_percentual": number (para entrada_medicoes),
  "medicoes_frequencia": "semanal|quinzenal|mensal",
  "boletos_quantidade": number,
  "boletos_valores": [number, ...],
  "cartao_parcelas": number,
  "texto_personalizado": string
}';