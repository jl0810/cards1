/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 * 
 * @implements BR-041 - Accessibility Standards
 * @satisfies US-035 - Screen Reader Support
 */

/**
 * Check color contrast ratio (simplified version)
 * For production, use a proper contrast checking library
 */
export function checkContrastRatio(foreground: string, background: string): {
  ratio: number;
  passes: {
    aa_normal: boolean;
    aa_large: boolean;
    aaa_normal: boolean;
    aaa_large: boolean;
  };
} {
  // This is a simplified version - in production use a proper library
  // like 'color-contrast-checker' or 'tinycolor2'
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);

  return {
    ratio,
    passes: {
      aa_normal: ratio >= 4.5,
      aa_large: ratio >= 3.0,
      aaa_normal: ratio >= 7.0,
      aaa_large: ratio >= 4.5,
    }
  };
}

/**
 * Generate accessibility attributes for interactive elements
 */
export function getAccessibilityProps(options: {
  label?: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
}) {
  const props: Record<string, string | boolean> = {};
  
  if (options.label) {
    props['aria-label'] = options.label;
  }
  
  if (options.description) {
    props['aria-describedby'] = options.description;
  }
  
  if (options.required) {
    props['aria-required'] = true;
  }
  
  if (options.invalid) {
    props['aria-invalid'] = true;
    props['aria-errormessage'] = options.errorMessage || '';
  }
  
  return props;
}

/**
 * Check if element meets minimum touch target size (44x44px)
 */
export function checkTouchTargetSize(element: HTMLElement): {
  passes: boolean;
  width: number;
  height: number;
  recommendation?: string;
} {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const passes = width >= 44 && height >= 44;
  
  return {
    passes,
    width,
    height,
    recommendation: passes ? undefined : 
      `Increase touch target to at least 44x44px. Current: ${Math.round(width)}x${Math.round(height)}px`
  };
}

/**
 * WCAG 2.1 AA checklist for development
 */
export const WCAG_CHECKLIST = {
  images: [
    "All images have alt text (or alt='' for decorative)",
    "Complex images have long descriptions",
    "Image buttons have descriptive alt text"
  ],
  forms: [
    "All form inputs have associated labels",
    "Required fields are programmatically indicated",
    "Error messages are associated with inputs",
    "Form validation provides clear feedback"
  ],
  keyboard: [
    "All interactive elements are keyboard accessible",
    "Tab order follows logical reading order",
    "Focus indicators are clearly visible",
    "No keyboard traps"
  ],
  color: [
    "Text contrast meets 4.5:1 ratio",
    "Large text contrast meets 3:1 ratio",
    "UI components contrast meets 3:1 ratio",
    "Information not conveyed by color alone"
  ],
  structure: [
    "Proper heading hierarchy (h1-h6)",
    "Lists are properly marked up",
    "Landmarks are used (nav, main, header, footer)",
    "Skip links provided for keyboard navigation"
  ]
} as const;
