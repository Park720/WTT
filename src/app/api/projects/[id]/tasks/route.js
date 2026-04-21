import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { listProjectTasks } from '@/lib/task-queries';
import { notify } from '@/lib/notifications';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const bin = req.nextUrl.searchParams.get('bin') === 'true';
  const { tasks, tree, members } = await listProjectTasks(projectId, { onlyBinned: bin });
  return NextResponse.json({ tasks, tree, members });
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { isOwner } = await getProjectAccess(user.id, projectId);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  // If a parent is specified, it must belong to this project
  if (body.parentTaskId) {
    const parent = await prisma.task.findUnique({
      where: { id: body.parentTaskId },
      select: { projectId: true },
    });
    if (!parent || parent.projectId !== projectId) {
      return NextResponse.json({ error: 'Invalid parent task' }, { status: 400 });
    }
  }

  // If an assignee is specified, they must be a member of this project
  if (body.assigneeId) {
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: body.assigneeId, projectId } },
    });
    if (!membership) return NextResponse.json({ error: 'Assignee must be a project member' }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description: body.description?.trim() || null,
      priority: body.priority ?? 'MEDIUM',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assigneeId: body.assigneeId ?? null,
      parentTaskId: body.parentTaskId ?? null,
      estimatedMinutes: body.estimatedMinutes ?? null,
    },
  });

  if (task.assigneeId) {
    await notify(task.assigneeId, {
      type: 'ASSIGNED',
      message: `Assigned: ${task.title}`,
      taskId: task.id,
      skipIfSelf: user.id,
    });
  }

  return NextResponse.json(task, { status: 201 });
}
