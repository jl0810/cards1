import { AppShell } from "@/app/components/app-shell";
import { UserProfile } from "@clerk/nextjs";


export default function BillingPage() {
  return (
    <AppShell>
      <div className="grid gap-8">
        {/* Section 1: Billing & Account Management */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Billing & Account</h2>
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
      </div>
    </AppShell>
  );
}
