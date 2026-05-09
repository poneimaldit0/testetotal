-- Função para obter o próximo número de medição de um contrato
CREATE OR REPLACE FUNCTION public.obter_proximo_numero_medicao(p_contrato_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    proximo_numero integer;
BEGIN
    -- Busca o maior número de medição existente para o contrato e adiciona 1
    SELECT COALESCE(MAX(numero_medicao), 0) + 1
    INTO proximo_numero
    FROM medicoes_obra
    WHERE contrato_id = p_contrato_id
      AND status != 'cancelada'; -- Ignorar medições canceladas
    
    RETURN proximo_numero;
END;
$$;