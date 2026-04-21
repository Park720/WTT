import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await prisma.timerSession.findFirst({
    where: { userId: user.id, endedAt: null },
    include: { task: { select: { id: true, title: true, projectId: true } } },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) return NextResponse.json(null);

  return NextResponse.json({
    id: session.id,
    taskId: session.taskId,
    taskTitle: session.task.title,
    projectId: session.task.projectId,
    duration: session.duration,
    startedAt: session.startedAt.toISOString(),
  });
}
