"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Gift, DollarSign } from "lucide-react";

interface CardBenefit {
  id: string;
  benefitName: string;
  timing: string;
  maxAmount: number | null;
  keywords: string[];
}

interface CardProduct {
  id: string;
  issuer: string;
  productName: string;
  cardType: string | null;
  annualFee: number | null;
  signupBonus: string | null;
  imageUrl: string | null;
  benefits: CardBenefit[];
}

interface LinkedCardDisplayProps {
  product: CardProduct;
}

export function LinkedCardDisplay({ product }: LinkedCardDisplayProps) {
  const [imageError, setImageError] = React.useState(false);

  const benefitColors = [
    "from-purple-500/20 to-pink-500/20 text-purple-300",
    "from-blue-500/20 to-cyan-500/20 text-blue-300",
    "from-green-500/20 to-emerald-500/20 text-green-300",
    "from-orange-500/20 to-yellow-500/20 text-orange-300",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl overflow-hidden"
    >
      {/* Premium Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-transparent to-purple-500/10 opacity-50"></div>

      {/* Card Visual */}
      <div className="relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* Card Image or Gradient */}
          {product.imageUrl && !imageError ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <img
                src={product.imageUrl}
                alt={product.productName}
                className="w-24 h-16 rounded-lg object-cover shadow-lg"
                onError={() => setImageError(true)}
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative w-24 h-16 rounded-lg bg-gradient-to-br from-brand-primary via-purple-600 to-pink-600 shadow-lg flex items-center justify-center"
            >
              <div className="text-white text-xs font-bold text-center px-2">
                {product.issuer}
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </motion.div>
          )}

          {/* Card Info */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-sm font-bold text-white truncate">
                {product.issuer} {product.productName}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {product.annualFee !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/20 text-xs text-slate-300">
                    <DollarSign className="w-3 h-3" />${product.annualFee}/yr
                  </span>
                )}
                {product.signupBonus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-xs text-yellow-300">
                    <Gift className="w-3 h-3" />
                    Bonus
                  </span>
                )}
                {product.cardType && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-slate-400">
                    {product.cardType}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Benefits Grid */}
        {product.benefits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 grid grid-cols-2 gap-2"
          >
            {product.benefits.slice(0, 4).map((benefit, idx) => (
              <motion.div
                key={benefit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                className={`group relative p-2 rounded-lg bg-gradient-to-r ${benefitColors[idx % benefitColors.length]} border border-white/10 hover:scale-105 transition-transform cursor-pointer`}
              >
                <div className="flex items-start gap-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        benefit.maxAmount
                          ? "bg-current animate-pulse"
                          : "bg-current/50"
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">
                      {benefit.benefitName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-75">
                      {benefit.maxAmount && <span>${benefit.maxAmount}</span>}
                      <span>•</span>
                      <span>{benefit.timing}</span>
                    </div>
                  </div>
                </div>

                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-800 border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  {benefit.benefitName}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-dark-800"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* More Benefits Indicator */}
        {product.benefits.length > 4 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-2 text-xs text-center text-slate-400 flex items-center justify-center gap-1"
          >
            <TrendingUp className="w-3 h-3" />+{product.benefits.length - 4}{" "}
            more benefit{product.benefits.length - 4 !== 1 ? "s" : ""}
          </motion.p>
        )}
      </div>

      {/* Subtle animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          boxShadow: [
            "0 0 20px rgba(124, 58, 237, 0.1)",
            "0 0 30px rgba(124, 58, 237, 0.2)",
            "0 0 20px rgba(124, 58, 237, 0.1)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
