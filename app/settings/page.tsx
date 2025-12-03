import { AppShell } from "@/components/layout/app-shell";
import { UserPreferencesSettings } from "@/components/shared/user-preferences-settings";
import { UserProfile } from "@clerk/nextjs";
import { FamilySettings } from "@/components/settings/family-settings";
import { listFamilyMembers } from "@/app/actions/family";

export default async function SettingsPage() {
  const familyMembersResult = await listFamilyMembers();
  const familyMembers = familyMembersResult.success
    ? familyMembersResult.data
    : [];

  return (
    <AppShell>
      <div className="grid gap-8">
        {/* Section 1: User Profile (from Clerk) */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                card: "shadow-none border",
                rootBox: "w-full",
              },
            }}
          />
        </div>

        {/* Section 2: Family Members */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Family Management</h2>
          <FamilySettings initialMembers={familyMembers} />
        </div>

        {/* Section 3: User Preferences (Your custom component) */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
          <UserPreferencesSettings />
        </div>
      </div>
    </AppShell>
  );
}
