"use client";

import React, { useState } from "react";
import { useBankBrand } from "@/hooks/use-bank-brand";

interface BankLogoProps {
  name: string | null;
  bankId?: string | null;
  size?: "sm" | "md" | "lg";
}

export function BankLogo({ name, bankId, size = "md" }: BankLogoProps) {
  const { brand, loading } = useBankBrand(bankId || null);
  const [error, setError] = useState(false);

  // Size classes
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  // Get initials from bank name
  const getInitials = (bankName: string | null) => {
    if (!bankName) return "B";
    const words = bankName.split(" ").filter((w) => w.length > 0);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  // Get a color based on bank name (consistent hash)
  const getColor = (bankName: string | null) => {
    if (!bankName) return "bg-brand-primary";
    const colors = [
      "bg-blue-600",
      "bg-indigo-600",
      "bg-violet-600",
      "bg-purple-600",
      "bg-fuchsia-600",
      "bg-pink-600",
      "bg-rose-600",
      "bg-orange-600",
      "bg-amber-600",
      "bg-emerald-600",
      "bg-teal-600",
      "bg-cyan-600",
      "bg-sky-600",
    ];
    const hash = bankName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading || !brand?.logoUrl || error) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center relative flex-shrink-0`}
        style={{ backgroundColor: brand?.brandColor || undefined }}
      >
        {!brand?.brandColor && (
          <div
            className={`absolute inset-0 rounded-lg ${getColor(name)} opacity-100`}
          />
        )}
        <span
          className={`text-white font-bold relative z-10 ${size === "lg" ? "text-xl" : "text-xs"}`}
        >
          {getInitials(name)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0`}
    >
      <img
        src={brand.logoUrl}
        alt={name || "Bank Logo"}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}
