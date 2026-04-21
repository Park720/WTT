import prisma from '@/lib/prisma';

export async function getProjectAccess(userId, projectId) {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return {
    membership,
    isMember: !!membership,
    isOwner: membership?.role === 'OWNER',
  };
}
