import { Rocket } from "lucide-react";
import NextLink from "next/link";
import * as React from "react";


// Use Next.js Link and forward the ref
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof NextLink>
>((props, ref) => <NextLink ref={ref} {...props} />);
Link.displayName = "Link";


interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}


export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Column (Branding) */}
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-primary via-primary/70 to-blue-500 p-8 text-white lg:flex">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 z-10">
          <Rocket className="h-6 w-6" />
          <span className="font-bold text-lg">SaaS Kit</span>
        </Link>

        {/* Testimonial/Quote */}
        <div className="z-10">
          <blockquote className="space-y-2">
            <p className="text-xl font-medium">
              "This template is a game-changer. I shipped my SaaS in two weeks
              instead of two months."
            </p>
            <footer className="text-sm font-medium opacity-80">
              - Jane Doe, CEO of Startup Inc.
            </footer>
          </blockquote>
        </div>


        {/* Background glow */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-white/10 rounded-full blur-[100px] opacity-50" />
      </div>


      {/* Right Column (Auth Form) */}
      <div className="flex flex-1 items-center justify-center p-4 lg:w-1/2 lg:flex-none">
        <div className="mx-auto w-full max-w-sm">
          {/* Header for mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-foreground">SaaS Kit</span>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="mt-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
