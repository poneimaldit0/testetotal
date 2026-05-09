/**
 * SECURITY: Global security configuration and utilities
 */

// Content Security Policy headers for enhanced security
export const CSP_HEADERS = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim()
};

// Security headers for all API responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...CSP_HEADERS
};

// Input validation utilities
export class SecurityValidator {
  
  // Validate and sanitize email
  static validateEmail(email: string): { valid: boolean; sanitized?: string; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email é obrigatório' };
    }
    
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(trimmed) || trimmed.length > 320) {
      return { valid: false, error: 'Formato de email inválido' };
    }
    
    return { valid: true, sanitized: trimmed };
  }
  
  // Validate and sanitize text input
  static validateText(text: string, maxLength: number = 100): { valid: boolean; sanitized?: string; error?: string } {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Texto é obrigatório' };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: 'Texto não pode estar vazio' };
    }
    
    if (trimmed.length > maxLength) {
      return { valid: false, error: `Texto deve ter no máximo ${maxLength} caracteres` };
    }
    
    // Remove potentially dangerous characters
    const sanitized = trimmed.replace(/[<>'"&]/g, '');
    
    return { valid: true, sanitized };
  }
  
  // Validate phone number
  static validatePhone(phone: string): { valid: boolean; sanitized?: string; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Telefone é obrigatório' };
    }
    
    // Remove all non-digits, spaces, hyphens, and parentheses
    const sanitized = phone.replace(/[^\d\s\-\(\)]/g, '').trim();
    
    if (sanitized.length < 10 || sanitized.length > 20) {
      return { valid: false, error: 'Telefone deve ter entre 10 e 20 caracteres' };
    }
    
    return { valid: true, sanitized };
  }
  
  // Validate password strength
  static validatePassword(password: string): { valid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Senha é obrigatória' };
    }
    
    if (password.length < 8) {
      return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    }
    
    if (password.length > 128) {
      return { valid: false, error: 'Senha deve ter no máximo 128 caracteres' };
    }
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    
    if (!hasLower || !hasUpper || !hasNumber) {
      return { 
        valid: false, 
        error: 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número' 
      };
    }
    
    const strength = hasSpecial ? 'strong' : 'medium';
    return { valid: true, strength };
  }
}

// Rate limiting configuration
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5, // Max login attempts per 15 minutes
  API_REQUESTS: 100, // Max API requests per minute
  PASSWORD_RESET: 3, // Max password reset requests per hour
};

// Sensitive field names to redact from logs
export const SENSITIVE_FIELDS = [
  'password', 'senha', 'token', 'secret', 'key', 'auth', 'credential',
  'email', 'telefone', 'cpf', 'cnpj', 'documento', 'endereco'
];

// User role hierarchy for authorization
export const USER_ROLES = {
  MASTER: 'master',
  ADMIN: 'admin', 
  GESTOR_CONTA: 'gestor_conta',
  FORNECEDOR: 'fornecedor'
} as const;

type Permission = '*' | 'manage_users' | 'manage_orcamentos' | 'view_reports' | 
  'manage_fornecedores' | 'manage_checklists' | 'view_orcamentos' | 
  'create_candidaturas' | 'manage_own_profile';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [USER_ROLES.MASTER]: ['*'], // All permissions
  [USER_ROLES.ADMIN]: [
    'manage_users', 'manage_orcamentos', 'view_reports', 
    'manage_fornecedores', 'manage_checklists'
  ],
  [USER_ROLES.GESTOR_CONTA]: [
    'manage_orcamentos', 'view_reports'
  ],
  [USER_ROLES.FORNECEDOR]: [
    'view_orcamentos', 'create_candidaturas', 'manage_own_profile'
  ]
};

// Check if user has permission
export function hasPermission(userRole: string, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[userRole];
  if (!rolePerms) return false;
  return rolePerms.includes('*' as Permission) || rolePerms.includes(permission as Permission);
}