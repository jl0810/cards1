"use client";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TYPES = ["session user", "profile"];

export function CodeSwitcher() {
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const getSelectedCode = () => {
    switch (selectedType) {
      case "session user": return JSON.stringify(user, null, 2);
      case "profile": return "// User profile data from database\n{\n  \"plan\": \"free\",\n  \"role\": \"user\"\n}";
      default: return "";
    }
  };

  const selectedCode = getSelectedCode();

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="w-full bg-white/5 rounded-2xl p-1.5 flex gap-1.5 border border-white/5 backdrop-blur-md">
        {TYPES.map((type) => (
          <button
            key={type}
            className={cn(
              "capitalize rounded-xl h-9 text-[0.8125rem] flex-1 transition-all font-bold tracking-tight",
              selectedType === type
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setSelectedType(type)}
          >
            {type.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden min-h-[400px] border border-white/10 rounded-2xl bg-black/40 backdrop-blur-xl">
        <div className="h-full overflow-auto p-4 custom-scrollbar">
          <pre className="text-[12px] font-mono text-indigo-300 whitespace-pre-wrap">
            {selectedCode}
          </pre>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
