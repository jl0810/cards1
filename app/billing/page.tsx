import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell>
      <div className="grid gap-8">
        {/* Section 1: Billing & Account Management */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Billing & Account</h2>
          <div className="p-6 border rounded-lg bg-card">
            <p className="text-muted-foreground">Profile and billing management coming soon.</p>
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> {session.user?.email}</p>
              <p><strong>Name:</strong> {session.user?.name}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
