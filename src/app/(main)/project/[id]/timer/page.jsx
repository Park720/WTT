import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { listProjectTasks } from '@/lib/task-queries';
import TimerClient from './TimerClient';

export default async function TimerPage({ params, searchParams }) {
  const user = await getCurrentUser();
  const { id: projectId } = await params;
  const sp = (await searchParams) ?? {};
  const preselectTaskId = typeof sp.task === 'string' ? sp.task : null;

  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, color: true },
  });
  if (!project) notFound();

  const { tasks } = await listProjectTasks(projectId);

  return (
    <TimerClient
      project={project}
      tasks={tasks}
      preselectTaskId={preselectTaskId}
      currentUserId={user.id}
    />
  );
}
