import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { CountryCode, Products } from 'plaid';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Ensure user profile exists
        let userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            try {
                userProfile = await prisma.userProfile.create({
                    data: {
                        clerkId: userId,
                        name: user.firstName || '',
                        avatar: user.imageUrl,
                    }
                });
            } catch (e) {
                console.error('Error creating profile in link token route:', e);
            }
        }

        const request = {
            user: {
                client_user_id: userId,
            },
            client_name: 'Cards App',
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: 'en',
            webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`,
        };

        const createTokenResponse = await plaidClient.linkTokenCreate(request);

        return NextResponse.json(createTokenResponse.data);
    } catch (error) {
        console.error('Error creating link token:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
