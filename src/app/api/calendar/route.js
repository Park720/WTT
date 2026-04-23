import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getCalendarData } from '@/lib/calendar-data';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const startParam = url.searchParams.get('start');
  const endParam   = url.searchParams.get('end');
  if (!startParam || !endParam) {
    return NextResponse.json({ error: 'Missing start/end' }, { status: 400 });
  }
  const start = new Date(startParam);
  const end   = new Date(endParam);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const data = await getCalendarData(user.id, { start, end });
  return NextResponse.json(data);
}
