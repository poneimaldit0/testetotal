-- Add column for observations
ALTER TABLE public.candidaturas_fornecedores
ADD COLUMN observacoes_acompanhamento TEXT;

COMMENT ON COLUMN public.candidaturas_fornecedores.observacoes_acompanhamento IS 
  'Observações do fornecedor sobre o acompanhamento do status da candidatura';

-- Create RPC function for secure updates
CREATE OR REPLACE FUNCTION public.atualizar_observacoes_acompanhamento(
  p_inscricao_id uuid,
  p_observacoes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the candidatura belongs to the logged user
  IF NOT EXISTS (
    SELECT 1 FROM public.candidaturas_fornecedores
    WHERE id = p_inscricao_id AND fornecedor_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'inscription_not_found'
    );
  END IF;
  
  -- Update observations
  UPDATE public.candidaturas_fornecedores
  SET observacoes_acompanhamento = p_observacoes,
      updated_at = now()
  WHERE id = p_inscricao_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;