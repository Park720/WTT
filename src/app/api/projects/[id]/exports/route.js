import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const logs = await prisma.exportLog.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      format: l.format,
      fileUrl: l.fileUrl,
      createdAt: l.createdAt.toISOString(),
      exportedBy: {
        id: l.user.id,
        name: l.user.name ?? l.user.email.split('@')[0],
        email: l.user.email,
      },
    })),
  );
}
