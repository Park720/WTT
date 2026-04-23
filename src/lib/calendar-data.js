import prisma from '@/lib/prisma';

// ── Pure date helpers ─────────────────────────────────────────────

function startOfWeekLocal(d) {
  const x = new Date(d);
  const dow = x.getDay();
  const fromMon = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - fromMon);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getWeekRange(anchor) {
  const start = startOfWeekLocal(anchor);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function getMonthGridRange(anchor) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

  const gridStart = startOfWeekLocal(monthStart);
  const last = new Date(monthEnd);
  last.setDate(monthEnd.getDate() - 1);
  const lastDow = last.getDay();
  const toSun = lastDow === 0 ? 0 : 7 - lastDow;
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + toSun + 1);
  gridEnd.setHours(0, 0, 0, 0);

  return { start: gridStart, end: gridEnd, monthStart, monthEnd };
}

// ── Prisma fetch ──────────────────────────────────────────────────

export async function getCalendarData(userId, { start, end }) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return { tasks: [], projects: [] };
  }

  // Only the current user's assigned tasks — filter excludes unassigned too.
  // `gte` on nullable DateTime already drops nulls at the SQL level.
  // Pad the range by a day on each side so date-only (`T00:00:00.000Z`)
  // tasks near the edge aren't dropped by timezone offset — the client
  // filters down to the exact visible range after normalizing each task.
  const pad = 86_400_000;
  const paddedStart = new Date(start.getTime() - pad);
  const paddedEnd   = new Date(end.getTime()   + pad);

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      assigneeId: userId,
      isDeleted: false,
      status: { not: 'DONE' },
      createdAt: { lt: paddedEnd },
      dueDate: { gte: paddedStart },
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const shaped = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    dueDate: t.dueDate.toISOString(),
    estimatedMinutes: t.estimatedMinutes,
    isBlocked: t.isBlocked,
    projectId: t.projectId,
    project: {
      id: t.project.id,
      name: t.project.name,
      color: t.project.color,
    },
  }));

  const byId = new Map();
  for (const t of shaped) byId.set(t.project.id, t.project);

  return { tasks: shaped, projects: Array.from(byId.values()) };
}
