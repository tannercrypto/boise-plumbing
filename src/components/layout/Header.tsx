// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { trackClickToCall } from "@/lib/tracking/events";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">BP</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-gray-900 leading-tight">Boise Plumbing</div>
              <div className="text-xs text-gray-500">Licensed &amp; Insured</div>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/emergency-plumber-boise" className="text-gray-600 hover:text-blue-600 transition-colors">
              Emergency
            </Link>
            <Link href="/drain-cleaning-boise" className="text-gray-600 hover:text-blue-600 transition-colors">
              Drain Cleaning
            </Link>
            <Link href="/water-heater-repair-boise" className="text-gray-600 hover:text-blue-600 transition-colors">
              Water Heaters
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA — tracks click-to-call */}
          <a
            href={BUSINESS_PHONE_E164}
            onClick={() =>
              trackClickToCall({
                phone:  BUSINESS_PHONE,
                page:   typeof window !== "undefined" ? window.location.pathname : "/",
                source: "header",
              })
            }
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">{BUSINESS_PHONE}</span>
            <span className="sm:hidden">Call Now</span>
          </a>
        </div>
      </div>
    </header>
  );
}
