/**
 * Family Member Management API
 * Handles CRUD operations for family members
 * 
 * @module app/api/user/family
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { CreateFamilyMemberSchema, safeValidateSchema } from '@/lib/validations';
import {
    getFamilyMembers,
    createFamilyMember,
    UserNotFoundError,
} from '@/lib/family-operations';

export const dynamic = 'force-dynamic';

/**
 * Get all family members for authenticated user
 */
export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user;

        if (!user?.id) {
            return Errors.unauthorized();
        }

        const familyMembers = await getFamilyMembers(user.id);

        return NextResponse.json(familyMembers);
    } catch (error) {
        if (error instanceof UserNotFoundError) {
            return Errors.notFound('User profile');
        }
        logger.error('Error fetching family members', error);
        return Errors.internal();
    }
}

/**
 * Create a new family member
 */
export async function POST(req: Request) {
    // Rate limit: 20 creates per minute
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        const session = await auth();
        const user = session?.user;

        if (!user?.id) {
            return Errors.unauthorized();
        }

        const body = await req.json();
        const validationResult = safeValidateSchema(CreateFamilyMemberSchema, body);

        if (!validationResult.success) {
            return Errors.badRequest(validationResult.error?.issues?.[0]?.message || 'Validation failed');
        }

        const { name, email, avatar, role } = validationResult.data;

        const familyMember = await createFamilyMember(user.id, {
            name,
            email: email ?? undefined,
            avatar: avatar ?? undefined,
            role,
        });

        logger.info(`Family member created: ${familyMember.id}`, {
            userId: user.id,
            memberName: name,
        });

        return NextResponse.json(familyMember, { status: 201 });
    } catch (error) {
        if (error instanceof UserNotFoundError) {
            return Errors.notFound('User profile');
        }
        logger.error('Error creating family member', error);
        return Errors.internal();
    }
}
