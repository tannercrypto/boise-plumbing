// src/app/emergency-plumber-boise/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Phone, CheckCircle, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, buildLocalBusinessJsonLd, buildServiceJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonLd";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Emergency Plumber Boise ID | Under 60-Min Response",
  description:
    "Need an emergency plumber in Boise right now? We respond in under 60 minutes — 24/7, including nights and weekends. Burst pipes, flooding, no water. Call us now. Call {BUSINESS_PHONE}.",
  alternates: { canonical: "/emergency-plumber-boise" },
};

const situations = [
  "Burst or frozen pipes",
  "Active flooding in your home",
  "Sewage backup",
  "Gas line concern",
  "No water to the house",
  "Overflowing toilet or sewer",
  "Water heater leak or failure",
  "Pipe under a slab leaking",
];

const steps = [
  { step: "1", title: "Turn off the water", body: "Find your main shut-off valve — usually near the meter or where the main line enters the house. Turn it fully clockwise to stop the flow." },
  { step: "2", title: "Call us immediately", body: "We dispatch a licensed plumber right away and give you a realistic arrival window before we hang up." },
  { step: "3", title: "We diagnose and fix", body: "Our trucks carry parts for the most common emergencies. Many jobs are resolved in a single visit." },
];

const faqs = [
  {
    question: "How fast can an emergency plumber reach me in Boise?",
    answer: "Our target is under 60 minutes to any address in the Boise metro — including Meridian, Eagle, Garden City, and the North End. During extreme weather or peak demand, we&apos;ll give you an honest ETA when you call.",
  },
  {
    question: "Do you charge extra for nights and weekends?",
    answer: "We have after-hours rates that we disclose before any work starts. You&apos;ll always know the cost upfront — no hidden fees added to the bill afterward.",
  },
  {
    question: "What if I&apos;m not sure whether it&apos;s an emergency?",
    answer: "Call us anyway. We&apos;d rather talk you through a situation that turns out to be minor than have you wait on a problem that gets worse overnight. There&apos;s no charge for the call.",
  },
];

export default function EmergencyPlumberPage() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com";
  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd()} />
      <JsonLd data={buildServiceJsonLd({ name: "Emergency Plumbing Boise", description: "24/7 emergency plumbing with under 60-minute response in Boise, ID.", url: `${BASE}/emergency-plumber-boise`, areaServed: ["Boise, ID", "Meridian, ID", "Eagle, ID", "Garden City, ID"] })} />
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Emergency Plumber Boise", url: "/emergency-plumber-boise" }])} />
      <JsonLd data={buildFaqJsonLd(faqs)} />
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-red-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 bg-red-700/60 border border-red-500/30 rounded-full px-3 py-1 text-sm mb-5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-red-200 font-medium">Dispatching now — 24/7/365</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                  Emergency Plumber<br />
                  <span className="text-red-300">Boise, ID</span>
                </h1>
                <p className="text-red-100 text-lg leading-relaxed mb-5">
                  A plumbing emergency doesn&apos;t wait for business hours. Neither do we. Call now and a licensed Boise plumber will be on the way.
                </p>
                <div className="bg-red-800/60 border border-red-600/30 rounded-xl p-4 mb-7">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-semibold text-sm mb-0.5">Active flooding? Do this first.</div>
                      <p className="text-red-200 text-sm">Turn off your main water shut-off valve, then call us. We&apos;ll talk you through it.</p>
                    </div>
                  </div>
                </div>
                <a
                  href={BUSINESS_PHONE_E164}
                  className="flex items-center justify-center gap-3 bg-white text-red-900 font-black text-xl px-8 py-4 rounded-xl hover:bg-red-50 transition-colors w-full sm:w-auto"
                >
                  <Phone className="w-6 h-6" />
                  {BUSINESS_PHONE}
                </a>
                <p className="text-red-300 text-sm mt-3">Or fill out the form — we&apos;ll call you within 5 minutes</p>
              </div>
              <LeadForm defaultService="emergency" />
            </div>
          </div>
        </section>

        {/* What we handle */}
        <section className="py-14 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">We handle any plumbing emergency in Boise</h2>
            <p className="text-center text-gray-500 mb-8">If water is going somewhere it shouldn&apos;t, call us.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {situations.map((s) => (
                <div key={s} className="flex items-start gap-2 bg-red-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-14 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">What to do right now</h2>
            <div className="space-y-5">
              {steps.map((s) => (
                <div key={s.step} className="flex gap-5 bg-white rounded-xl p-5 shadow-sm">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-lg shrink-0">{s.step}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-14 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Common questions</h2>
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

        {/* Related services */}
        <section className="py-10 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-base font-semibold text-gray-600 mb-4 text-center">Other Boise plumbing services</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/drain-cleaning-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Drain cleaning <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/water-heater-repair-boise" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                Water heater repair <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/contact" className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                All services <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
