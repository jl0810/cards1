"use client";

import { useSession, signOut } from "next-auth/react";

/**
 * useAuth Hook
 * 
 * Provides a reactive interface to the user's authentication state.
 * This hook is used by Header, UserProfile, and other UI components
 * to detect the current user and perform sign-out actions.
 * 
 * @returns {Object} auth - Authentication state and methods
 */
export function useAuth() {
    const { data: session, status } = useSession();

    const user = session?.user ?? null;
    const loading = status === "loading";
    const isAuthenticated = status === "authenticated";

    return {
        user,
        loading,
        isAuthenticated,
        /**
         * Sign out the user and redirect to the home page.
         */
        signOut: async () => {
            await signOut({ callbackUrl: "/" });
        },
    };
}
