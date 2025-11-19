import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { PostHogProvider } from "@/app/providers/posthog";
import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${font.className} bg-dark-900 text-white`}>
          <PostHogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark" // Force dark mode for Velocity theme
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
