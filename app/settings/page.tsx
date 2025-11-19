import { AppShell } from "@/app/components/app-shell";
import { UserPreferencesSettings } from "@/components/user-preferences-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserProfile } from "@clerk/nextjs";


export default function SettingsPage() {
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


        {/* Section 2: User Preferences (Your custom component) */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
          <UserPreferencesSettings />
        </div>
      </div>
    </AppShell>
  );
}
