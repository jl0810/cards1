"use client";

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/use-auth';

export function NotificationCenter() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group hover:bg-white/10 rounded-xl transition-colors">
          <Bell className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-6 bg-black/90 border-white/10 shadow-2xl backdrop-blur-xl rounded-2xl" align="end">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="bg-white/5 p-3 rounded-2xl mb-3">
            <Bell className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">All caught up!</h3>
          <p className="text-xs text-slate-500">You have no new notifications at this time.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
