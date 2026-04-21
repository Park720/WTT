import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { applyStatusChange } from '@/lib/task-transitions';

export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await params;
  const session = await prisma.timerSession.findUnique({
    where: { id: sessionId },
    include: { task: { select: { id: true, projectId: true, assigneeId: true, status: true } } },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (session.endedAt) {
    return NextResponse.json({ error: 'Session already ended' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const markDone = !!body.markDone;
  const completed = !!body.completed;

  const elapsedMin = Math.round((Date.now() - session.startedAt.getTime()) / 60000);
  // If completed (ran to 0), credit the full duration. Otherwise credit actual elapsed, capped at duration.
  const minutesToLog = Math.max(0, Math.min(session.duration, completed ? session.duration : elapsedMin));

  await prisma.timerSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  if (minutesToLog > 0) {
    await prisma.task.update({
      where: { id: session.taskId },
      data: { loggedMinutes: { increment: minutesToLog } },
    });
  }

  if (markDone) {
    const access = await getProjectAccess(user.id, session.task.projectId);
    const isAssignee = session.task.assigneeId === user.id;
    if (access.isOwner) {
      await applyStatusChange(session.taskId, 'DONE');
    } else if (isAssignee && (session.task.status === 'TODO' || session.task.status === 'IN_PROGRESS')) {
      await applyStatusChange(session.taskId, 'PENDING_REVIEW');
    }
  }

  return NextResponse.json({ ok: true, loggedMinutes: minutesToLog });
}
