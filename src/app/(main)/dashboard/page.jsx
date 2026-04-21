import { getCurrentUser } from '@/lib/session';
import { listProjectsForUser } from '@/lib/project-queries';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const projects = await listProjectsForUser(user.id);

  return (
    <DashboardClient
      user={{ id: user.id, name: user.name, email: user.email }}
      projects={projects}
    />
  );
}
