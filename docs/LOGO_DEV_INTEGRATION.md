# Logo.dev Integration Guide

Complete implementation of Logo.dev for displaying company logos in your application.

## Features

✅ **Domain-based logo lookup** - Automatically fetch logos using company domains
✅ **Name-based fallback** - Search by company name when domain isn't available  
✅ **Multiple formats** - Support for WebP, PNG, and JPG
✅ **Custom sizes** - Request logos at any size
✅ **Theme support** - Light and dark mode logo variants
✅ **Lazy loading** - Optimize performance with native lazy loading
✅ **Graceful fallbacks** - Beautiful colored initials when logos aren't available
✅ **Greyscale option** - Convert logos to greyscale

## Setup

### 1. Environment Variables

Add your Logo.dev publishable key to `.env.local`:

```env
NEXT_PUBLIC_LOGODEV_PUBLISHABLE_KEY=pk_XrNqyWntRnSjcQZmbIQmfA
```

### 2. Next.js Configuration

Add Logo.dev to your image optimization config in `next.config.js`:

```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
    ],
  },
}
```

## Usage

### Basic Usage

```tsx
import { useBankLogo } from '@/hooks/use-bank-logo';

function CompanyLogo({ name }: { name: string }) {
  const logoUrl = useBankLogo(name);
  
  return (
    <img 
      src={logoUrl || '/fallback.png'} 
      alt={`${name} logo`}
      loading="lazy"
    />
  );
}
```

### With Options

```tsx
const logoUrl = useBankLogo('Citibank Online', {
  size: 256,           // Logo size in pixels
  format: 'webp',      // 'webp' | 'png' | 'jpg'
  theme: 'dark',       // 'light' | 'dark'
  greyscale: false,    // Convert to greyscale
});
```

### Theme-Aware Logos

```tsx
function ThemeAwareLogo({ name }: { name: string }) {
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
  
  const logoUrl = useBankLogo(name, { theme });
  
  return <img src={logoUrl} alt={name} loading="lazy" />;
}
```

### Complete Implementation with Fallback

```tsx
function BankLogo({ name }: { name: string }) {
  const [error, setError] = useState(false);
  const logoUrl = useBankLogo(name, {
    size: 128,
    format: 'webp',
  });
  
  // Fallback: Show initials in colored circle
  if (!logoUrl || error) {
    const initials = name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
      
    return (
      <div className="w-32 h-32 rounded-lg bg-blue-600 flex items-center justify-center">
        <span className="text-white text-2xl font-bold">{initials}</span>
      </div>
    );
  }
  
  return (
    <img 
      src={logoUrl} 
      alt={name}
      width={128}
      height={128}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
```

## API Reference

### `useBankLogo(institutionName, options?)`

**Parameters:**
- `institutionName` (string | null) - Company or bank name
- `options` (LogoOptions) - Optional configuration

**Returns:**
- `string | null` - Logo URL or null if not found

### `LogoOptions`

```typescript
interface LogoOptions {
  size?: number;                    // Logo size in pixels (default: 128)
  format?: 'webp' | 'png' | 'jpg'; // Image format (default: webp)
  theme?: 'light' | 'dark';        // Logo theme variant
  greyscale?: boolean;             // Convert to greyscale
}
```

## Supported Banks

The hook includes built-in domain mappings for major banks:

- Citibank / Citi
- Chase / JPMorgan Chase
- Bank of America
- Wells Fargo
- American Express / Amex
- Capital One
- US Bank
- PNC
- TD Bank
- Truist
- Goldman Sachs / Marcus
- Ally Bank
- Discover
- Navy Federal
- USAA

For banks not in the mapping, it automatically falls back to name-based search.

## Performance Optimization

1. **Lazy Loading**: All logos use `loading="lazy"` attribute
2. **WebP Format**: Default format is WebP for smaller file sizes
3. **Caching**: Logo.dev automatically caches logos via CDN
4. **Fallbacks**: Instant fallback UI prevents layout shifts

## Examples

See `components/examples/logo-dev-examples.tsx` for complete working examples.

## Troubleshooting

**Logo not loading?**
- Check that `NEXT_PUBLIC_LOGODEV_PUBLISHABLE_KEY` is set
- Verify the company name or domain is correct
- Check browser console for CORS or network errors

**Fallback showing instead of logo?**
- Logo.dev may not have that company's logo
- The fallback with colored initials is intentional and looks professional

## Resources

- [Logo.dev Documentation](https://www.logo.dev/docs)
- [Logo.dev Pricing](https://www.logo.dev/pricing)
- [Support](mailto:support@logo.dev)
