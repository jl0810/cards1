import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { AuthProvider } from "@/app/providers/auth-provider";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/shared/skip-link";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CardsGoneCrazy",
  description: "Financial dashboard",
};

// Mobile optimization - moved to separate export per Next.js 15
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
        
        {/* Umami Analytics */}
        <Script
          src="https://analytics.raydoug.com/script.js"
          data-website-id="YOUR_WEBSITE_ID"
          strategy="afterInteractive"
        />
        
        {/* Web Vitals */}
        <Script id="web-vitals" strategy="afterInteractive" type="module">
          {`
            import {onCLS, onINP, onLCP, onFCP, onTTFB} from 'https://unpkg.com/web-vitals@3/dist/web-vitals.js';
            
            function sendToBoth(metric) {
              const data = {
                value: Math.round(metric.value),
                rating: metric.rating,
                delta: Math.round(metric.delta),
                id: metric.id
              };
              
              // Send to GA4
              if (window.gtag) {
                gtag('event', metric.name, {
                  value: data.value,
                  metric_rating: data.rating,
                  metric_delta: data.delta
                });
              }
              
              // Send to Umami
              if (window.umami) {
                umami.track('perf-' + metric.name, data);
              }
            }
            
            // Track all Core Web Vitals
            onCLS(sendToBoth);
            onINP(sendToBoth);
            onLCP(sendToBoth);
            onFCP(sendToBoth);
            onTTFB(sendToBoth);
          `}
        </Script>
      </head>
      <body className={`${font.className} antialiased`}>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <AuthProvider>
          <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
