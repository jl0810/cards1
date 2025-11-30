import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ClerkLogo } from "@/components/marketing/clerk-logo";
import { NextLogo } from "@/components/marketing/next-logo";
import { AdminAlertPanel } from "@/components/admin/admin-alert-panel";
import Link from "next/link";

export default async function AdminPage() {
  await auth.protect();

  const user = await currentUser();

  // Check admin status from user metadata (Clerk) or database
  // For now, check if user has admin role in metadata
  // Later you can add database checks here
  const isAdmin = user?.publicMetadata?.role === 'admin' ||
                  user?.privateMetadata?.role === 'admin' ||
                  // Add your database check here
                  false; // Replace with actual database check

  if (!isAdmin) {
    return (
      <>
        <main className="max-w-300 w-full mx-auto">
          <div className="grid grid-cols-[1fr_20.5rem] gap-10 pb-10">
            <div>
              <header className="flex items-center justify-between w-full h-16 gap-4">
                <div className="flex gap-4">
                  <div className="bg-[#F4F4F5] px-4 py-3 rounded-full inline-flex gap-4">
                    <ClerkLogo />
                    <div aria-hidden className="w-px h-6 bg-[#C7C7C8]" />
                    <NextLogo />
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 font-medium text-[0.8125rem] rounded-full px-3 py-2 hover:bg-gray-100"
                    >
                      ← Dashboard
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "size-8",
                      },
                    }}
                  />
                </div>
              </header>

              <div className="mt-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-red-800 mb-2">
                    Admin Access Required
                  </h3>
                  <p className="text-red-700 mb-4">
                    You need administrator privileges to access this page.
                  </p>
                  <Link
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-center h-16 w-full">
                <div className="text-xs font-medium text-gray-500 bg-red-100 px-3 py-1 rounded-full">
                  ACCESS DENIED
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="max-w-300 w-full mx-auto">
        <div className="grid grid-cols-[1fr_20.5rem] gap-10 pb-10">
          <div>
            <header className="flex items-center justify-between w-full h-16 gap-4">
              <div className="flex gap-4">
                <div className="bg-[#F4F4F5] px-4 py-3 rounded-full inline-flex gap-4">
                  <ClerkLogo />
                  <div aria-hidden className="w-px h-6 bg-[#C7C7C8]" />
                  <NextLogo />
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 font-medium text-[0.8125rem] rounded-full px-3 py-2 hover:bg-gray-100"
                  >
                    ← Dashboard
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "size-8",
                    },
                  }}
                />
              </div>
            </header>

            <div className="mt-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
              <p className="text-gray-600 mb-8">
                Manage your application settings and user data.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    View and manage all users in your application.
                  </p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                    Manage Users
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Configure application-wide settings.
                  </p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                    Settings
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    View application usage statistics.
                  </p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                    View Analytics
                  </button>
                </div>
              </div>

              {/* Admin Alert Panel */}
              <div className="mt-8">
                <AdminAlertPanel />
              </div>

              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Admin Status</h3>
                <p className="text-blue-700 text-sm">
                  You have full administrator privileges. Current user: <strong>{user?.firstName} {user?.lastName}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-center h-16 w-full">
              <div className="text-xs font-medium text-green-500 bg-green-100 px-3 py-1 rounded-full">
                ADMIN ACCESS
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
