/**
 * SECURITY: Production-safe logging utility
 * Prevents console.log statements from exposing sensitive data in production
 */

const isDevelopment = import.meta.env.MODE === 'development';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class SecureLogger {
  private static sanitizeData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Filter out sensitive fields
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'email', 'telefone', 'cpf', 'cnpj', 'documento'
    ];
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }

  static debug(message: string, data?: any, context?: LogContext): void {
    if (!isDevelopment) return;
    
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const logEntry = {
      level: 'DEBUG',
      message,
      context,
      data: sanitizedData,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🔍 [${context?.component || 'DEBUG'}]`, message, sanitizedData);
  }

  static info(message: string, data?: any, context?: LogContext): void {
    if (!isDevelopment) return;
    
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    console.log(`ℹ️ [${context?.component || 'INFO'}]`, message, sanitizedData);
  }

  static warn(message: string, data?: any, context?: LogContext): void {
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    console.warn(`⚠️ [${context?.component || 'WARN'}]`, message, sanitizedData);
  }

  static error(message: string, error?: Error, context?: LogContext): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : '[REDACTED]'
    } : undefined;
    
    console.error(`❌ [${context?.component || 'ERROR'}]`, message, errorData);
    
    // In production, you might want to send this to a logging service
    if (!isDevelopment) {
      // TODO: Send to logging service (e.g., Sentry, LogRocket)
    }
  }

  static security(message: string, data?: any, context?: LogContext): void {
    // Security events should always be logged
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    console.warn(`🔒 [SECURITY]`, message, sanitizedData);
    
    // In production, send security events to monitoring service
    if (!isDevelopment) {
      // TODO: Send to security monitoring service
    }
  }
}

export { SecureLogger };