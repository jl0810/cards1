/**
 * Admin endpoint to fix orphaned PlaidItems
 * This reconnects all PlaidItems to the current user if they're orphaned
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get all PlaidItems
    const allItems = await prisma.plaidItem.findMany({
      include: {
        accounts: true
      }
    });

    // Get all users
    const allUsers = await prisma.userProfile.findMany();

    // Find orphaned items (items whose userId doesn't match any existing user)
    const orphanedItems = allItems.filter(
      item => !allUsers.find(u => u.id === item.userId)
    );

    // Also find items that belong to other users (in case of duplicate profiles)
    const currentUserItems = allItems.filter(item => item.userId === userProfile.id);
    const otherUserItems = allItems.filter(
      item => item.userId !== userProfile.id && allUsers.find(u => u.id === item.userId)
    );

    const report = {
      totalUsers: allUsers.length,
      totalItems: allItems.length,
      currentUserItems: currentUserItems.length,
      orphanedItems: orphanedItems.length,
      otherUserItems: otherUserItems.length,
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        clerkId: u.clerkId,
        itemCount: allItems.filter(i => i.userId === u.id).length
      })),
      orphaned: orphanedItems.map(i => ({
        id: i.id,
        institution: i.institutionName,
        accounts: i.accounts.length,
        userId: i.userId
      })),
      otherItems: otherUserItems.map(i => ({
        id: i.id,
        institution: i.institutionName,
        userId: i.userId
      }))
    };

    // If there are orphaned items and only one user, fix them
    if (orphanedItems.length > 0 && allUsers.length === 1) {
      console.log(`Fixing ${orphanedItems.length} orphaned items for ${userProfile.name}`);
      
      for (const item of orphanedItems) {
        await prisma.plaidItem.update({
          where: { id: item.id },
          data: { userId: userProfile.id }
        });
      }

      return NextResponse.json({
        ...report,
        fixed: true,
        fixedCount: orphanedItems.length,
        message: `Fixed ${orphanedItems.length} orphaned items`
      });
    }

    // If there are multiple users, don't auto-fix
    if (allUsers.length > 1 && (orphanedItems.length > 0 || otherUserItems.length > 0)) {
      return NextResponse.json({
        ...report,
        fixed: false,
        message: 'Multiple users found - manual intervention required'
      });
    }

    return NextResponse.json({
      ...report,
      fixed: false,
      message: 'No orphaned items found'
    });

  } catch (error) {
    console.error('Error fixing orphaned items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
