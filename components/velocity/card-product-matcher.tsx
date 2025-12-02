"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  CreditCard,
  Check,
  Sparkles,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import { useBankBrand } from "@/hooks/use-bank-brand";

interface CardProduct {
  id: string;
  issuer: string;
  productName: string;
  cardType: string | null;
  annualFee: number | null;
  imageUrl: string | null;
  bankId?: string | null;
  benefits: Array<{
    id: string;
    benefitName: string;
  }>;
}

interface ScoredProduct extends CardProduct {
  matchScore: number;
  matchReasons: string[];
}

interface LinkingStats {
  totalAccounts: number;
  linkedAccounts: number;
  unlinkAccounts: number;
}

/**
 * Smart matching algorithm that scores card products based on:
 * - Institution/Issuer match (50 points)
 * - Product name similarity (30 points)
 * - Account name match (20 points)
 */
function calculateMatchScore(
  product: CardProduct,
  accountName: string,
  institutionName: string | null,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Normalize: lowercase, remove special chars, trim
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[®©™]/g, "") // Remove trademark symbols
      .replace(/[\/\-_]/g, " ") // Replace separators with spaces
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();

  const normalizedAccountName = normalize(accountName);
  const normalizedProductName = normalize(product.productName);
  const normalizedIssuer = normalize(product.issuer);
  const normalizedInstitution = institutionName
    ? normalize(institutionName)
    : "";

  // Helper: Check if two names match with common variations
  const isIssuerMatch = (issuer: string, institution: string) => {
    // Exact match
    if (issuer === institution) return true;

    // Common variations - check if either string contains these
    const bankVariants: Record<string, string[]> = {
      citi: ["citibank", "citi", "citigroup"],
      amex: ["american express", "amex", "americanexpress"],
      bofa: ["bank of america", "bofa", "bankofamerica"],
      chase: ["chase", "jpmorgan chase", "jp morgan"],
      wells: ["wells fargo", "wellsfargo", "wells"],
      "capital one": ["capitalone", "capital one"],
      discover: ["discover", "discover bank"],
      barclays: ["barclays", "barclaycard"],
    };

    // Check if both strings relate to the same bank family
    for (const variants of Object.values(bankVariants)) {
      const issuerMatches = variants.some(
        (v) => issuer.includes(v) || v.includes(issuer),
      );
      const institutionMatches = variants.some(
        (v) => institution.includes(v) || v.includes(institution),
      );

      if (issuerMatches && institutionMatches) {
        return true;
      }
    }

    // Fallback: partial match
    return issuer.includes(institution) || institution.includes(issuer);
  };

  // 1. Institution/Issuer Match (50 points)
  if (
    normalizedInstitution &&
    isIssuerMatch(normalizedIssuer, normalizedInstitution)
  ) {
    score += 50;
    reasons.push(`Matches ${product.issuer}`);
  } else if (
    normalizedInstitution &&
    normalizedInstitution.includes(normalizedIssuer)
  ) {
    score += 45;
    reasons.push(`Issued by ${product.issuer}`);
  } else if (
    normalizedInstitution &&
    normalizedIssuer.includes(normalizedInstitution)
  ) {
    score += 45;
    reasons.push(`Issued by ${product.issuer}`);
  }

  // 2. Product Name in Account Name (30 points max)
  // Split by spaces and filter out very short words
  const productWords = normalizedProductName
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const accountWords = normalizedAccountName
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let wordMatches = 0;
  for (const productWord of productWords) {
    if (
      accountWords.some(
        (aw) =>
          aw === productWord ||
          aw.includes(productWord) ||
          productWord.includes(aw),
      )
    ) {
      wordMatches++;
    }
  }

  if (wordMatches > 0 && productWords.length > 0) {
    const wordScore = Math.min(30, (wordMatches / productWords.length) * 30);
    score += wordScore;
    if (wordScore > 20) {
      reasons.push("Strong name match");
    } else if (wordScore > 10) {
      reasons.push("Partial name match");
    }
  }

  // 3. Exact substring matches (20 points bonus)
  if (normalizedAccountName.includes(normalizedProductName)) {
    score += 20;
    reasons.push("Exact product match");
  } else if (normalizedProductName.includes(normalizedAccountName)) {
    score += 15;
    reasons.push("Product contains account name");
  }

  // 4. Special keyword bonuses
  const specialKeywords = [
    "platinum",
    "preferred",
    "reserve",
    "sapphire",
    "premier",
    "freedom",
    "venture",
    "executive",
    "signature",
    "world elite",
    "elite",
    "aadvantage",
    "skypass",
  ];
  for (const keyword of specialKeywords) {
    if (
      normalizedAccountName.includes(keyword) &&
      normalizedProductName.includes(keyword)
    ) {
      score += 5;
      reasons.push(`Both mention "${keyword}"`);
      break; // Only count once
    }
  }

  return { score: Math.min(100, score), reasons };
}

function ConfidenceBadge({ score }: { score: number }) {
  let label, color, Icon;

  if (score >= 85) {
    label = "Best Match";
    color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    Icon = Sparkles;
  } else if (score >= 70) {
    label = "Good Match";
    color = "bg-blue-500/20 text-blue-400 border-blue-500/30";
    Icon = TrendingUp;
  } else if (score >= 50) {
    label = "Possible";
    color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
    Icon = null;
  } else {
    return null; // Don't show badge for low scores
  }

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </div>
  );
}

function MatchScoreBar({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, score));
  const barColor =
    score >= 85
      ? "bg-gradient-to-r from-emerald-500 to-green-400"
      : score >= 70
        ? "bg-gradient-to-r from-blue-500 to-cyan-400"
        : score >= 50
          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
          : "bg-gradient-to-r from-slate-500 to-slate-400";

  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`h-full ${barColor}`}
      />
    </div>
  );
}

function CardProductLogo({ product }: { product: CardProduct }) {
  const [imageError, setImageError] = useState(false);
  const { brand, loading } = useBankBrand(product.bankId || null);

  if (loading || !brand?.logoUrl) {
    if (product.imageUrl && !imageError) {
      return (
        <img
          src={product.imageUrl}
          alt={product.productName}
          className="w-12 h-12 rounded-lg object-cover"
          onError={() => setImageError(true)}
        />
      );
    }
    return (
      <div
        className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center"
        style={{ backgroundColor: brand?.brandColor || undefined }}
      >
        <CreditCard className="w-6 h-6 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
      <img
        src={brand.logoUrl}
        alt={product.issuer}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface CardProductMatcherProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  institutionName: string | null;
  bankId?: string | null; // Preferred: use FK relationship
  currentProductId?: string | null;
  onSuccess: () => void;
  stats?: LinkingStats; // Optional stats to display in collapsed state
}

export function CardProductMatcher({
  isOpen,
  onClose,
  accountId,
  accountName,
  institutionName,
  bankId,
  currentProductId,
  onSuccess,
  stats,
}: CardProductMatcherProps) {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setIsExpanded(true); // Always expand when opening
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Prefer bankId (exact FK match), fallback to institution name (string search)
      const url = bankId
        ? `/api/card-products?bankId=${encodeURIComponent(bankId)}`
        : institutionName
          ? `/api/card-products?issuer=${encodeURIComponent(institutionName)}`
          : "/api/card-products";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      toast.error("Failed to load card products");
    } finally {
      setLoading(false);
    }
  };

  const scoredProducts = useMemo<ScoredProduct[]>(() => {
    return products
      .map((product) => {
        const { score, reasons } = calculateMatchScore(
          product,
          accountName,
          institutionName,
        );
        return {
          ...product,
          matchScore: score,
          matchReasons: reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [products, accountName, institutionName]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return scoredProducts;

    const query = searchQuery.toLowerCase();
    return scoredProducts.filter(
      (p) =>
        p.issuer.toLowerCase().includes(query) ||
        p.productName.toLowerCase().includes(query),
    );
  }, [searchQuery, scoredProducts]);

  const bestMatches = filteredProducts.filter((p) => p.matchScore >= 85);
  const goodMatches = filteredProducts.filter(
    (p) => p.matchScore >= 70 && p.matchScore < 85,
  );
  const possibleMatches = filteredProducts.filter(
    (p) => p.matchScore >= 50 && p.matchScore < 70,
  );
  const otherMatches = filteredProducts.filter((p) => p.matchScore < 50);

  const linkProduct = async (productId: string | null) => {
    setSaving(true);

    const productName = productId
      ? filteredProducts.find((p) => p.id === productId)?.productName || "card"
      : null;

    const linkPromise = (async () => {
      const res = await fetch(`/api/plaid/accounts/${accountId}/link-product`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardProductId: productId }),
      });

      if (!res.ok) {
        throw new Error("Failed to link card product");
      }

      return res.json();
    })();

    toast.promise(linkPromise, {
      loading: productId ? `Linking ${productName}...` : "Unlinking card...",
      success: () => {
        onSuccess();
        return productId
          ? `Linked ${productName} successfully!`
          : "Card unlinked";
      },
      error: productId
        ? "Failed to link card product"
        : "Failed to unlink card",
    });

    try {
      await linkPromise;
    } catch (error) {
      // Error already handled by toast.promise
    } finally {
      setSaving(false);
    }
  };

  const ProductCard = ({ product }: { product: ScoredProduct }) => {
    const isSelected = currentProductId === product.id;
    const showScore = product.matchScore >= 50 && !searchQuery;

    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => linkProduct(product.id)}
        disabled={saving}
        className={`w-full p-3 rounded-lg transition-all text-left ${
          isSelected
            ? "bg-brand-primary/20 border-brand-primary ring-2 ring-brand-primary/50"
            : "bg-white/5 hover:bg-white/10 border-white/10"
        } border`}
      >
        <div className="flex items-start gap-3">
          <CardProductLogo product={product} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {product.issuer} {product.productName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {product.benefits.length} benefit
                  {product.benefits.length !== 1 ? "s" : ""}
                  {product.annualFee !== null &&
                    ` • $${product.annualFee}/year`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showScore && <ConfidenceBadge score={product.matchScore} />}
                {isSelected && <Check className="w-5 h-5 text-brand-primary" />}
              </div>
            </div>

            {showScore && (
              <div className="space-y-1.5">
                <MatchScoreBar score={product.matchScore} />
                {product.matchReasons.length > 0 && (
                  <p className="text-[10px] text-slate-500">
                    {product.matchReasons.join(" • ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.button>
    );
  };

  // Collapsed Stats View
  const CollapsedView = () => (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "auto", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full bg-dark-800 border-l border-white/10 shadow-2xl"
    >
      <div className="flex flex-col h-full p-4 space-y-4 min-w-[80px]">
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors self-center"
          title="Expand"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center">
            <Link2 className="w-6 h-6 text-brand-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {stats?.totalAccounts || 0}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              Total
            </p>
          </div>

          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {stats?.linkedAccounts || 0}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              Linked
            </p>
          </div>

          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-slate-500/20 flex items-center justify-center mx-auto mb-2">
              <X className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-400">
              {stats?.unlinkAccounts || 0}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              Unlinked
            </p>
          </div>
        </div>
        <div className="h-12" /> {/* Spacer */}
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex items-stretch pointer-events-none">
          <div className="pointer-events-auto">
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="h-full bg-dark-800 border-l border-white/10 shadow-2xl flex flex-col w-[600px] max-w-[90vw]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-white truncate">
                        Link Card Product
                      </h2>
                      <p className="text-sm text-slate-400 mt-1 truncate">
                        {accountName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        title="Minimize"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        title="Close"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="p-4 border-b border-white/5 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search cards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  {/* Products List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentProductId && (
                      <button
                        onClick={() => linkProduct(null)}
                        disabled={saving}
                        className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/10"
                      >
                        <p className="text-sm font-bold text-red-400">
                          Unlink Current Card
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Remove card product association
                        </p>
                      </button>
                    )}

                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">
                          {searchQuery
                            ? "No matching cards found"
                            : "No card products available"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bestMatches.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                Best Matches (85%+)
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {bestMatches.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {goodMatches.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-blue-400" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                Good Matches (70-84%)
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {goodMatches.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {possibleMatches.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Possible Matches (50-69%)
                            </h3>
                            <div className="space-y-2">
                              {possibleMatches.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {(searchQuery ||
                          (bestMatches.length === 0 &&
                            goodMatches.length === 0)) &&
                          otherMatches.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Other {institutionName || ""} Cards
                              </h3>
                              <div className="space-y-2">
                                {otherMatches.map((product) => (
                                  <ProductCard
                                    key={product.id}
                                    product={product}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <CollapsedView key="collapsed" />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
