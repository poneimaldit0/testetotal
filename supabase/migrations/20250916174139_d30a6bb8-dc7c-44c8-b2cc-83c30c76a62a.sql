-- Atualizar status de proposta quando revisão é concluída
CREATE OR REPLACE FUNCTION public.notificar_revisao_concluida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cliente_record RECORD;
  orcamento_record RECORD;
BEGIN
  -- Só executar se status mudou para concluída
  IF OLD.status != 'concluida' AND NEW.status = 'concluida' THEN
    
    -- Buscar dados do cliente e orçamento
    SELECT 
      NEW.cliente_temp_email as cliente_email,
      o.necessidade,
      o.local,
      p.nome as fornecedor_nome
    INTO cliente_record
    FROM revisoes_propostas_clientes rpc
    JOIN checklist_propostas cp ON cp.id = rpc.checklist_proposta_id
    JOIN candidaturas_fornecedores cf ON cf.id = cp.candidatura_id
    JOIN profiles p ON p.id = cf.fornecedor_id
    JOIN orcamentos o ON o.id = cf.orcamento_id
    WHERE rpc.id = NEW.id;
    
    -- Log da conclusão (pode ser usado para enviar email)
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(),
      'revisao_concluida: ' || cliente_record.fornecedor_nome || 
      ' finalizou revisão para ' || cliente_record.cliente_email ||
      ' - Projeto: ' || cliente_record.necessidade
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para revisões concluídas
DROP TRIGGER IF EXISTS trigger_notificar_revisao_concluida ON public.revisoes_propostas_clientes;
CREATE TRIGGER trigger_notificar_revisao_concluida
  AFTER UPDATE ON public.revisoes_propostas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_revisao_concluida();