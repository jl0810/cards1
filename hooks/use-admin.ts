"use client";

import { useUser } from "@clerk/nextjs";

/**
 * Client-side hook to check if user is admin
 */
export function useIsAdmin() {
    const { user } = useUser();

    if (!user) return false;

    const role = user.publicMetadata?.role as string | undefined;
    return role === 'admin';
}

/**
 * Client-side hook to get admin info
 */
export function useAdminInfo() {
    const { user } = useUser();

    if (!user) {
        return { isAdmin: false, role: null, userId: null };
    }

    const role = user.publicMetadata?.role as string | undefined;
    const isAdmin = role === 'admin';

    return {
        isAdmin,
        role: role || 'user',
        userId: user.id
    };
}
