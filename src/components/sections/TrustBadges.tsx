// src/components/sections/TrustBadges.tsx

import { Shield, Clock, Star, Award } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "Licensed & Insured",
    description: "State certified plumbers",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Clock,
    title: "24/7 Emergency",
    description: "Same-day response",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Star,
    title: "5-Star Rated",
    description: "200+ Google reviews",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Award,
    title: "15+ Years Serving Boise",
    description: "Since 2008",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export function TrustBadges() {
  return (
    <section className="py-10 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm"
              >
                <div className={`${badge.bg} p-2 rounded-lg shrink-0`}>
                  <Icon className={`w-5 h-5 ${badge.color}`} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm leading-tight">
                    {badge.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {badge.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
