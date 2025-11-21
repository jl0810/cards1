"use client";

import { MarketingHeader } from "@/app/_template/components/marketing-header";
import { VelocityBackground } from "@/components/velocity-background";
import { Button } from "@/components/ui/button";
import ShimmerButton from "@/components/ui/shimmer-button";
import Marquee from "@/components/ui/marquee";
import { BorderBeam } from "@/components/ui/border-beam";
import { CreditCard, Send, ShieldCheck, Zap, Layout, Globe, ChevronDown } from "lucide-react";
import NextLink from "next/link";
import * as React from "react";
import { motion } from "framer-motion";

// Use Next.js Link and forward the ref
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof NextLink>
>((props, ref) => <NextLink ref={ref} {...props} />);
Link.displayName = "Link";

// Feature data for the new grid
const features = [
  {
    icon: <ShieldCheck className="h-8 w-8 text-indigo-400" />,
    title: "Secure Authentication",
    description:
      "Pre-built Clerk integration with sign-in, sign-up, and user profile management.",
  },
  {
    icon: <CreditCard className="h-8 w-8 text-purple-400" />,
    title: "Stripe Subscriptions",
    description:
      "Ready-to-go Stripe payments for subscriptions. Webhooks are pre-configured.",
  },
  {
    icon: <Send className="h-8 w-8 text-pink-400" />,
    title: "Transactional Emails",
    description:
      "Beautiful, responsive email templates using Resend for welcome and billing notifications.",
  },
  {
    icon: <Zap className="h-8 w-8 text-yellow-400" />,
    title: "High Performance",
    description:
      "Built on Next.js 14 with server components and edge caching for lightning fast loads.",
  },
  {
    icon: <Layout className="h-8 w-8 text-cyan-400" />,
    title: "Responsive Design",
    description:
      "Mobile-first approach ensuring your app looks stunning on all devices.",
  },
  {
    icon: <Globe className="h-8 w-8 text-emerald-400" />,
    title: "Global Scale",
    description:
      "Deploy to the edge with Vercel and reach users instantly anywhere in the world.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <VelocityBackground />
      <MarketingHeader />

      <main className="flex-1 relative z-10">
        {/* === 1. Hero Section === */}
        <section className="relative w-full pt-32 pb-24 md:pt-48 md:pb-32 min-h-screen flex flex-col justify-center">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl mb-8">
                <span className="text-gradient block mb-2">Build, Launch & Scale</span>
                <span className="text-gradient-primary block">Your SaaS in Days</span>
              </h1>
              <p className="mt-6 text-xl max-w-2xl mx-auto leading-relaxed text-gray-300">
                The all-in-one Next.js starter kit with Clerk authentication, Stripe
                paywalls, and beautiful UI components. Ship your app in days, not
                months.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ShimmerButton className="shadow-2xl">
                    <a href="/sign-up" className="text-lg font-semibold">Get Started for Free</a>
                  </ShimmerButton>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button asChild variant="outline" size="lg" className="text-lg h-14 px-10 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm">
                    <a href="/pricing">View Pricing</a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{ delay: 1, duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50"
          >
            <ChevronDown className="h-8 w-8" />
          </motion.div>
        </section>

        {/* === 2. Social Proof Section === */}
        <section className="py-12 border-y border-white/5 bg-black/20 backdrop-blur-sm overflow-hidden">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
                Powering the best new startups
              </h2>

              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background md:shadow-xl">
                <Marquee pauseOnHover className="[--duration:20s]">
                  {[
                    "Next.js",
                    "Clerk",
                    "Stripe",
                    "Vercel",
                    "Prisma",
                    "Resend",
                    "React",
                    "Tailwind",
                    "Framer",
                  ].map((name) => (
                    <div
                      key={name}
                      className="mx-8 flex items-center justify-center text-xl font-bold text-white/50 hover:text-white transition-colors cursor-default"
                    >
                      {name}
                    </div>
                  ))}
                </Marquee>
                <Marquee reverse pauseOnHover className="[--duration:20s] mt-8">
                  {[
                    "TypeScript",
                    "Postgres",
                    "Redis",
                    "AWS",
                    "Google Cloud",
                    "Docker",
                    "Kubernetes",
                    "Graphql",
                    "Node.js",
                  ].map((name) => (
                    <div
                      key={name}
                      className="mx-8 flex items-center justify-center text-xl font-bold text-white/50 hover:text-white transition-colors cursor-default"
                    >
                      {name}
                    </div>
                  ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background"></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* === 3. Feature Grid Section === */}
        <section id="features" className="py-24 sm:py-32">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center mb-16">
              <h2 className="text-base font-semibold leading-7 text-indigo-400">
                Everything Included
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                All the tools you need, pre-configured
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-400">
                Stop wasting time on boilerplate. We've handled user auth,
                payments, emails, and more so you can focus on your product.
              </p>
            </div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={item}
                  className="glass-card p-8 rounded-2xl flex flex-col items-start relative overflow-hidden group"
                >
                  <BorderBeam size={250} duration={12} delay={9} />
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-base leading-7 text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* === 4. Final CTA Section === */}
        <section className="py-24 sm:py-32">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border border-white/10 shadow-2xl rounded-3xl px-6 py-24 text-center sm:px-16"
            >
              {/* Glow effect */}
              <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 opacity-50 blur-[120px]"></div>

              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                Ready to build your masterpiece?
              </h2>
              <p className="mx-auto max-w-xl text-lg leading-8 text-gray-300 mb-10">
                Start building for free. No credit card required. Join thousands of developers shipping faster.
              </p>
              <div className="flex items-center justify-center gap-x-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="lg" className="text-lg h-14 px-10 rounded-full bg-white text-black hover:bg-gray-200">
                    <a href="/sign-up">Get Started Now</a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* === 5. Footer === */}
      <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md relative z-10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} SaaS Kit. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

