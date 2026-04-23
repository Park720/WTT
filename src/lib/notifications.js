import prisma from '@/lib/prisma';

export async function notify(userId, { type, message, taskId = null, delivery = 'BADGE', skipIfSelf = null } = {}) {
  if (!userId) return null;
  if (skipIfSelf && userId === skipIfSelf) return null;
  return prisma.notification.create({
    data: { userId, type, message, taskId, delivery },
  });
}

export async function notifyMany(userIds, { type, message, taskId = null, delivery = 'BADGE', skipIfSelf = null } = {}) {
  const unique = [...new Set(userIds.filter(Boolean).filter((id) => id !== skipIfSelf))];
  if (unique.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, type, message, taskId, delivery })),
  });
}

export async function getProjectOwnerIds(projectId) {
  const owners = await prisma.projectMember.findMany({
    where: { projectId, role: 'OWNER' },
    select: { userId: true },
  });
  return owners.map((o) => o.userId);
}
