/**
 * Admin endpoint to consolidate all PlaidItems to the current logged-in user
 * USE WITH CAUTION - this will reassign ALL items to your account
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { confirm } = body;

    // Get current user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get all items
    const allItems = await prisma.plaidItem.findMany({
      include: {
        accounts: true,
        familyMember: true
      }
    });

    const itemsToMove = allItems.filter(item => item.userId !== userProfile.id);

    if (!confirm) {
      // Just return what would happen
      return NextResponse.json({
        action: 'preview',
        currentUser: {
          id: userProfile.id,
          name: userProfile.name,
          clerkId: userProfile.clerkId,
          currentItems: allItems.filter(i => i.userId === userProfile.id).length
        },
        wouldMove: itemsToMove.length,
        items: itemsToMove.map(i => ({
          institution: i.institutionName,
          accounts: i.accounts.length,
          currentOwner: i.familyMember?.name || 'Unknown'
        })),
        message: `This will move ${itemsToMove.length} items to ${userProfile.name}. Send confirm: true to proceed.`
      });
    }

    // CONFIRMED - Do the consolidation
    console.log(`🔧 Consolidating ${itemsToMove.length} items to ${userProfile.name}`);

    const results = [];
    for (const item of itemsToMove) {
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: { userId: userProfile.id }
      });
      results.push({
        institution: item.institutionName,
        moved: true
      });
    }

    // Also consolidate family members
    const allFamilyMembers = await prisma.familyMember.findMany();
    const membersToMove = allFamilyMembers.filter(m => m.userId !== userProfile.id);
    
    for (const member of membersToMove) {
      await prisma.familyMember.update({
        where: { id: member.id },
        data: { userId: userProfile.id }
      });
    }

    return NextResponse.json({
      action: 'completed',
      itemsMoved: results.length,
      familyMembersMoved: membersToMove.length,
      results,
      message: `✅ Successfully moved ${results.length} items and ${membersToMove.length} family members to ${userProfile.name}`
    });

  } catch (error) {
    console.error('Error consolidating items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
