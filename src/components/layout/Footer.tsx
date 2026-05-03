// src/components/layout/Footer.tsx

import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import {
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  BUSINESS_EMAIL,
  BUSINESS_ADDRESS_FULL,
  BUSINESS_LICENSE,
} from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">BP</span>
              </div>
              <div>
                <div className="font-bold text-white">Boise Plumbing</div>
                <div className="text-xs text-gray-400">Licensed &amp; Insured</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Boise&apos;s most trusted local plumbers. Serving the Treasure Valley since 2008.
              Licensed, bonded, and insured.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-white mb-4">Our Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/emergency-plumber-boise" className="hover:text-white transition-colors">
                  Emergency Plumbing
                </Link>
              </li>
              <li>
                <Link href="/drain-cleaning-boise" className="hover:text-white transition-colors">
                  Drain Cleaning
                </Link>
              </li>
              <li>
                <Link href="/water-heater-repair-boise" className="hover:text-white transition-colors">
                  Water Heater Repair
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <a href={BUSINESS_PHONE_E164} className="hover:text-white transition-colors">
                  {BUSINESS_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a href={`mailto:${BUSINESS_EMAIL}`} className="hover:text-white transition-colors">
                  {BUSINESS_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{BUSINESS_ADDRESS_FULL} &amp; Treasure Valley</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>24/7 Emergency Service<br />Mon–Fri 8am–6pm Standard</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Boise Plumbing. All rights reserved.</p>
          <p>License #: {BUSINESS_LICENSE} | Serving Boise, Meridian, Nampa, Caldwell</p>
        </div>
      </div>
    </footer>
  );
}
