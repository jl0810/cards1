/**
 * Admin middleware and helpers with caching
 * Use these to protect admin-only routes and features
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export interface AdminUser {
    userId: string;
    role: string;
    isAdmin: boolean;
}

// In-memory cache for admin status (survives for the lifetime of the server process)
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if current user is admin with caching
 * Use this in API routes
 */
export async function requireAdmin(): Promise<AdminUser> {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    // Check cache first
    const cached = adminCache.get(userId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log('[Admin Check] Using cached result for', userId);
        if (!cached.isAdmin) {
            throw new Error('Forbidden: Admin access required');
        }
        return {
            userId,
            role: 'admin',
            isAdmin: true
        };
    }

    // Fetch full user data from Clerk to get publicMetadata
    console.log('[Admin Check] Fetching from Clerk API for', userId);
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const publicMetadata = user.publicMetadata as { role?: string } | undefined;
    const role = publicMetadata?.role;
    const isAdmin = role === 'admin';

    // Update cache
    adminCache.set(userId, { isAdmin, timestamp: now });
    console.log('[Admin Check] Cached result for', userId, '- isAdmin:', isAdmin);

    if (!isAdmin) {
        throw new Error('Forbidden: Admin access required');
    }

    return {
        userId,
        role: role || 'user',
        isAdmin
    };
}

/**
 * Check if current user is admin (non-throwing version)
 * Use this in components
 */
export async function checkIsAdmin(): Promise<boolean> {
    try {
        const { userId } = await auth();
        if (!userId) return false;

        // Check cache first
        const cached = adminCache.get(userId);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            return cached.isAdmin;
        }

        // Fetch from Clerk
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        const publicMetadata = user.publicMetadata as { role?: string } | undefined;
        const isAdmin = publicMetadata?.role === 'admin';

        // Update cache
        adminCache.set(userId, { isAdmin, timestamp: now });

        return isAdmin;
    } catch {
        return false;
    }
}

/**
 * Get admin info (non-throwing version)
 */
export async function getAdminInfo(): Promise<AdminUser | null> {
    try {
        return await requireAdmin();
    } catch {
        return null;
    }
}

/**
 * API route helper - returns 403 response if not admin
 */
export async function withAdmin(handler: (adminUser: AdminUser) => Promise<Response>) {
    try {
        const adminUser = await requireAdmin();
        return await handler(adminUser);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Clear admin cache for a user (call this if you update their role)
 */
export function clearAdminCache(userId: string) {
    adminCache.delete(userId);
}
