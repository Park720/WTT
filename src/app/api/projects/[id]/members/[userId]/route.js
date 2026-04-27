import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';



export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId, userId } = await params;
  const { isOwner } = await getProjectAccess(user.id, projectId);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { job } = await req.json();


  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!existing) return NextResponse.json({ error: 'Not a member' }, { status: 404 });

  const updated = await prisma.projectMember.update({
    where: { userId_projectId: { userId, projectId } },
    data: { job: job || null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    id: updated.user.id,
    name: updated.user.name ?? updated.user.email.split('@')[0],
    email: updated.user.email,
    role: updated.role,
    job: updated.job,
  });
}

export async function DELETE(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId, userId } = await params;
  const isSelf = userId === user.id;
  const { isOwner, isMember } = await getProjectAccess(user.id, projectId);

  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isSelf && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const target = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!target) return NextResponse.json({ error: 'Not a member' }, { status: 404 });

  if (target.role === 'OWNER') {
    const ownerCount = await prisma.projectMember.count({
      where: { projectId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Can't remove the last owner. Promote someone else first or delete the project." },
        { status: 400 },
      );
    }
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId, projectId } },
  });

  return NextResponse.json({ ok: true });
}
