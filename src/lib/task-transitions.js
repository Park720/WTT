import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';

export async function applyStatusChange(taskId, newStatus) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  if (newStatus !== 'DONE') return task;

  const dependents = await prisma.taskDependency.findMany({
    where: { blockerTaskId: taskId },
    include: {
      dependent: {
        include: {
          blockedBy: { include: { blocker: { select: { status: true } } } },
        },
      },
    },
  });

  for (const edge of dependents) {
    const dependent = edge.dependent;
    if (!dependent.isBlocked) continue;
    const allDone = dependent.blockedBy.every((b) => b.blocker.status === 'DONE');
    if (allDone) {
      await prisma.task.update({
        where: { id: dependent.id },
        data: { isBlocked: false },
      });
      if (dependent.assigneeId) {
        await notify(dependent.assigneeId, {
          type: 'DEPENDENCY_UNLOCKED',
          message: `Unblocked: "${dependent.title}" is ready to start`,
          taskId: dependent.id,
        });
      }
    }
  }

  if (task.parentTaskId) {
    const siblings = await prisma.task.findMany({
      where: { parentTaskId: task.parentTaskId, isDeleted: false },
      select: { status: true },
    });
    if (siblings.length > 0 && siblings.every((s) => s.status === 'DONE')) {
      const parent = await prisma.task.findUnique({
        where: { id: task.parentTaskId },
        select: { status: true },
      });
      if (parent && parent.status !== 'DONE') {
        await applyStatusChange(task.parentTaskId, 'DONE');
      }
    }
  }

  return task;
}

export async function wouldCreateCycle(dependentId, blockerId) {
  if (dependentId === blockerId) return true;
  const visited = new Set([blockerId]);
  const queue = [blockerId];
  while (queue.length) {
    const current = queue.shift();
    const edges = await prisma.taskDependency.findMany({
      where: { dependentTaskId: current },
      select: { blockerTaskId: true },
    });
    for (const edge of edges) {
      if (edge.blockerTaskId === dependentId) return true;
      if (!visited.has(edge.blockerTaskId)) {
        visited.add(edge.blockerTaskId);
        queue.push(edge.blockerTaskId);
      }
    }
  }
  return false;
}

export async function recomputeIsBlocked(taskId) {
  const blockers = await prisma.taskDependency.findMany({
    where: { dependentTaskId: taskId },
    include: { blocker: { select: { status: true } } },
  });
  const isBlocked = blockers.length > 0 && blockers.some((b) => b.blocker.status !== 'DONE');
  await prisma.task.update({
    where: { id: taskId },
    data: { isBlocked },
  });
  return isBlocked;
}
