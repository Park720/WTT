import prisma from '@/lib/prisma';

const LIST_INCLUDE = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  tasks: {
    where: { isDeleted: false },
    select: { status: true, dueDate: true, parentTaskId: true },
  },
};

export function shapeProject(p) {
  const tasks = p.tasks ?? [];
  const topLevel = tasks.filter((t) => !t.parentTaskId);
  const total = topLevel.length;
  const done = topLevel.filter((t) => t.status === 'DONE').length;

  const weekAhead = Date.now() + 7 * 86400000;
  const tasksDueThisWeek = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).getTime() <= weekAhead,
  ).length;

  const nextDue = tasks
    .filter((t) => t.dueDate && t.status !== 'DONE')
    .map((t) => new Date(t.dueDate).getTime())
    .sort((a, b) => a - b)[0] ?? null;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    members: (p.members ?? []).map((m) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.email.split('@')[0],
      role: m.role,
      job: m.job,
    })),
    tasksTotal: total,
    tasksDone: done,
    progress: total > 0 ? Math.round((done / total) * 100) : 0,
    nextDueDate: nextDue ? new Date(nextDue).toISOString() : null,
    tasksDueThisWeek,
  };
}

export async function listProjectsForUser(userId) {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    include: LIST_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
  return projects.map(shapeProject);
}
