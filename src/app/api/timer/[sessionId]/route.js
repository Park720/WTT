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

  if (body.heartbeat === true) {
    const [updatedSession] = await prisma.$transaction([
      prisma.timerSession.update({
        where: { id: sessionId },
        data: { lastHeartbeatAt: new Date() },
      }),
      prisma.task.update({
        where: { id: session.taskId },
        data: { loggedMinutes: { increment: 1 } },
      }),
    ]);
    return NextResponse.json({
      id: updatedSession.id,
      taskId: updatedSession.taskId,
      duration: updatedSession.duration,
      startedAt: updatedSession.startedAt.toISOString(),
      lastHeartbeatAt: updatedSession.lastHeartbeatAt?.toISOString() ?? null,
    });
  }

  const hasDurationUpdate =
    typeof body.duration === 'number' && Number.isFinite(body.duration);
  const isDurationOnly =
    hasDurationUpdate && !('markDone' in body) && !('completed' in body);

  if (isDurationOnly) {
    const minutes = Math.max(5, Math.min(120, Math.floor(body.duration)));
    const updated = await prisma.timerSession.update({
      where: { id: sessionId },
      data: { duration: minutes },
    });
    return NextResponse.json({
      id: updated.id,
      taskId: updated.taskId,
      duration: updated.duration,
      startedAt: updated.startedAt.toISOString(),
    });
  }

  const markDone = !!body.markDone;
  const completed = !!body.completed;

  // Heartbeats already credited 1 minute each; only log the uncredited residue
  // so end-session doesn't double-count time.
  const sessionStart = session.startedAt.getTime();
  const heartbeatsCredited = session.lastHeartbeatAt
    ? Math.max(0, Math.round((session.lastHeartbeatAt.getTime() - sessionStart) / 60000))
    : 0;
  const elapsedMin = Math.round((Date.now() - sessionStart) / 60000);
  const totalBudget = completed
    ? session.duration
    : Math.max(0, Math.min(session.duration, elapsedMin));
  const minutesToLog = Math.max(0, totalBudget - heartbeatsCredited);

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
