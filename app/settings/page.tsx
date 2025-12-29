import { AppShell } from "@/components/layout/app-shell";
import { UserPreferencesSettings } from "@/components/shared/user-preferences-settings";
import { FamilySettings } from "@/components/settings/family-settings";
import { listFamilyMembers } from "@/app/actions/family";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/login");
  }

  const familyMembersResult = await listFamilyMembers();
  const familyMembers = familyMembersResult.success
    ? familyMembersResult.data
    : [];

  return (
    <AppShell>
      <div className="grid gap-8">
        {/* Section 1: User Profile */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email Address</label>
              <p className="mt-1 text-lg">{user.email}</p>
            </div>
            {/* Add more profile fields as needed */}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Profile managed via your login provider.
            </p>
          </div>
        </div>

        {/* Section 2: Family Members */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Family Management</h2>
          <FamilySettings initialMembers={familyMembers} />
        </div>

        {/* Section 3: User Preferences */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
          <UserPreferencesSettings />
        </div>
      </div>
    </AppShell>
  );
}
