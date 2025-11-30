"use client";

import { motion } from "framer-motion";
import Marquee from "@/components/ui/marquee";

export function AnimatedSocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    >
      <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
        Integrated with top financial institutions
      </h2>

      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background md:shadow-xl">
        <Marquee pauseOnHover className="[--duration:20s]">
          {[
            "Chase",
            "American Express",
            "Citi",
            "Capital One",
            "Wells Fargo",
            "Bank of America",
            "Discover",
            "US Bank",
            "Barclays",
            "Goldman Sachs"
          ].map((name) => (
            <div
              key={name}
              className="mx-8 flex items-center justify-center"
            >
              <span className="text-xl font-bold text-white/20 hover:text-white/40 transition-colors cursor-default">
                {name}
              </span>
            </div>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background"></div>
      </div>
    </motion.div>
  );
}
