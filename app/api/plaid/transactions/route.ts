import { auth } from '@/lib/auth';
import { db, schema, eq, desc, inArray } from '@/db';

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user;

        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.supabaseId, user.id),
        });

        if (!userProfile) {
            return new NextResponse("User profile not found", { status: 404 });
        }

        // Fetch transitions for all items belonging to the user
        const items = await db.select({ id: schema.plaidItems.id })
            .from(schema.plaidItems)
            .where(eq(schema.plaidItems.userId, userProfile.id));

        const itemIds = items.map(i => i.id);

        if (itemIds.length === 0) {
            return NextResponse.json([]);
        }

        const transactions = await db.query.plaidTransactions.findMany({
            where: inArray(schema.plaidTransactions.plaidItemId, itemIds),
            orderBy: [desc(schema.plaidTransactions.date)],
            limit: 50,
            with: {
                plaidItem: {
                    columns: {
                        institutionName: true
                    }
                }
            }
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
