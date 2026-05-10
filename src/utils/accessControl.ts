/**
 * Access control utilities for managing user permissions and view access
 */

export type UserRole = 'master' | 'admin' | 'gestor_conta' | 'fornecedor' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas';
export type ViewType = 'lista' | 'cadastro' | 'aprovacoes' | 'usuarios' | 'relatorios' | 'propostas' | 'comparador' | 'reputacao' | 'controle' | 'financeiro' | 'disponiveis' | 'meus' | 'suporte' | 'revisoes' | 'perfil' | 'integridade' | 'recuperacao' | 'contratos' | 'diario' | 'medicoes' | 'cronograma' | 'materiais' | 'avisos' | 'calculadora-financiamento' | 'crm-orcamentos' | 'crm-marcenaria' | 'crm-motivos-perda' | 'crm-checklist-config' | 'cs-dashboard' | 'produtividade-checklist' | 'saude-empresa' | 'cs-pipeline' | 'produtos-segmentacao' | 'funil-vendas' | 'funil-vendas-admin' | 'dashboard-operacional' | 'sdr-atendimento' | 'gestao-fontes' | 'sdr-inteligencia' | 'central';

// Define which views each user role can access
const roleViewAccess: Record<UserRole, ViewType[]> = {
  master: ['lista', 'cadastro', 'aprovacoes', 'usuarios', 'relatorios', 'propostas', 'comparador', 'reputacao', 'controle', 'financeiro', 'integridade', 'recuperacao', 'avisos', 'crm-orcamentos', 'crm-marcenaria', 'crm-motivos-perda', 'crm-checklist-config', 'produtividade-checklist', 'saude-empresa', 'cs-pipeline', 'produtos-segmentacao', 'funil-vendas-admin', 'dashboard-operacional', 'sdr-atendimento', 'gestao-fontes', 'sdr-inteligencia'],
  admin: ['lista', 'cadastro', 'aprovacoes', 'usuarios', 'relatorios', 'propostas', 'comparador', 'reputacao', 'controle', 'financeiro', 'integridade', 'recuperacao', 'crm-orcamentos', 'crm-marcenaria', 'crm-motivos-perda', 'crm-checklist-config', 'produtividade-checklist', 'cs-pipeline', 'funil-vendas-admin', 'dashboard-operacional', 'sdr-atendimento', 'gestao-fontes', 'sdr-inteligencia'],
  closer: ['funil-vendas'],
  pre_vendas: ['funil-vendas'],
  gestor_conta: ['lista', 'cadastro', 'propostas', 'relatorios', 'crm-orcamentos', 'calculadora-financiamento', 'dashboard-operacional', 'sdr-atendimento'],
  sdr: ['lista', 'cadastro', 'sdr-atendimento'],
  customer_success: ['cs-dashboard', 'lista', 'cadastro', 'relatorios', 'reputacao', 'suporte', 'usuarios', 'aprovacoes', 'crm-marcenaria', 'crm-orcamentos', 'cs-pipeline'], // CS - foco em fornecedores e marcenaria + CRM Kanban
  gestor_marcenaria: ['crm-marcenaria', 'calculadora-financiamento'], // Gestor Marcenaria - CRM Marcenaria + Calculadora
  consultor_marcenaria: ['crm-marcenaria', 'calculadora-financiamento'], // Consultor Marcenaria - seus leads + Calculadora
  fornecedor: ['central', 'disponiveis', 'perfil', 'revisoes'],
  cliente: [] // Clientes não têm acesso ao dashboard principal
};

// Define default view for each user role
const roleDefaultView: Record<UserRole, ViewType> = {
  master: 'dashboard-operacional',
  admin: 'dashboard-operacional',
  gestor_conta: 'dashboard-operacional',
  sdr: 'sdr-atendimento',
  customer_success: 'cs-dashboard', // CS começa no dashboard especializado
  gestor_marcenaria: 'crm-marcenaria', // Gestor Marcenaria começa no CRM Marcenaria
  consultor_marcenaria: 'crm-marcenaria', // Consultor Marcenaria começa no CRM Marcenaria
  closer: 'funil-vendas', // Closer começa no funil de vendas
  pre_vendas: 'funil-vendas', // Pré-Vendas começa no funil
  fornecedor: 'central',
  cliente: 'disponiveis' // Valor padrão, mas clientes serão redirecionados
};

/**
 * Check if a user role has access to a specific view
 */
export const hasViewAccess = (userRole: UserRole, view: ViewType): boolean => {
  return roleViewAccess[userRole]?.includes(view) || false;
};

/**
 * Get the default view for a user role
 */
export const getDefaultView = (userRole: UserRole): ViewType => {
  return roleDefaultView[userRole];
};

/**
 * Get all accessible views for a user role
 */
export const getAccessibleViews = (userRole: UserRole): ViewType[] => {
  return roleViewAccess[userRole] || [];
};

/**
 * Check if user can manage budgets (admin functions)
 */
export const canManageBudgets = (userRole: UserRole): boolean => {
  return ['master', 'admin', 'gestor_conta', 'sdr', 'customer_success'].includes(userRole);
};

/**
 * Check if user can manage suppliers (edit, approve, apply penalties)
 */
export const canManageSuppliers = (userRole: UserRole): boolean => {
  return ['master', 'admin', 'customer_success'].includes(userRole);
};

/**
 * Check if user is a supplier
 */
export const isSupplier = (userRole: UserRole): boolean => {
  return userRole === 'fornecedor';
};

/**
 * Check if user is a client
 */
export const isClient = (userRole: UserRole): boolean => {
  return userRole === 'cliente';
};

/**
 * Check if user should have access to main dashboard
 */
export const canAccessMainDashboard = (userRole: UserRole): boolean => {
  return ['master', 'admin', 'gestor_conta', 'fornecedor', 'sdr', 'customer_success', 'gestor_marcenaria', 'consultor_marcenaria', 'closer', 'pre_vendas'].includes(userRole);
};

/**
 * Full-access bypass: admin and master skip all role-based query filters.
 * Use this as the single guard before applying any per-user data restriction.
 *
 *   if (isFullAccess(role)) return; // no filter
 *   applyFilter(userId);
 */
export const isFullAccess = (userRole: UserRole | string): boolean => {
  return userRole === 'admin' || userRole === 'master';
};
