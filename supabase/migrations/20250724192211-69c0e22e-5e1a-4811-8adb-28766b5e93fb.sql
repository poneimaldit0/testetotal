-- Fix function search path vulnerabilities for existing functions only
-- This addresses the security issues identified in the review

-- Fix search path for existing functions
ALTER FUNCTION public.apropriar_gestor_conta(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.aprovar_fornecedor_admin(uuid) SET search_path = '';
ALTER FUNCTION public.atualizar_conciliacao_e_saldo(uuid, numeric, text) SET search_path = '';
ALTER FUNCTION public.atualizar_status_acompanhamento(uuid, text) SET search_path = '';
ALTER FUNCTION public.calcular_dias_restantes_contrato(date) SET search_path = '';
ALTER FUNCTION public.can_access_financial() SET search_path = '';
ALTER FUNCTION public.can_manage_orcamentos() SET search_path = '';
ALTER FUNCTION public.criar_movimentacao_bancaria(uuid, text, numeric, date, text, text, uuid, text) SET search_path = '';
ALTER FUNCTION public.excluir_orcamento_admin(uuid) SET search_path = '';
ALTER FUNCTION public.excluir_usuario_admin(uuid) SET search_path = '';
ALTER FUNCTION public.fechar_caixa(uuid, date) SET search_path = '';
ALTER FUNCTION public.get_all_users() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.inscrever_fornecedor_com_limite(uuid, uuid, text, text, text, text) SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_gestor_conta() SET search_path = '';
ALTER FUNCTION public.is_master() SET search_path = '';
ALTER FUNCTION public.is_master_or_admin() SET search_path = '';
ALTER FUNCTION public.is_user_admin(uuid) SET search_path = '';
ALTER FUNCTION public.listar_fornecedores_para_relatorio() SET search_path = '';
ALTER FUNCTION public.listar_gestores_conta() SET search_path = '';
ALTER FUNCTION public.obter_cadastros_pendentes() SET search_path = '';
ALTER FUNCTION public.obter_estatisticas_fornecedor(uuid) SET search_path = '';
ALTER FUNCTION public.obter_inscricoes_usuario_mes(uuid) SET search_path = '';
ALTER FUNCTION public.obter_inscricoes_usuario_total(uuid) SET search_path = '';
ALTER FUNCTION public.obter_orcamentos_mes_atual() SET search_path = '';
ALTER FUNCTION public.processar_candidatura_fornecedor(uuid, text, text, text, text, uuid) SET search_path = '';
ALTER FUNCTION public.processar_fornecedor_individual(uuid) SET search_path = '';
ALTER FUNCTION public.processar_lote_fornecedores(uuid, integer) SET search_path = '';
ALTER FUNCTION public.processar_lote_fornecedores_real(uuid) SET search_path = '';
ALTER FUNCTION public.reabrir_caixa(uuid) SET search_path = '';
ALTER FUNCTION public.registrar_acesso_bem_sucedido(uuid) SET search_path = '';
ALTER FUNCTION public.rejeitar_fornecedor_admin(uuid, text) SET search_path = '';
ALTER FUNCTION public.relatorio_acessos_unicos_diarios(date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_inscricoes_fornecedor(date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_orcamentos_postados_diarios(date, date) SET search_path = '';
ALTER FUNCTION public.relatorio_status_orcamentos_fornecedor(date, date) SET search_path = '';
ALTER FUNCTION public.reset_contadores_diarios() SET search_path = '';
ALTER FUNCTION public.sincronizar_valores_conta_pagar(uuid) SET search_path = '';
ALTER FUNCTION public.trigger_verificar_contratos() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.validar_edicao_conta_paga(uuid) SET search_path = '';
ALTER FUNCTION public.verificar_contratos_expirados() SET search_path = '';
ALTER FUNCTION public.verificar_limite_acesso(uuid) SET search_path = '';
ALTER FUNCTION public.verificar_periodo_fechado(date, uuid) SET search_path = '';

-- Add security comments to key functions
COMMENT ON FUNCTION public.is_admin IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';
COMMENT ON FUNCTION public.is_master IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';
COMMENT ON FUNCTION public.verificar_limite_acesso IS 'SECURITY: Function uses restricted search_path to prevent search path vulnerabilities';