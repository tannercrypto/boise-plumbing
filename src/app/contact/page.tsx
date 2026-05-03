// src/app/contact/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ChevronRight } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonLd";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Contact Boise Plumbing | Free Estimates",
  description:
    "Contact Boise Plumbing for a free estimate. We respond within one hour during business hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }])} />
      <Header />
      <main className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900 mb-3">Get in Touch</h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              We respond within one hour during business hours. For plumbing emergencies, call us directly — we answer 24/7.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Contact info */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-5">Contact us directly</h2>
              <div className="space-y-3">
                <a href={BUSINESS_PHONE_E164} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                  <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Call or text — 24/7</div>
                    <div className="font-bold text-gray-900 text-lg">{BUSINESS_PHONE}</div>
                  </div>
                </a>
                <a href="mailto:info@boiseplumbing.com" className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                  <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Email</div>
                    <div className="font-bold text-gray-900">info@boiseplumbing.com</div>
                  </div>
                </a>
                <div className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="bg-blue-50 p-3 rounded-lg shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Service area</div>
                    <div className="font-bold text-gray-900">Boise &amp; Treasure Valley, ID</div>
                    <div className="text-sm text-gray-500 mt-0.5">Ada County · Canyon County</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="bg-blue-50 p-3 rounded-lg shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Hours</div>
                    <div className="font-bold text-gray-900">Emergency: 24/7</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      Standard: Mon–Fri 8am–6pm<br />
                      Saturday: 9am–4pm
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">Looking for a specific service?</p>
                <div className="space-y-2">
                  {[
                    { href: "/emergency-plumber-boise", label: "Emergency plumbing" },
                    { href: "/drain-cleaning-boise", label: "Drain cleaning" },
                    { href: "/water-heater-repair-boise", label: "Water heater repair" },
                  ].map((link) => (
                    <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <LeadForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
