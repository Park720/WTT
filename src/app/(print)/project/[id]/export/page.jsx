import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { listProjectTasks } from '@/lib/task-queries';
import PrintView from './PrintView';

export default async function ExportPage({ params }) {
  const user = await getCurrentUser();
  const { id: projectId } = await params;

  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, color: true, createdAt: true, updatedAt: true },
  });
  if (!project) notFound();

  const { tasks, members } = await listProjectTasks(projectId);

  return (
    <PrintView
      project={{
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }}
      tasks={tasks}
      members={members}
      exporter={{
        name: user.name ?? user.email.split('@')[0],
        email: user.email,
      }}
      exportedAt={new Date().toISOString()}
    />
  );
}
