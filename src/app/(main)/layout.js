import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import prisma from '@/lib/prisma';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import TimerProvider from '@/components/TimerProvider';
import TimerWidget from '@/components/TimerWidget';

export default async function MainLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    select: { id: true, name: true, color: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  return (
    <TimerProvider>
      <div className="min-h-screen flex">
        <Sidebar user={{ id: user.id, name: user.name, email: user.email }} projects={projects} />
        <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
          <Topbar />
          <main className="flex-1 min-w-0 page-enter">{children}</main>
        </div>
      </div>
      <TimerWidget />
    </TimerProvider>
  );
}
