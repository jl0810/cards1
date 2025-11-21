import { prisma } from './prisma';

interface ProfileLike {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

export async function ensurePrimaryFamilyMember(userProfile: ProfileLike) {
  let member = await prisma.familyMember.findFirst({
    where: {
      userId: userProfile.id,
      isPrimary: true,
    },
  });

  const desiredName = userProfile.name || 'Primary Member';
  const updates: Record<string, string | null> = {};

  if (member) {
    if (member.name !== desiredName) {
      updates.name = desiredName;
    }
    if (userProfile.avatar && member.avatar !== userProfile.avatar) {
      updates.avatar = userProfile.avatar;
    }

    if (Object.keys(updates).length > 0) {
      member = await prisma.familyMember.update({
        where: { id: member.id },
        data: updates,
      });
    }

    return member;
  }

  return prisma.familyMember.create({
    data: {
      userId: userProfile.id,
      name: desiredName,
      avatar: userProfile.avatar,
      role: 'Owner',
      isPrimary: true,
    },
  });
}

export async function assertFamilyMemberOwnership(userProfileId: string, familyMemberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      userId: userProfileId,
    },
  });

  if (!member) {
    throw new Error('Family member not found for this user');
  }

  return member;
}
