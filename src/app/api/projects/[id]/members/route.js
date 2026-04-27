import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getProjectAccess } from '@/lib/project-access';
import { notify } from '@/lib/notifications';


export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const { isOwner } = await getProjectAccess(user.id, projectId);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, job } = await req.json();
  const cleanJob = job?.trim() || null;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  

  const target = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!target) {
    return NextResponse.json({ error: 'User not found. They need an account first.' }, { status: 404 });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: target.id, projectId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Already a member of this project.' }, { status: 409 });
  }

  const [member, project] = await Promise.all([
    prisma.projectMember.create({
      data: {
        userId: target.id,
        projectId,
        role: 'MEMBER',
        job: cleanJob,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
  ]);

  await notify(target.id, {
    type: 'ASSIGNED',
    message: `Added to ${project?.name ?? 'a project'}${cleanJob ? ` as ${cleanJob}` : ''}`,
    delivery: 'BADGE',
  });

  return NextResponse.json(
    {
      id: member.user.id,
      name: member.user.name ?? member.user.email.split('@')[0],
      email: member.user.email,
      role: member.role,
      job: member.job,
    },
    { status: 201 },
  );
}
