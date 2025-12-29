import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and } from "@/db";

export const dynamic = "force-dynamic";

// Check if a family member can be deleted
export async function GET(
    req: Request,
    { params }: { params: Promise<{ memberId: string }> }
) {
    try {
        const { memberId } = await params;
        const session = await auth();
        const user = session?.user;
        if (!user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.supabaseId, user.id),
        });
        if (!userProfile) return new NextResponse("User not found", { status: 404 });

        // Verify ownership and check plaidItems using Drizzle
        const member = await db.query.familyMembers.findFirst({
            where: and(
                eq(schema.familyMembers.id, memberId),
                eq(schema.familyMembers.userId, userProfile.id)
            ),
            with: {
                plaidItems: true
            }
        });

        if (!member) return new NextResponse("Family member not found", { status: 404 });

        // PROTECTION 1: Cannot delete Primary member
        if (member.isPrimary) {
            return new NextResponse("Cannot delete the primary family member.", { status: 400 });
        }

        // PROTECTION 2: Cannot delete member with linked items
        if (member.plaidItems.length > 0) {
            return new NextResponse(
                `Cannot delete ${member.name} because they have ${member.plaidItems.length} active bank connection(s). Please reassign or remove the bank connections first.`,
                { status: 400 }
            );
        }

        // All checks passed
        return new NextResponse("OK", { status: 200 });

    } catch (error) {
        console.error("Error checking delete eligibility:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
