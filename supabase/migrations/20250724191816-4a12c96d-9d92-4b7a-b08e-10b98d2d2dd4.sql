-- Fix remaining function search path vulnerabilities
-- This addresses the 37 remaining functions identified in the security review

-- Fix function search path vulnerabilities for remaining functions
ALTER FUNCTION public.atualizar_acesso_mensal(uuid) SET search_path = '';
ALTER FUNCTION public.atualizar_acesso_diario(uuid) SET search_path = '';
ALTER FUNCTION public.verificar_limite_acessos(uuid) SET search_path = '';
ALTER FUNCTION public.obter_estatisticas_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.buscar_orcamentos_fornecedor(uuid, text, text, text, integer, integer) SET search_path = '';
ALTER FUNCTION public.obter_orcamentos_inscritos(uuid) SET search_path = '';
ALTER FUNCTION public.obter_candidaturas_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.verificar_inscricao_existente(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.inserir_candidatura_fornecedor(uuid, uuid, jsonb, text) SET search_path = '';
ALTER FUNCTION public.atualizar_candidatura_fornecedor(uuid, jsonb, text) SET search_path = '';
ALTER FUNCTION public.obter_detalhes_candidatura(uuid) SET search_path = '';
ALTER FUNCTION public.cancelar_candidatura_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.aprovar_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.rejeitar_fornecedor(uuid, text) SET search_path = '';
ALTER FUNCTION public.get_user_access_stats() SET search_path = '';
ALTER FUNCTION public.get_monthly_registrations() SET search_path = '';
ALTER FUNCTION public.get_fornecedor_inscricoes(date, date) SET search_path = '';
ALTER FUNCTION public.get_orcamentos_postados(date, date) SET search_path = '';
ALTER FUNCTION public.get_status_orcamentos(date, date) SET search_path = '';
ALTER FUNCTION public.get_acessos_unicos(date, date) SET search_path = '';
ALTER FUNCTION public.inserir_orcamento_admin(text, text, text, text, text, text, text, text, text, text, text, uuid, text, text) SET search_path = '';
ALTER FUNCTION public.atualizar_orcamento_admin(uuid, text, text, text, text, text, text, text, text, text, text, text, uuid, text, text) SET search_path = '';
ALTER FUNCTION public.obter_fornecedores_para_combobox() SET search_path = '';
ALTER FUNCTION public.obter_gestores_para_combobox() SET search_path = '';
ALTER FUNCTION public.obter_orcamentos_admin(text, text, text, uuid, uuid, text, text, text, text, integer, integer) SET search_path = '';
ALTER FUNCTION public.arquivar_orcamento(uuid) SET search_path = '';
ALTER FUNCTION public.deletar_orcamento(uuid) SET search_path = '';
ALTER FUNCTION public.duplicar_orcamento(uuid) SET search_path = '';
ALTER FUNCTION public.obter_checklist_itens() SET search_path = '';
ALTER FUNCTION public.inserir_checklist_item(text, text, boolean) SET search_path = '';
ALTER FUNCTION public.atualizar_checklist_item(uuid, text, text, boolean) SET search_path = '';
ALTER FUNCTION public.deletar_checklist_item(uuid) SET search_path = '';
ALTER FUNCTION public.obter_checklist_orcamento(uuid) SET search_path = '';
ALTER FUNCTION public.atualizar_checklist_orcamento(uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.inserir_conta_pagar(text, numeric, date, uuid, uuid, text, text) SET search_path = '';
ALTER FUNCTION public.atualizar_conta_pagar(uuid, text, numeric, date, uuid, uuid, text, text) SET search_path = '';
ALTER FUNCTION public.pagar_conta(uuid, date, text) SET search_path = '';
ALTER FUNCTION public.obter_contas_pagar(text, text, text, uuid, uuid, integer, integer) SET search_path = '';
ALTER FUNCTION public.deletar_conta_pagar(uuid) SET search_path = '';

-- Add security comments
COMMENT ON FUNCTION public.atualizar_acesso_mensal IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';
COMMENT ON FUNCTION public.atualizar_acesso_diario IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';
COMMENT ON FUNCTION public.verificar_limite_acessos IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';