import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { applyStatusChange } from '@/lib/task-transitions';
import { notify, notifyMany, getProjectOwnerIds } from '@/lib/notifications';

async function loadTaskForUser(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
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
  const { task, error } = await loadTaskForUser(id, user.id);
  if (error) return error;

  return NextResponse.json(task);
}

export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { task, access, error } = await loadTaskForUser(id, user.id);
  if (error) return error;

  const body = await req.json();
  const data = {};

  // ── Status change (role-sensitive) ────────────────────────────────────────
  if (body.status && body.status !== task.status) {
    const isAssignee = task.assigneeId === user.id;
    const next = body.status;

    // Allowed transitions:
    //   Any member assigned → PENDING_REVIEW (from TODO or IN_PROGRESS)
    //   Assignee or Owner   → IN_PROGRESS    (from TODO)
    //   Owner only          → DONE (approve PENDING_REVIEW), TODO, IN_PROGRESS (reject)
    let allowed = false;
    if (access.isOwner) allowed = true;
    else if (isAssignee) {
      if (next === 'PENDING_REVIEW' && (task.status === 'TODO' || task.status === 'IN_PROGRESS')) allowed = true;
      else if (next === 'IN_PROGRESS' && task.status === 'TODO') allowed = true;
    }
    if (!allowed) return NextResponse.json({ error: 'Not allowed to set that status' }, { status: 403 });

    if (task.isBlocked && next !== 'TODO') {
      return NextResponse.json({ error: 'Task is blocked by a dependency' }, { status: 409 });
    }

    const prevStatus = task.status;
    const updated = await applyStatusChange(id, next);
    // Fall through: other fields might also change below
    Object.assign(task, updated);

    // ── Status change notifications ─────────────────────────────────────
    const actorName = user.name ?? user.email.split('@')[0];
    if (next === 'PENDING_REVIEW') {
      const ownerIds = await getProjectOwnerIds(task.projectId);
      await notifyMany(ownerIds, {
        type: 'COMPLETION_REQUEST',
        message: `${actorName} requested review on "${task.title}"`,
        taskId: id,
        delivery: 'BOTH',
        skipIfSelf: user.id,
      });
    } else if (next === 'DONE' && prevStatus === 'PENDING_REVIEW' && task.assigneeId) {
      await notify(task.assigneeId, {
        type: 'STATUS_CHANGE',
        message: `Approved: "${task.title}"`,
        taskId: id,
        skipIfSelf: user.id,
      });
    } else if (next === 'IN_PROGRESS' && prevStatus === 'PENDING_REVIEW' && task.assigneeId) {
      await notify(task.assigneeId, {
        type: 'STATUS_CHANGE',
        message: `Changes requested on "${task.title}"`,
        taskId: id,
        skipIfSelf: user.id,
      });
    }
  }

  // ── Owner-only field edits ────────────────────────────────────────────────
  const ownerFields = ['title', 'description', 'priority', 'dueDate', 'assigneeId', 'estimatedMinutes', 'sortOrder'];
  const hasOwnerEdits = ownerFields.some((f) => f in body);
  if (hasOwnerEdits) {
    if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ('title' in body) {
      if (!body.title?.trim()) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      data.title = body.title.trim();
    }
    if ('description' in body) data.description = body.description?.trim() || null;
    if ('priority' in body) data.priority = body.priority;
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('assigneeId' in body) {
      if (body.assigneeId) {
        const membership = await prisma.projectMember.findUnique({
          where: { userId_projectId: { userId: body.assigneeId, projectId: task.projectId } },
        });
        if (!membership) return NextResponse.json({ error: 'Assignee must be a project member' }, { status: 400 });
      }
      data.assigneeId = body.assigneeId || null;
    }
    if ('estimatedMinutes' in body) data.estimatedMinutes = body.estimatedMinutes ?? null;
    if ('sortOrder' in body) data.sortOrder = body.sortOrder ?? 0;
  }

  if (Object.keys(data).length > 0) {
    await prisma.task.update({ where: { id }, data });

    // ── Assignee change notification ──────────────────────────────────────
    if ('assigneeId' in data && data.assigneeId && data.assigneeId !== task.assigneeId) {
      await notify(data.assigneeId, {
        type: 'ASSIGNED',
        message: `Assigned: ${data.title ?? task.title}`,
        taskId: id,
        skipIfSelf: user.id,
      });
    }
  }

  const result = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json(result);
}

export async function DELETE(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { access, error } = await loadTaskForUser(id, user.id);
  if (error) return error;
  if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
