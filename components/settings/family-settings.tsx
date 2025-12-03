"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateFamilyMember,
  addFamilyMember,
  deleteFamilyMember,
} from "@/app/actions/family";

interface FamilyMember {
  id: string;
  name: string;
  isPrimary: boolean;
}

interface FamilySettingsProps {
  initialMembers: FamilyMember[];
}

const UpdateMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const AddMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export function FamilySettings({ initialMembers }: FamilySettingsProps) {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // --- Update Logic ---
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    formState: { isSubmitting: isUpdating },
  } = useForm<z.infer<typeof UpdateMemberSchema>>({
    resolver: zodResolver(UpdateMemberSchema),
    defaultValues: { name: "" },
  });

  const startEditing = (member: FamilyMember) => {
    setEditingId(member.id);
    resetUpdate({ name: member.name });
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetUpdate();
  };

  const onUpdateSubmit = async (data: z.infer<typeof UpdateMemberSchema>) => {
    if (!editingId) return;

    try {
      const result = await updateFamilyMember({
        memberId: editingId,
        name: data.name,
      });

      if (result.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === editingId ? { ...m, name: result.data.name } : m,
          ),
        );
        toast.success("Member updated successfully");
        setEditingId(null);
      } else {
        toast.error(result.error || "Failed to update member");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  // --- Add Logic ---
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { isSubmitting: isAddingMember },
  } = useForm<z.infer<typeof AddMemberSchema>>({
    resolver: zodResolver(AddMemberSchema),
    defaultValues: { name: "" },
  });

  const onAddSubmit = async (data: z.infer<typeof AddMemberSchema>) => {
    try {
      const result = await addFamilyMember({ name: data.name });

      if (result.success) {
        setMembers((prev) => [
          ...prev,
          { id: result.data.id, name: result.data.name, isPrimary: false },
        ]);
        toast.success("Member added successfully");
        setIsAdding(false);
        resetAdd();
      } else {
        toast.error(result.error || "Failed to add member");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  // --- Delete Logic ---
  const onDelete = async (memberId: string) => {
    try {
      const result = await deleteFamilyMember({ memberId });

      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast.success("Member deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete member");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>
            Manage family members and their names. The primary member name can
            be different from your profile name.
          </CardDescription>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Add a new family member to track their accounts.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Name (e.g. Spouse)"
                  {...registerAdd("name")}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAddingMember}>
                  {isAddingMember && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
          >
            {editingId === member.id ? (
              <form
                onSubmit={handleSubmitUpdate(onUpdateSubmit)}
                className="flex items-center gap-2 w-full"
              >
                <Input
                  {...registerUpdate("name")}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {member.name}
                      {member.isPrimary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(member)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {!member.isPrimary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
