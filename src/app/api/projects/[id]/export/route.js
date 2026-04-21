import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';

export async function POST(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { isMember } = await getProjectAccess(user.id, projectId);
  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = `/project/${projectId}/export`;
  const entry = await prisma.exportLog.create({
    data: {
      projectId,
      exportedBy: user.id,
      format: 'PDF',
      fileUrl: url,
    },
  });

  return NextResponse.json(
    { id: entry.id, url, createdAt: entry.createdAt.toISOString() },
    { status: 201 },
  );
}
