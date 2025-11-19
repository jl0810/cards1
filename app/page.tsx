// We no longer need LandingPage from _template, we'll build it here
// import { LandingPage } from '@/app/_template/components/landing-page';


"use client"; // Required for the gradient effect and header
import { MarketingHeader } from "@/app/_template/components/marketing-header";
import { Button } from "@/components/ui/button";
import { CreditCard, Send, ShieldCheck } from "lucide-react";
import NextLink from "next/link";
import * as React from "react";


// Use Next.js Link and forward the ref
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof NextLink>
>((props, ref) => <NextLink ref={ref} {...props} />);
Link.displayName = "Link";


// Feature data for the new grid
const features = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: "Secure Authentication",
    description:
      "Pre-built Clerk integration with sign-in, sign-up, and user profile management.",
  },
  {
    icon: <CreditCard className="h-10 w-10 text-primary" />,
    title: "Stripe Subscriptions",
    description:
      "Ready-to-go Stripe payments for subscriptions. Webhooks are pre-configured.",
  },
  {
    icon: <Send className="h-10 w-10 text-primary" />,
    title: "Transactional Emails",
    description:
      "Beautiful, responsive email templates using Resend for welcome and billing notifications.",
  },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketingHeader />

      <main className="flex-1">
        {/* === 1. Hero Section === */}
        <section className="relative w-full pt-24 pb-24 md:pt-32 md:pb-32 overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 -z-10 animate-gradient-bg" />
          {/* Radial Glow */}
          <div className="absolute -top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 opacity-30 blur-[150px]" />


          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-6xl lg:text-7xl">
              <span className="text-gradient-pop block">Build, Launch & Scale</span>
              <span className="text-primary block">Your SaaS in Days</span>
            </h1>
            <p className="mt-6 text-lg max-w-2xl mx-auto leading-8 text-gray-200">
              The all-in-one Next.js starter kit with Clerk authentication, Stripe
              paywalls, and beautiful UI components. Ship your app in days, not
              months.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" className="text-base h-12 px-8">
                <a href="/sign-up">Get Started for Free</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base h-12 px-8 border-white text-white hover:bg-white/10 hover:text-white">
                <a href="/pricing">View Pricing</a>
              </Button>
            </div>
          </div>
        </section>


        {/* === 2. Social Proof Section === */}
        <section className="py-16 sm:py-24 bg-background">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-base font-semibold text-muted-foreground">
              Powering the best new startups, powered by the best tools
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
              {[
                "Next.js",
                "Clerk",
                "Stripe",
                "Vercel",
                "Prisma",
                "Resend",
              ].map((name) => (
                <div
                  key={name}
                  className="flex justify-center items-center text-xl font-semibold text-muted-foreground/60"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* === 3. Feature Grid Section === */}
        <section id="features" className="py-24 sm:py-32 bg-background/70">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-primary">
                Everything Included
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                All the tools you need, pre-configured
              </p>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Stop wasting time on boilerplate. We've handled user auth,
                payments, emails, and more so you can focus on your product.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
                {features.map((feature) => (
                  <div key={feature.title} className="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:bg-card">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold leading-7 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-4 flex-auto text-base leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* === 4. Final CTA Section === */}
        <section className="py-24 sm:py-32">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative isolate overflow-hidden bg-card border border-border shadow-lg rounded-2xl px-6 py-20 text-center sm:px-16">
              {/* Glow effect */}
              <div className="absolute -top-24 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/30 opacity-50 blur-[100px]"></div>

              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to build your masterpiece?
              </h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Start building for free. No credit card required.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button asChild size="lg" className="text-base h-12 px-8">
                  <a href="/sign-up">Get Started Now</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>


      {/* === 5. Footer === */}
      <footer className="border-t border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} SaaS Kit. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
