-- Correção completa para sincronização de valores em contas pagas

-- 1. Correção imediata do caso específico do CRM
UPDATE public.transacoes_financeiras 
SET valor = 3464.05, updated_at = now()
WHERE id = 'c1e21ae4-172f-41ec-a7b8-1b937630431e';

UPDATE public.movimentacoes_bancarias 
SET valor = 3464.05
WHERE id = '689ca40e-4157-49be-997d-23d7316bc694';

-- 2. Função para sincronizar valores de contas pagas
CREATE OR REPLACE FUNCTION public.sincronizar_valores_conta_pagar()
RETURNS TRIGGER AS $$
BEGIN
  -- Se valor_original mudou em conta já paga, atualizar transações relacionadas
  IF OLD.valor_original != NEW.valor_original AND NEW.status = 'pago' THEN
    
    -- Atualizar transações financeiras relacionadas
    UPDATE public.transacoes_financeiras 
    SET valor = NEW.valor_original,
        updated_at = now()
    WHERE conta_pagar_id = NEW.id;
    
    -- Atualizar movimentações bancárias relacionadas
    UPDATE public.movimentacoes_bancarias 
    SET valor = NEW.valor_original
    WHERE origem_id = NEW.id 
      AND origem_tipo = 'conta_pagar';
    
    -- Log da sincronização
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(), 
      'sincronizacao_conta_pagar: ' || NEW.id::text || 
      ' - valor atualizado de ' || OLD.valor_original || 
      ' para ' || NEW.valor_original
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sincronizar_conta_pagar ON public.contas_pagar;

CREATE TRIGGER trigger_sincronizar_conta_pagar
  AFTER UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_valores_conta_pagar();

-- 4. Função para validar edição de conta paga
CREATE OR REPLACE FUNCTION public.validar_edicao_conta_paga(p_conta_id uuid, p_novo_valor numeric)
RETURNS jsonb AS $$
DECLARE
  conta_record RECORD;
  transacoes_count INTEGER;
  movimentacoes_count INTEGER;
BEGIN
  -- Verificar se é master
  IF NOT public.is_master() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Apenas usuários master podem editar contas pagas'
    );
  END IF;

  -- Buscar dados da conta
  SELECT * INTO conta_record
  FROM public.contas_pagar
  WHERE id = p_conta_id;

  IF conta_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Conta não encontrada'
    );
  END IF;

  -- Se não está paga, pode editar normalmente
  IF conta_record.status != 'pago' THEN
    RETURN jsonb_build_object(
      'success', true,
      'warning', false,
      'message', 'Conta pode ser editada normalmente'
    );
  END IF;

  -- Contar transações e movimentações relacionadas
  SELECT COUNT(*) INTO transacoes_count
  FROM public.transacoes_financeiras
  WHERE conta_pagar_id = p_conta_id;

  SELECT COUNT(*) INTO movimentacoes_count
  FROM public.movimentacoes_bancarias
  WHERE origem_id = p_conta_id AND origem_tipo = 'conta_pagar';

  -- Retornar informações sobre o impacto
  RETURN jsonb_build_object(
    'success', true,
    'warning', true,
    'message', 'Esta conta já foi paga. A edição afetará transações e movimentações relacionadas.',
    'impacto', jsonb_build_object(
      'valor_atual', conta_record.valor_original,
      'novo_valor', p_novo_valor,
      'diferenca', p_novo_valor - conta_record.valor_original,
      'transacoes_afetadas', transacoes_count,
      'movimentacoes_afetadas', movimentacoes_count
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;