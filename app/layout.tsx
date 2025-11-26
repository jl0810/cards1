import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { PostHogProvider } from "@/app/providers/posthog";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from '@clerk/themes';
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PointMax Velocity",
  description: "Financial dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: '#6366f1' }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${font.className} antialiased`}>
          <PostHogProvider>
            <ThemeProvider
              defaultTheme="dark"
              storageKey="ui-theme"
            >
              {children}
              <Toaster />
              <Analytics />
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
