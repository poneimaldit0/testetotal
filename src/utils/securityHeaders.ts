/**
 * SECURITY: Security headers and middleware configuration for production
 */

import { SECURITY_HEADERS } from './securityConfig';

// Content Security Policy configuration
const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for React inline scripts
    "'unsafe-eval'", // Required for some development tools
    "https://esm.sh",
    "https://*.supabase.co"
  ],
  styleSrc: [
    "'self'", 
    "'unsafe-inline'", // Required for styled-components and Tailwind
    "https://fonts.googleapis.com"
  ],
  imgSrc: [
    "'self'", 
    "data:", 
    "https:", 
    "blob:",
    "https://*.supabase.co"
  ],
  fontSrc: [
    "'self'", 
    "data:",
    "https://fonts.gstatic.com"
  ],
  connectSrc: [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.github.com" // For any GitHub integrations
  ],
  mediaSrc: ["'self'", "data:", "blob:"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: []
};

// Generate CSP string
export const generateCSP = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabDirective} ${sources.join(' ')}`;
    })
    .join('; ');
};

// Security middleware for Express (if needed)
export const securityMiddleware = () => {
  return (req: any, res: any, next: any) => {
    // Apply all security headers
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
      res.setHeader(header, value);
    });
    
    // Custom CSP
    res.setHeader('Content-Security-Policy', generateCSP());
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
  };
};

// Meta tags for HTML head (for static sites)
export const getSecurityMetaTags = () => [
  { 'http-equiv': 'Content-Security-Policy', content: generateCSP() },
  { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
  { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
  { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
  { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
  { 'http-equiv': 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=()' }
];

// Validation functions for input sanitization
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    });
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// CORS configuration
export const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with actual domain
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};