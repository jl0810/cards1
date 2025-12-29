"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function Row({
  desc,
  value,
  children,
}: {
  desc: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-10 grid grid-cols-2 items-center relative gap-4">
      <span className="text-xs font-semibold text-slate-400 block shrink-0">{desc}</span>
      <span className="text-xs text-white font-mono block relative">
        <span className="block truncate w-full">{value}</span>
        {children}
      </span>
    </div>
  );
}

function PointerC({ label }: { label: string }) {
  return (
    <div className="absolute w-fit hidden lg:flex items-center gap-5 top-1/2 -translate-y-1/2 left-full z-20">
      <div className="relative">
        <div className="h-px bg-white/20 w-16" />
        <div className="size-1 bg-white/20 rotate-45 absolute right-0 top-1/2 -translate-y-1/2" />
      </div>
      <div className="font-mono text-[10px] bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-1 rounded-md text-white whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

export function UserDetails() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return (
    <div className="p-8 lg:p-16 rounded-3xl border border-white/10 bg-black/40 background relative overflow-hidden backdrop-blur-3xl shadow-2xl">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px]" />

      <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative">
            <Avatar className="size-24 border-2 border-white/10 shadow-xl">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <PointerC label="user.image" />
          </div>

          <div className="text-center relative w-full">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {user.name || "Account User"}
            </h1>
            <PointerC label="user.name" />
          </div>
        </div>

        <div className="px-4 py-2 bg-black/20 rounded-2xl divide-y divide-white/5 border border-white/5">
          <Row desc="Email" value={user.email || ""}>
            <PointerC label="user.email" />
          </Row>
          <Row desc="User ID" value={user.id || ""}>
            <PointerC label="user.id" />
          </Row>
        </div>

        <h2 className="mt-8 mb-4 text-sm font-bold text-slate-400 uppercase tracking-widest px-1">
          NextAuth Metadata
        </h2>
        <div className="px-4 py-2 bg-black/20 rounded-2xl divide-y divide-white/5 border border-white/5">
          <Row desc="Plan" value={((user as any).plan as string) || "Free"}>
            <PointerC label="user.plan" />
          </Row>
          <Row desc="Role" value={((user as any).role as string) || "user"}>
            <PointerC label="user.role" />
          </Row>
        </div>
      </div>
    </div>
  );
}
