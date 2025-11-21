/**
 * Logo.dev Integration Example
 * 
 * This file demonstrates all the features of the Logo.dev integration:
 * 1. Display logos for any company using their domain name
 * 2. Handle different image sizes and formats (WebP, PNG, JPG)
 * 3. Add fallbacks for companies without logos
 * 4. Optimize for performance with lazy loading
 * 5. Support both light and dark mode logos
 */

import { useBankLogo, LogoOptions } from '@/hooks/use-bank-logo';
import { useState, useEffect } from 'react';

// Example 1: Basic usage with defaults
export function BasicLogo({ companyName }: { companyName: string }) {
    const logoUrl = useBankLogo(companyName);

    return (
        <img
            src={logoUrl || '/fallback-logo.png'}
            alt={`${companyName} logo`}
            loading="lazy"
        />
    );
}

// Example 2: Custom size and format
export function CustomSizeLogo({ companyName }: { companyName: string }) {
    const logoUrl = useBankLogo(companyName, {
        size: 256,      // Larger logo
        format: 'png',  // PNG instead of WebP
    });

    return (
        <img
            src={logoUrl || '/fallback-logo.png'}
            alt={`${companyName} logo`}
            width={256}
            height={256}
            loading="lazy"
        />
    );
}

// Example 3: Theme-aware logo (light/dark mode)
export function ThemeAwareLogo({ companyName }: { companyName: string }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Detect system theme
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        const handler = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const logoUrl = useBankLogo(companyName, {
        theme: theme,
        format: 'webp',
    });

    return (
        <img
            src={logoUrl || '/fallback-logo.png'}
            alt={`${companyName} logo`}
            loading="lazy"
        />
    );
}

// Example 4: Greyscale logo
export function GreyscaleLogo({ companyName }: { companyName: string }) {
    const logoUrl = useBankLogo(companyName, {
        greyscale: true,
        size: 128,
    });

    return (
        <img
            src={logoUrl || '/fallback-logo.png'}
            alt={`${companyName} logo`}
            loading="lazy"
        />
    );
}

// Example 5: Complete implementation with error handling and fallback
export function CompleteLogo({ companyName }: { companyName: string }) {
    const [error, setError] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        const handler = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const logoUrl = useBankLogo(companyName, {
        size: 128,
        format: 'webp',
        theme: theme,
    });

    // Fallback component when logo fails to load
    const FallbackLogo = () => {
        const initials = companyName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        return (
            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">{initials}</span>
            </div>
        );
    };

    if (!logoUrl || error) {
        return <FallbackLogo />;
    }

    return (
        <img
            src={logoUrl}
            alt={`${companyName} logo`}
            width={128}
            height={128}
            loading="lazy"
            onError={() => setError(true)}
            className="rounded-lg"
        />
    );
}

/**
 * Usage Examples:
 * 
 * <BasicLogo companyName="Citibank Online" />
 * <CustomSizeLogo companyName="Chase" />
 * <ThemeAwareLogo companyName="Bank of America" />
 * <GreyscaleLogo companyName="Wells Fargo" />
 * <CompleteLogo companyName="American Express" />
 */
