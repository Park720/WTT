import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { wouldCreateCycle, recomputeIsBlocked } from '@/lib/task-transitions';

async function loadDependentTask(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!task) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  const access = await getProjectAccess(userId, task.projectId);
  if (!access.isMember) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  return { task, access };
}

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await loadDependentTask(id, user.id);
  if (error) return error;

  const deps = await prisma.taskDependency.findMany({
    where: { dependentTaskId: id },
    include: {
      blocker: { select: { id: true, title: true, status: true } },
    },
  });

  return NextResponse.json(
    deps.map((d) => ({
      id: d.id,
      blockerTaskId: d.blockerTaskId,
      blockerTitle: d.blocker.title,
      blockerStatus: d.blocker.status,
    })),
  );
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { task, access, error } = await loadDependentTask(id, user.id);
  if (error) return error;
  if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { blockerTaskId } = await req.json();
  if (!blockerTaskId) return NextResponse.json({ error: 'blockerTaskId is required' }, { status: 400 });

  // Blocker must be in the same project
  const blocker = await prisma.task.findUnique({
    where: { id: blockerTaskId },
    select: { projectId: true, status: true },
  });
  if (!blocker || blocker.projectId !== task.projectId) {
    return NextResponse.json({ error: 'Blocker must be a task in the same project' }, { status: 400 });
  }
  if (blockerTaskId === id) {
    return NextResponse.json({ error: 'A task cannot block itself' }, { status: 400 });
  }

  if (await wouldCreateCycle(id, blockerTaskId)) {
    return NextResponse.json({ error: 'This dependency would create a cycle' }, { status: 409 });
  }

  await prisma.taskDependency.create({
    data: { dependentTaskId: id, blockerTaskId },
  });

  await recomputeIsBlocked(id);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { access, error } = await loadDependentTask(id, user.id);
  if (error) return error;
  if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const blockerTaskId = req.nextUrl.searchParams.get('blockerTaskId');
  if (!blockerTaskId) return NextResponse.json({ error: 'blockerTaskId query param is required' }, { status: 400 });

  await prisma.taskDependency.deleteMany({
    where: { dependentTaskId: id, blockerTaskId },
  });

  await recomputeIsBlocked(id);
  return NextResponse.json({ ok: true });
}
