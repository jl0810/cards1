import { Zap } from "lucide-react";
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
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-8 text-white lg:flex">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">PointMax</span>
        </Link>

        {/* Testimonial/Quote */}
        <div className="z-10">
          <blockquote className="space-y-2">
            <p className="text-xl font-medium">
              &quot;I&apos;ve earned over $5,000 in travel rewards since I started using PointMax. It completely changed how I manage my cards.&quot;
            </p>
            <footer className="text-sm font-medium opacity-80">
              - Alex Chen, Platinum Member
            </footer>
          </blockquote>
        </div>


        {/* Background glow */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-indigo-500/20 rounded-full blur-[100px] opacity-50" />
      </div>


      {/* Right Column (Auth Form) */}
      <div className="flex flex-1 items-center justify-center p-4 lg:w-1/2 lg:flex-none bg-slate-950">
        <div className="mx-auto w-full max-w-sm">
          {/* Header for mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">PointMax</span>
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
