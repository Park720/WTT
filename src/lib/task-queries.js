import prisma from '@/lib/prisma';

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true } },
  blockedBy: {
    include: { blocker: { select: { id: true, title: true, status: true } } },
  },
};

export function shapeTask(task, memberByUserId) {
  const membership = task.assigneeId ? memberByUserId.get(task.assigneeId) : null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    assigneeId: task.assigneeId,
    assignee: task.assignee
      ? {
          id: task.assignee.id,
          name: task.assignee.name ?? task.assignee.email.split('@')[0],
          email: task.assignee.email,
        }
      : null,
    job: membership?.job ?? null,
    parentTaskId: task.parentTaskId,
    estimatedMinutes: task.estimatedMinutes,
    loggedMinutes: task.loggedMinutes,
    isBlocked: task.isBlocked,
    isDeleted: task.isDeleted,
    deletedAt: task.deletedAt ? task.deletedAt.toISOString() : null,
    blockedBy: (task.blockedBy ?? []).map((dep) => ({
      blockerTaskId: dep.blockerTaskId,
      blockerTitle: dep.blocker?.title ?? null,
      blockerStatus: dep.blocker?.status ?? null,
    })),
    sortOrder: task.sortOrder,
    createdAt: task.createdAt ? task.createdAt.toISOString() : null,
    subtasks: [],
  };
}

export function buildTaskTree(shapedTasks) {
  const byId = new Map(shapedTasks.map((t) => [t.id, { ...t, subtasks: [] }]));
  const roots = [];
  for (const t of byId.values()) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) {
      byId.get(t.parentTaskId).subtasks.push(t);
    } else {
      roots.push(t);
    }
  }
  const sortFn = (a, b) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  roots.sort(sortFn);
  roots.forEach((r) => r.subtasks.sort(sortFn));
  return roots;
}

export async function listProjectTasks(projectId, { includeBinned = false, onlyBinned = false } = {}) {
  const where = { projectId };
  if (onlyBinned) where.isDeleted = true;
  else if (!includeBinned) where.isDeleted = false;

  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const memberByUserId = new Map(members.map((m) => [m.userId, m]));
  const shapedMembers = members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email.split('@')[0],
    email: m.user.email,
    role: m.role,
    job: m.job,
  }));
  const shaped = tasks.map((t) => shapeTask(t, memberByUserId));

  return { tasks: shaped, tree: buildTaskTree(shaped), members: shapedMembers };
}
