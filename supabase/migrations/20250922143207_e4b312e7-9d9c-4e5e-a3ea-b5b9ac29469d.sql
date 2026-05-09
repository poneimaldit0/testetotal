-- Remove the ambiguous function with single parameter
DROP FUNCTION IF EXISTS public.calcular_percentual_acumulado_item(p_item_checklist_id uuid);

-- Keep only the function with two parameters for better control
-- This function should already exist but let's ensure it's properly defined
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
    SELECT COALESCE(SUM(mi.percentual_executado), 0)
    INTO total_percentual
    FROM medicao_itens mi
    JOIN medicoes m ON mi.medicao_id = m.id
    WHERE mi.item_checklist_id = p_item_checklist_id
      AND m.status IN ('enviada', 'aprovada', 'paga')
      AND (p_medicao_atual_id IS NULL OR m.id != p_medicao_atual_id);
    
    RETURN COALESCE(total_percentual, 0);
END;
$$;