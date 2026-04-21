import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';

/** End any active session this user has (if any) and log the elapsed time to its task. */
async function endActiveSession(userId) {
  const existing = await prisma.timerSession.findFirst({
    where: { userId, endedAt: null },
  });
  if (!existing) return;
  const elapsedMin = Math.max(
    0,
    Math.min(existing.duration, Math.round((Date.now() - existing.startedAt.getTime()) / 60000)),
  );
  await prisma.timerSession.update({
    where: { id: existing.id },
    data: { endedAt: new Date() },
  });
  if (elapsedMin > 0) {
    await prisma.task.update({
      where: { id: existing.taskId },
      data: { loggedMinutes: { increment: elapsedMin } },
    });
  }
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, projectId: true, assigneeId: true, isDeleted: true, isBlocked: true },
  });
  if (!task || task.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const access = await getProjectAccess(user.id, task.projectId);
  if (!access.isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (task.assigneeId !== user.id && !access.isOwner) {
    return NextResponse.json({ error: 'Only the assignee can start a focus session' }, { status: 403 });
  }
  if (task.isBlocked) {
    return NextResponse.json({ error: 'Task is blocked by a dependency' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const duration = Math.max(1, Math.min(180, Number(body.duration) || 25)); // minutes

  await endActiveSession(user.id);

  const session = await prisma.timerSession.create({
    data: { userId: user.id, taskId, duration },
  });

  return NextResponse.json(
    {
      id: session.id,
      taskId,
      taskTitle: task.title,
      projectId: task.projectId,
      duration: session.duration,
      startedAt: session.startedAt.toISOString(),
    },
    { status: 201 },
  );
}

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { isMember } = await getProjectAccess(user.id, task.projectId);
  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await prisma.timerSession.findFirst({
    where: { userId: user.id, taskId, endedAt: null },
  });
  return NextResponse.json(
    session
      ? {
          id: session.id,
          taskId: session.taskId,
          duration: session.duration,
          startedAt: session.startedAt.toISOString(),
        }
      : null,
  );
}
