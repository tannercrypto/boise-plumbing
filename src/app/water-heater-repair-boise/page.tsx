// src/app/water-heater-repair-boise/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Phone, CheckCircle, ChevronRight } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, buildServiceJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonLd";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Water Heater Repair Boise ID | Same-Day",
  description:
    "Water heater repair and replacement in Boise, ID. Same-day service on tank and tankless units — all brands. No hot water.",
  alternates: { canonical: "/water-heater-repair-boise" },
};

const services = [
  "Tank water heater repair",
  "Tankless water heater service",
  "Full unit replacement",
  "Thermostat replacement",
  "Anode rod replacement",
  "Pilot light issues",
  "Sediment flush",
  "All brands serviced",
];

const warningSignsItems = [
  "No hot water, or water not reaching temperature",
  "Rusty or discolored hot water",
  "Popping or rumbling sounds from the tank",
  "Water pooling around the base of the unit",
  "Hot water running out faster than it used to",
  "Unit is more than 10 years old",
];

const faqs = [
  {
    question: "Should I repair or replace my Boise water heater?",
    answer: "Under 8 years old and not leaking — repair is usually the right call. Over 10 years old or actively leaking — replacement typically makes more economic sense. We&apos;ll tell you honestly which one you need after looking at the unit.",
  },
  {
    question: "How long does water heater replacement take in Boise?",
    answer: "A standard tank replacement runs 2–3 hours. Tankless installations take 3–5 hours depending on venting requirements. We carry common units on our trucks for same-day completion.",
  },
  {
    question: "Do you install tankless water heaters in Boise?",
    answer: "Yes. We install and service Rinnai, Navien, Rheem, and Bradford White tankless systems. We&apos;ll walk you through whether tankless makes sense for your home and usage pattern.",
  },
];

export default function WaterHeaterRepairPage() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com";
  return (
    <>
      <JsonLd data={buildServiceJsonLd({ name: "Water Heater Repair Boise", description: "Same-day water heater repair and replacement in Boise, ID. All brands, tank and tankless.", url: `${BASE}/water-heater-repair-boise` })} />
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Water Heater Repair Boise", url: "/water-heater-repair-boise" }])} />
      <JsonLd data={buildFaqJsonLd(faqs)} />
      <Header />
      <main>
        <section className="bg-gradient-to-br from-orange-700 to-orange-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="pt-2">
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                  Water Heater Repair<br />
                  <span className="text-orange-200">Boise, ID</span>
                </h1>
                <p className="text-orange-100 text-lg leading-relaxed mb-5">
                  No hot water is not something you want to deal with overnight. We offer same-day water heater repair and replacement across the Treasure Valley — tank and tankless.
                </p>
                <ul className="space-y-2 mb-7">
                  {["Same-day service available", "All brands repaired or replaced", "Honest repair-vs-replace recommendation", "Workmanship warranty included"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-orange-100">
                      <CheckCircle className="w-4 h-4 text-orange-200 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={BUSINESS_PHONE_E164} className="inline-flex items-center gap-2 bg-white text-orange-900 font-bold px-6 py-4 rounded-xl hover:bg-orange-50 transition-colors text-lg">
                  <Phone className="w-5 h-5" />
                  {BUSINESS_PHONE}
                </a>
              </div>
              <LeadForm defaultService="water-heater" />
            </div>
          </div>
        </section>

        <section className="py-14 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-4">Services we provide</h2>
                <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-sm text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-4">Warning signs to act on now</h2>
                <div className="space-y-2">
                  {warningSignsItems.map((s) => (
                    <div key={s} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 shrink-0" />
                      <span className="text-sm text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Common questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="border border-gray-100 rounded-xl p-5 bg-white">
                  <h3 className="font-bold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-base font-semibold text-gray-600 mb-4 text-center">Other Boise plumbing services</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/emergency-plumber-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Emergency plumbing <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/drain-cleaning-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Drain cleaning <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
