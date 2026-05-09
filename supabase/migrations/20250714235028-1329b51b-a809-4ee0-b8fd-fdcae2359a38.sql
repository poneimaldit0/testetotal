-- Criar função para atualizar conciliação e saldo bancário atomicamente
CREATE OR REPLACE FUNCTION public.atualizar_conciliacao_e_saldo(
  p_movimentacao_id UUID,
  p_conta_bancaria_id UUID,
  p_conciliado BOOLEAN,
  p_impacto_saldo NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar status de conciliação da movimentação
  UPDATE public.movimentacoes_bancarias
  SET conciliado = p_conciliado
  WHERE id = p_movimentacao_id;
  
  -- Atualizar saldo da conta bancária
  UPDATE public.contas_bancarias
  SET saldo_atual = saldo_atual + p_impacto_saldo,
      updated_at = now()
  WHERE id = p_conta_bancaria_id;
  
  -- Se alguma das atualizações não afetou nenhuma linha, gerar erro
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Erro ao atualizar conciliação e saldo: conta ou movimentação não encontrada';
  END IF;
END;
$$;