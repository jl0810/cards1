"use client";

import { useSession, signOut } from "next-auth/react";

export function useAuth() {
    const { data: session, status } = useSession();

    const user = session?.user ?? null;
    const loading = status === "loading";

    return {
        user,
        loading,
        isAuthenticated: status === "authenticated",
        signOut: () => signOut({ callbackUrl: "/" }),
    };
}
