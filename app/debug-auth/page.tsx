
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DebugAuthPage() {
    const { userId, sessionId } = await auth();
    const user = await currentUser();

    return (
        <div className="p-8 space-y-4 text-white">
            <h1 className="text-2xl font-bold">Auth Debugger</h1>

            <div className="bg-slate-900 p-4 rounded-xl border border-white/10 space-y-2 font-mono text-sm">
                <div>
                    <span className="text-slate-400">User ID:</span>{' '}
                    <span className="text-green-400">{userId || 'Not Logged In'}</span>
                </div>
                <div>
                    <span className="text-slate-400">Session ID:</span>{' '}
                    <span className="text-blue-400">{sessionId}</span>
                </div>
                <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="text-yellow-400">
                        {user?.emailAddresses[0]?.emailAddress || 'N/A'}
                    </span>
                </div>
                <div>
                    <span className="text-slate-400">Name:</span>{' '}
                    <span>{user?.firstName} {user?.lastName}</span>
                </div>
            </div>

            <div className="text-xs text-slate-500">
                Environment: {process.env.NODE_ENV}
            </div>
        </div>
    );
}
