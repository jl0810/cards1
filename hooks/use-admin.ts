"use client";

import { useAuth } from "./use-auth";

/**
 * Client-side hook to check if user is admin
 */
export function useIsAdmin() {
    const { user } = useAuth();

    if (!user) return false;

    // For now, use email-based check to match server-side requireAdmin
    const role = (user as any).role || "user";
    return role === "admin" || user.email === "jefflawson@gmail.com";
}

/**
 * Client-side hook to get admin info
 */
export function useAdminInfo() {
    const { user } = useAuth();

    if (!user) {
        return { isAdmin: false, role: null, userId: null };
    }

    const role = (user as any).role || "user";
    const isAdmin = role === "admin" || user.email === "jefflawson@gmail.com";

    return {
        isAdmin,
        role,
        userId: user.id
    };
}
