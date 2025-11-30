import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { FamilyMember } from '@/types/dashboard';

interface DatabaseFamilyMember {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isPrimary?: boolean;
}

interface UseFamilyMembersReturn {
    members: FamilyMember[];
    loading: boolean;
    error: Error | null;
    addMember: (name: string) => Promise<void>;
    updateMember: (id: string, name: string) => Promise<void>;
    deleteMember: (id: string, name: string) => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for managing family members
 * Provides CRUD operations with loading states and error handling
 */
export function useFamilyMembers(): UseFamilyMembersReturn {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchMembers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/user/family');
            if (!res.ok) {
                throw new Error('Failed to fetch family members');
            }

            const data = await res.json();

            // Transform to UI format
            const colors = ['bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-purple-500'];
            const formattedMembers: FamilyMember[] = data.map((u: DatabaseFamilyMember, index: number) => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar || u.name[0],
                role: u.role || (u.isPrimary ? 'Owner' : 'Member'),
                color: colors[index % colors.length]
            }));

            setMembers(formattedMembers);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            console.error('Error fetching family members:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addMember = async (name: string) => {
        try {
            const res = await fetch('/api/user/family', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to add family member');
            }

            const newMember = await res.json();
            const colors = ['bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-purple-500'];
            const newColor = colors[members.length % colors.length];

            setMembers([...members, {
                id: newMember.id,
                name: newMember.name,
                avatar: newMember.name[0],
                role: 'Member',
                color: newColor
            }]);

            toast.success(`${name} has been added to your family`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add family member';
            toast.error(message);
            throw error;
        }
    };

    const updateMember = async (id: string, name: string) => {
        try {
            const res = await fetch(`/api/user/family/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to update family member');
            }

            const updatedMember = await res.json();
            setMembers(members.map(u => u.id === id ? { ...u, name: updatedMember.name } : u));
            toast.success(`Renamed to ${updatedMember.name}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update family member';
            toast.error(message);
            throw error;
        }
    };

    const deleteMember = async (id: string, name: string) => {
        // Pre-check: Can this member be deleted?
        try {
            const checkRes = await fetch(`/api/user/family/${id}/check-delete`);
            if (!checkRes.ok) {
                const errorText = await checkRes.text();
                toast.error(errorText, { duration: 5000 });
                return;
            }
        } catch (error) {
            console.error('Error checking delete eligibility:', error);
            toast.error('Failed to verify deletion eligibility');
            return;
        }

        // Show confirmation toast with action buttons
        return new Promise<void>((resolve) => {
            toast.custom((t) => (
                <div className= "bg-dark-800 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl" >
                <div className="flex items-start gap-3" >
            <div className="flex-1" >
            <p className="text-sm font-bold text-white mb-1" > Remove { name } ? </p>
                < p className = "text-xs text-slate-400" > This action cannot be undone.</p>
                </div>
                </div>
            < div className = "flex gap-2 mt-3" >
            <button
              onClick={ async() => {
        toast.dismiss(t);
        try {
            const res = await fetch(`/api/user/family/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setMembers(members.filter(u => u.id !== id));
                toast.success(`${name} has been removed`);
            } else {
                const text = await res.text();
                toast.error(text);
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            toast.error('Failed to remove family member');
        }
        resolve();
    }
}
className = "flex-1 px-3 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
    >
    Remove
    </button>
    < button
onClick = {() => {
    toast.dismiss(t);
    resolve();
}}
className = "flex-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
    >
    Cancel
    </button>
    </div>
    </div>
      ), { duration: Infinity });
    });
  };

useEffect(() => {
    fetchMembers();
}, [fetchMembers]);

return {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    refresh: fetchMembers,
};
}
