import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { listProjectTasks } from '@/lib/task-queries';
import CalendarClient from './CalendarClient';

export default async function CalendarPage({ params }) {
  const user = await getCurrentUser();
  const { id: projectId } = await params;

  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, color: true },
  });
  if (!project) notFound();

  const { tasks } = await listProjectTasks(projectId);
  const datedTasks = tasks.filter((t) => t.dueDate);

  return <CalendarClient project={project} tasks={datedTasks} />;
}
