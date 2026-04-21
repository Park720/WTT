import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [notifs, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: { task: { select: { id: true, title: true, projectId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifs.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      taskId: n.taskId,
      taskTitle: n.task?.title ?? null,
      projectId: n.task?.projectId ?? null,
    })),
  });
}
