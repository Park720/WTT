import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { listProjectTasks } from '@/lib/task-queries';
import PlannerClient from './PlannerClient';

export default async function PlannerPage({ params }) {
  const user = await getCurrentUser();
  const { id: projectId } = await params;

  const { isMember, isOwner } = await getProjectAccess(user.id, projectId);
  if (!isMember) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, color: true },
  });
  if (!project) notFound();

  const { tasks, tree, members } = await listProjectTasks(projectId);

  return (
    <PlannerClient
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      project={project}
      isOwner={isOwner}
      initialTree={tree}
      initialFlat={tasks}
      members={members}
    />
  );
}
