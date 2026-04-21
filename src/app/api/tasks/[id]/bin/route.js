import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';

export async function PUT(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { isOwner } = await getProjectAccess(user.id, task.projectId);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.task.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
