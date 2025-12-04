/**
 * Family Member Management API
 * Handles CRUD operations for family members
 * 
 * @module app/api/user/family
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { API_MESSAGES } from '@/lib/constants';
import { CreateFamilyMemberSchema, safeValidateSchema } from '@/lib/validations';
import {
  getFamilyMembers,
  createFamilyMember,
  UserNotFoundError,
} from '@/lib/family-operations';

export const dynamic = 'force-dynamic';

/**
 * Get all family members for authenticated user
 * 
 * @route GET /api/user/family
 * @implements BR-003 - Family Member Ownership
 * @satisfies US-003 - Add Family Members (view capability)
 * @tested __tests__/api/user/family.test.ts
 * 
 * @returns {Promise<NextResponse>} Array of family members
 */
export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return Errors.unauthorized();
        }

        // Pure business logic call - easily testable separately
        const familyMembers = await getFamilyMembers(userId);

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
 * 
 * @route POST /api/user/family
 * @implements BR-003 - Family Member Ownership
 * @implements BR-004 - Family Member Name Requirements
 * @satisfies US-003 - Add Family Members
 * @tested __tests__/api/user/family.test.ts
 * 
 * @param {Request} req - Contains family member data (name, email, avatar, role)
 * @returns {Promise<NextResponse>} Created family member object
 */
export async function POST(req: Request) {
    // Rate limit: 20 creates per minute
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        const { userId } = await auth();

        if (!userId) {
            return Errors.unauthorized();
        }

        const body = await req.json();
        const validationResult = safeValidateSchema(CreateFamilyMemberSchema, body);

        if (!validationResult.success) {
            return Errors.badRequest(validationResult.error?.issues?.[0]?.message || 'Validation failed');
        }

        const { name, email, avatar, role } = validationResult.data;

        // Pure business logic call - easily testable separately
        const familyMember = await createFamilyMember(userId, {
            name,
            email: email ?? undefined,
            avatar: avatar ?? undefined,
            role,
        });

        logger.info(`Family member created: ${familyMember.id}`, {
            userId,
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
