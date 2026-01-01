/**
 * Admin middleware and helpers with caching
 * Use these to protect admin-only routes and features
 * 
 * @module lib/admin
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface AdminUser {
    userId: string;
    role: string;
    isAdmin: boolean;
}

// In-memory cache for admin status
const adminCache = new Map<string, { isAdmin: boolean; role: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if current user is admin with caching
 * Use this in Server Actions or Route Handlers
 */
export async function requireAdmin(): Promise<AdminUser> {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const now = Date.now();

    // Check cache first
    const cached = adminCache.get(userId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        if (!cached.isAdmin) {
            throw new Error('Forbidden: Admin access required');
        }
        return {
            userId,
            role: cached.role,
            isAdmin: true
        };
    }

    // For now, we'll assume the role is stored in the database or hardcoded for testing.
    // In a real app, you might add 'role' to the session or query the db here.
    const role = session.user.role || 'user';
    const isAdmin = role === 'admin' || session.user.email === 'jefflawson@gmail.com';

    // Update cache
    adminCache.set(userId, { isAdmin, role, timestamp: now });

    if (!isAdmin) {
        throw new Error('Forbidden: Admin access required');
    }

    return {
        userId,
        role,
        isAdmin
    };
}

/**
 * Check if current user is admin (non-throwing version)
 */
export async function checkIsAdmin(): Promise<boolean> {
    try {
        const userInfo = await requireAdmin();
        return userInfo.isAdmin;
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'Unauthorized') {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        if (errorMessage.includes('Forbidden')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Clear admin cache for a user
 */
export function clearAdminCache(userId: string) {
    adminCache.delete(userId);
}
