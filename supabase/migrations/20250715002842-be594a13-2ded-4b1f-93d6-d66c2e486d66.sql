-- Corrigir a função criar_movimentacao_bancaria para mapear tipos corretamente
CREATE OR REPLACE FUNCTION public.criar_movimentacao_bancaria()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Se uma transação tem conta bancária vinculada, criar movimentação
  IF NEW.conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias (
      conta_bancaria_id,
      data_movimentacao,
      tipo,
      valor,
      descricao,
      origem_tipo,
      origem_id
    ) VALUES (
      NEW.conta_bancaria_id,
      NEW.data_transacao,
      -- Mapear tipos corretamente para movimentações bancárias
      CASE 
        WHEN NEW.tipo = 'recebimento' THEN 'entrada'
        WHEN NEW.tipo = 'pagamento' THEN 'saida'
        ELSE NEW.tipo -- fallback para outros tipos
      END,
      NEW.valor,
      CASE 
        WHEN NEW.tipo = 'recebimento' THEN 'Recebimento: ' || 
          (SELECT descricao FROM public.contas_receber WHERE id = NEW.conta_receber_id LIMIT 1)
        WHEN NEW.tipo = 'pagamento' THEN 'Pagamento: ' || 
          (SELECT descricao FROM public.contas_pagar WHERE id = NEW.conta_pagar_id LIMIT 1)
        ELSE 'Transação financeira'
      END,
      CASE 
        WHEN NEW.conta_receber_id IS NOT NULL THEN 'conta_receber'
        WHEN NEW.conta_pagar_id IS NOT NULL THEN 'conta_pagar'
        ELSE 'manual'
      END,
      COALESCE(NEW.conta_receber_id, NEW.conta_pagar_id)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;