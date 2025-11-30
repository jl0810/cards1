"use client";

import { Inbox } from '@novu/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUser } from '@clerk/nextjs';

export function NotificationCenter() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Inbox
          applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID || ''}
          subscriberId={user.id}
        />
      </PopoverContent>
    </Popover>
  );
}
