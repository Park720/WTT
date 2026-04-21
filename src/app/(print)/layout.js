import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';

export const metadata = {
  title: 'WhatTheTxxk — Project export',
};

export default async function PrintLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return children;
}
