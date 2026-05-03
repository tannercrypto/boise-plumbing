// src/components/admin/AdminShell.tsx
// Shared chrome for every admin page: sidebar nav + top bar.
// Server component — receives active path as prop.

import Link from "next/link";
import { Users, Globe, FileText, BarChart2, LayoutDashboard, LogOut } from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
  activePath: string;
}

const NAV = [
  { href: "/admin/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/leads",      label: "Leads",      icon: FileText },
  { href: "/admin/clients",    label: "Clients",    icon: Users },
  { href: "/admin/sites",      label: "Sites",      icon: Globe },
  { href: "/admin/analytics",  label: "Analytics",  icon: BarChart2 },
];

export function AdminShell({ children, activePath }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Wordmark */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">BP</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Lead Platform</div>
              <div className="text-gray-500 text-xs">Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = activePath.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-gray-800 w-full transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
