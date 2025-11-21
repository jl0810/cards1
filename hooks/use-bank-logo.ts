import { useState, useEffect } from 'react';

// Map of institution names to their domains
const INSTITUTION_MAPPING: Record<string, string> = {
    'citibank': 'citi.com',
    'citibank online': 'citi.com',
    'citi': 'citi.com',
    'chase': 'chase.com',
    'jpmorgan chase': 'chase.com',
    'bank of america': 'bankofamerica.com',
    'wells fargo': 'wellsfargo.com',
    'american express': 'americanexpress.com',
    'amex': 'americanexpress.com',
    'capital one': 'capitalone.com',
    'us bank': 'usbank.com',
    'pnc': 'pnc.com',
    'td bank': 'td.com',
    'truist': 'truist.com',
    'goldman sachs': 'goldmansachs.com',
    'marcus': 'marcus.com',
    'ally bank': 'ally.com',
    'discover': 'discover.com',
    'navy federal': 'navyfederal.org',
    'usaa': 'usaa.com',
};

export interface LogoOptions {
    size?: number;           // Logo size in pixels (default: 128)
    format?: 'webp' | 'png' | 'jpg';  // Image format (default: webp)
    theme?: 'light' | 'dark'; // Logo theme variant
    greyscale?: boolean;     // Convert to greyscale
}

export function useBankLogo(institutionName: string | null, options: LogoOptions = {}) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!institutionName) {
            setLogoUrl(null);
            return;
        }

        const token = process.env.NEXT_PUBLIC_LOGODEV_PUBLISHABLE_KEY || 'pk_XrNqyWntRnSjcQZmbIQmfA';

        // Normalize the institution name
        const normalized = institutionName.toLowerCase().trim();

        // Try to find a domain match in our mapping
        let domain = INSTITUTION_MAPPING[normalized];

        // If no exact match, try partial matches
        if (!domain) {
            for (const [key, value] of Object.entries(INSTITUTION_MAPPING)) {
                if (normalized.includes(key) || key.includes(normalized)) {
                    domain = value;
                    break;
                }
            }
        }

        // Build query parameters
        const params = new URLSearchParams({ token });
        if (options.size) params.append('size', options.size.toString());
        if (options.format) params.append('format', options.format);
        if (options.theme) params.append('theme', options.theme);
        if (options.greyscale) params.append('greyscale', 'true');

        // If we have a domain, use domain-based lookup
        if (domain) {
            setLogoUrl(`https://img.logo.dev/${domain}?${params.toString()}`);
        } else {
            // Fallback to name-based search
            const cleanName = institutionName
                .replace(/\s+(online|bank|credit union|cu)$/i, '')
                .trim();
            setLogoUrl(`https://img.logo.dev/name/${encodeURIComponent(cleanName)}?${params.toString()}`);
        }
    }, [institutionName, options.size, options.format, options.theme, options.greyscale]);

    return logoUrl;
}
