"use client";
// src/components/reports/ReportLoginForm.tsx
// Client enters their report token to gain access.
// On success, sets a report_access cookie and redirects.

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

interface ReportLoginFormProps {
  clientSlug: string;
}

export function ReportLoginForm({ clientSlug }: ReportLoginFormProps) {
  const [token,   setToken]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/reports/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientSlug, token }),
    });

    const json = await res.json();
    if (json.success) {
      window.location.reload();
    } else {
      setError(json.error ?? "Invalid token. Please check and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Access Token
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="Paste your access token"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Report →"}
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-4">
        Your token was provided by your account manager.
      </p>
    </div>
  );
}
