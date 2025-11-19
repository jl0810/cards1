"use client";

import { NovuProvider } from '@novu/react';
import { useUser } from '@clerk/nextjs';

export function NovuNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return <>{children}</>;
  }

  return (
    <NovuProvider
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_ID || ''}
      subscriberId={user.id}
    >
      {children}
    </NovuProvider>
  );
}
