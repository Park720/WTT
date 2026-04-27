'use client';

import { SessionProvider } from 'next-auth/react';
import ToastProvider from '@/components/Toaster';
import TimerProvider from '@/components/TimerProvider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <TimerProvider>{children}</TimerProvider>
      </ToastProvider>
    </SessionProvider>
  );
}