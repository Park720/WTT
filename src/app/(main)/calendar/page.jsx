import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getCalendarData, getWeekRange } from '@/lib/calendar-data';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Default view is Week; SSR fetches the current week's range.
  const { start, end } = getWeekRange(new Date());
  const { tasks, projects } = await getCalendarData(user.id, { start, end });
  return (
    <CalendarClient
      initialTasks={tasks}
      initialProjects={projects}
      user={{ id: user.id, name: user.name ?? null, email: user.email }}
    />
  );
}
