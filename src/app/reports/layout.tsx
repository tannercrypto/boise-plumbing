// src/app/reports/layout.tsx
// Clean report layout — intentionally minimal.
// No admin sidebar, no internal tool chrome.
// Clients see only the report content.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Performance Report", template: "%s | Report" },
  robots: { index: false, follow: false },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header — no admin nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">BP</span>
            </div>
            <span className="text-gray-900 font-semibold text-sm">Performance Report</span>
          </div>
          <span className="text-gray-400 text-xs">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-gray-200 px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto text-center text-xs text-gray-400">
          This report is confidential and intended only for the named recipient.
        </div>
      </footer>
    </div>
  );
}
