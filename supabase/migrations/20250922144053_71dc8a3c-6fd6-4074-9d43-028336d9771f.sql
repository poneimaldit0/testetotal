-- Fix the calcular_percentual_acumulado_item function to use correct table names
CREATE OR REPLACE FUNCTION public.calcular_percentual_acumulado_item(
    p_item_checklist_id uuid,
    p_medicao_atual_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_percentual numeric := 0;
BEGIN
    -- Calculate the accumulated percentage for an item, excluding the current measurement if provided
    -- Using correct table names: medicoes_itens and medicoes_obra
    SELECT COALESCE(SUM(mi.percentual_executado), 0)
    INTO total_percentual
    FROM medicoes_itens mi
    JOIN medicoes_obra mo ON mi.medicao_id = mo.id
    WHERE mi.item_checklist_id = p_item_checklist_id
      AND mo.status IN ('enviada', 'aprovada', 'paga')
      AND (p_medicao_atual_id IS NULL OR mo.id != p_medicao_atual_id);
    
    RETURN COALESCE(total_percentual, 0);
END;
$$;