// src/app/admin/login/page.tsx
// Server-rendered login page — no auth state in the component.
// Actual credential check + cookie set happens in POST /api/admin/login.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;
  const from  = params.from  ?? "/admin/leads";
  const error = params.error ?? "";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">BP</span>
            </div>
            <span className="text-white font-black text-xl">Admin</span>
          </div>
          <p className="text-gray-500 text-sm">Lead Generation Platform</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-white font-bold text-lg mb-6">Sign in</h1>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-5 text-red-300 text-sm">
              {error === "invalid" ? "Incorrect password. Try again." : "Session expired. Please sign in again."}
            </div>
          )}

          <form action="/api/admin/login" method="POST" className="space-y-4">
            <input type="hidden" name="from" value={from} />

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600"
                placeholder="Enter admin password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Sign in →
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Set <code className="text-gray-500">ADMIN_SECRET_KEY</code> in .env.local
        </p>
      </div>
    </div>
  );
}
