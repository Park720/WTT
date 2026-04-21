'use client';

import { SessionProvider } from 'next-auth/react';
import ToastProvider from '@/components/Toaster';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
