-- Fix search path for remaining security definer functions
-- This addresses the function search path vulnerabilities identified in the security review

ALTER FUNCTION public.apropriar_gestor_conta(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.atualizar_conciliacao_e_saldo(uuid, uuid, boolean, numeric) SET search_path = '';
ALTER FUNCTION public.atualizar_status_acompanhamento(uuid, status_acompanhamento_enum) SET search_path = '';
ALTER FUNCTION public.calcular_dias_restantes_contrato(uuid) SET search_path = '';
ALTER FUNCTION public.can_access_financial() SET search_path = '';
ALTER FUNCTION public.excluir_orcamento_admin(uuid) SET search_path = '';
ALTER FUNCTION public.excluir_usuario_admin(uuid) SET search_path = '';
ALTER FUNCTION public.fechar_caixa(uuid, date, text) SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.inscrever_fornecedor_com_limite(uuid, uuid, text, text, text, text) SET search_path = '';
ALTER FUNCTION public.is_master_or_admin() SET search_path = '';
ALTER FUNCTION public.is_user_admin(uuid) SET search_path = '';
ALTER FUNCTION public.obter_cadastros_pendentes() SET search_path = '';
ALTER FUNCTION public.obter_estatisticas_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.obter_inscricoes_usuario_mes(uuid) SET search_path = '';
ALTER FUNCTION public.obter_inscricoes_usuario_total(uuid) SET search_path = '';
ALTER FUNCTION public.obter_orcamentos_mes_atual() SET search_path = '';
ALTER FUNCTION public.processar_candidatura_fornecedor(uuid, uuid, text, text, text, text) SET search_path = '';
ALTER FUNCTION public.processar_fornecedor_individual(uuid, uuid, boolean, text) SET search_path = '';
ALTER FUNCTION public.processar_lote_fornecedores(uuid, integer) SET search_path = '';
ALTER FUNCTION public.processar_lote_fornecedores_real(uuid, integer) SET search_path = '';
ALTER FUNCTION public.reabrir_caixa(uuid, date, text) SET search_path = '';
ALTER FUNCTION public.registrar_acesso_bem_sucedido(uuid) SET search_path = '';
ALTER FUNCTION public.relatorio_acessos_unicos_diarios(date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_inscricoes_fornecedor(uuid, date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_orcamentos_postados_diarios(date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_status_orcamentos_fornecedor(uuid, date, date) SET search_path = '';
ALTER FUNCTION public.reset_contadores_diarios() SET search_path = '';
ALTER FUNCTION public.trigger_verificar_contratos() SET search_path = '';
ALTER FUNCTION public.verificar_contratos_expirados() SET search_path = '';
ALTER FUNCTION public.verificar_limite_acesso(uuid) SET search_path = '';
ALTER FUNCTION public.verificar_periodo_fechado(uuid, date) SET search_path = '';

-- Add comprehensive security comments
COMMENT ON FUNCTION public.excluir_usuario_admin IS 'SECURITY: Function uses restricted search_path and admin-only access control';
COMMENT ON FUNCTION public.excluir_orcamento_admin IS 'SECURITY: Function uses restricted search_path and admin-only access control';
COMMENT ON FUNCTION public.aprovar_fornecedor_admin IS 'SECURITY: Function uses restricted search_path and admin authorization checks';
COMMENT ON FUNCTION public.rejeitar_fornecedor_admin IS 'SECURITY: Function uses restricted search_path and admin authorization checks';