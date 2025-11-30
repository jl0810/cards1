/**
 * Security utilities for content sanitization
 * 
 * @module lib/sanitize
 * @implements BR-027 - Data Sanitization
 * @implements BR-042 - XSS Prevention
 * @satisfies US-036 - Secure Content Display
 */

/**
 * SVG sanitizer - allows only safe SVG elements and attributes
 * Prevents XSS attacks through malicious SVG content
 */
export function sanitizeSvg(svg: string): string {
  if (!svg || typeof svg !== 'string') {
    return '';
  }

  // Remove dangerous elements and attributes using string methods
  let sanitized = svg;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove dangerous elements
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>.*?<\/embed>/gi, '');
  sanitized = sanitized.replace(/<form[^>]*>.*?<\/form>/gi, '');
  sanitized = sanitized.replace(/<input[^>]*>/gi, '');
  sanitized = sanitized.replace(/<button[^>]*>.*?<\/button>/gi, '');
  sanitized = sanitized.replace(/<link[^>]*>/gi, '');
  sanitized = sanitized.replace(/<meta[^>]*>/gi, '');
  
  // Remove dangerous attributes
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Event handlers
  sanitized = sanitized.replace(/javascript:/gi, ''); // JavaScript URLs
  sanitized = sanitized.replace(/data:text\/html/gi, ''); // Data URLs with HTML
  sanitized = sanitized.replace(/vbscript:/gi, ''); // VBScript URLs
  sanitized = sanitized.replace(/<\s*!\[CDATA\[.*?\]\]>/gi, ''); // CDATA sections

  // Additional safety checks
  if (sanitized.includes('<script') || 
      sanitized.includes('javascript:') || 
      sanitized.includes('onload=') ||
      sanitized.includes('onclick=')) {
    // If anything dangerous remains, return empty string
    return '';
  }

  return sanitized;
}

/**
 * HTML sanitizer for user-generated content
 * Strips all HTML tags except for a safe whitelist
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Allow only safe text formatting tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'span'];
  const tagPattern = /<[^>]+>/g;
  
  return html.replace(tagPattern, (match) => {
    const tagName = match.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/)?.[1]?.toLowerCase();
    return allowedTags.includes(tagName || '') ? match : '';
  });
}

/**
 * URL sanitizer - ensures URLs are safe
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    
    // Only allow safe protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }

    return parsed.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Content Security Policy headers for API responses
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;
