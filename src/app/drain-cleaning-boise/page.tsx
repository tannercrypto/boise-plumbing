// src/app/drain-cleaning-boise/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Phone, CheckCircle, ChevronRight } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, buildServiceJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonLd";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Drain Cleaning Boise ID | Same-Day Service",
  description:
    "Professional drain cleaning in Boise, ID. We clear kitchen, bathroom, and main sewer drains using hydro-jetting and camera inspection. Same-day appointments. Call {BUSINESS_PHONE}.",
  alternates: { canonical: "/drain-cleaning-boise" },
};

const services = [
  "Kitchen sink drain cleaning",
  "Bathroom drain clearing",
  "Main sewer line cleaning",
  "Hydro-jetting",
  "Video camera inspection",
  "Tree root removal",
  "Floor drain service",
  "Grease trap cleaning",
];

const faqs = [
  {
    question: "How much does drain cleaning cost in Boise?",
    answer: "Most standard clogs clear for $150–$300. Main sewer line hydro-jetting starts around $350. We give you an exact quote before starting — no surprise charges.",
  },
  {
    question: "Why won&apos;t store-bought drain cleaner fix my clog?",
    answer: "Chemical cleaners dissolve soft clogs near the drain opening but can&apos;t clear grease buildup, tree roots, or blockages deep in your pipes. Hydro-jetting scours the pipe wall and solves the actual problem.",
  },
  {
    question: "Can you clear a main sewer line in Boise same-day?",
    answer: "Yes. Our trucks carry hydro-jetting equipment and we can usually schedule same-day service throughout Boise and the Treasure Valley.",
  },
];

export default function DrainCleaningPage() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com";
  return (
    <>
      <JsonLd data={buildServiceJsonLd({ name: "Drain Cleaning Boise", description: "Professional drain cleaning in Boise, ID using hydro-jetting and camera inspection.", url: `${BASE}/drain-cleaning-boise` })} />
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Drain Cleaning Boise", url: "/drain-cleaning-boise" }])} />
      <JsonLd data={buildFaqJsonLd(faqs)} />
      <Header />
      <main>
        <section className="bg-gradient-to-br from-blue-800 to-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="pt-2">
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                  Drain Cleaning<br />
                  <span className="text-blue-200">Boise, ID</span>
                </h1>
                <p className="text-blue-100 text-lg leading-relaxed mb-4">
                  Slow drain? Complete blockage? We use professional hydro-jetting — not just a drain snake — to clear your pipes and keep them clear longer.
                </p>
                <ul className="space-y-2 mb-7">
                  {["Same-day service available", "Camera inspection on request", "Flat-rate pricing — quoted before we start", "Satisfaction guaranteed"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-blue-100">
                      <CheckCircle className="w-4 h-4 text-blue-300 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={BUSINESS_PHONE_E164} className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-6 py-4 rounded-xl hover:bg-blue-50 transition-colors text-lg">
                  <Phone className="w-5 h-5" />
                  {BUSINESS_PHONE}
                </a>
              </div>
              <LeadForm defaultService="drain-cleaning" />
            </div>
          </div>
        </section>

        <section className="py-14 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Drain Cleaning Services We Provide</h2>
            <p className="text-center text-gray-500 mb-8">From a slow kitchen sink to a backed-up main sewer line — we handle it all.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {services.map((s) => (
                <div key={s} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Why professional drain cleaning beats the hardware store fix</h2>
            <div className="prose prose-gray mt-4 text-gray-600 text-sm leading-relaxed space-y-3">
              <p>Liquid drain cleaners are designed for marketing, not for plumbing. They dissolve soft organic matter near the opening of the drain, but they can&apos;t reach the root cause of most Boise homeowners&apos; clogs — grease accumulation deep in the pipe, mineral buildup, or tree root intrusion in older neighborhoods like the North End or Warm Springs.</p>
              <p>Hydro-jetting uses pressurized water to scour the inside of the pipe all the way through. Combined with a camera inspection, we can see exactly what&apos;s causing the blockage and clear it in one visit.</p>
            </div>
          </div>
        </section>

        <section className="py-14 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="border border-gray-100 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-base font-semibold text-gray-600 mb-4 text-center">Other Boise plumbing services</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/emergency-plumber-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Emergency plumbing <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/water-heater-repair-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Water heater repair <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
