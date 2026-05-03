// src/app/page.tsx — Homepage

import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ChevronRight, Droplets, Flame, AlertTriangle, Shield, Clock, Star, Award } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd, buildLocalBusinessJsonLd } from "@/lib/seo/jsonLd";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Boise Plumber | Licensed, 24/7 Emergency Service",
  description:
    "Boise's trusted plumber since 2008. 24/7 emergency service, drain cleaning & water heater repair. Licensed, bonded & insured. Same-day appointments available.",
  alternates: { canonical: "/" },
};

const services = [
  {
    icon: AlertTriangle,
    title: "Emergency Plumbing",
    description: "Burst pipe? Flooding? We answer 24/7 and aim to arrive within 60 minutes anywhere in the Boise metro.",
    href: "/emergency-plumber-boise",
    color: "text-red-500",
    bg: "bg-red-50",
    cta: "Get emergency help →",
  },
  {
    icon: Droplets,
    title: "Drain Cleaning",
    description: "Slow or completely clogged drain? We use professional hydro-jetting to clear blockages other methods miss.",
    href: "/drain-cleaning-boise",
    color: "text-blue-500",
    bg: "bg-blue-50",
    cta: "Clear your drain →",
  },
  {
    icon: Flame,
    title: "Water Heater Repair",
    description: "No hot water? Leaking tank? We repair and replace all brands same-day, including tankless units.",
    href: "/water-heater-repair-boise",
    color: "text-orange-500",
    bg: "bg-orange-50",
    cta: "Restore hot water →",
  },
];

const guarantees = [
  { icon: Shield, text: "Licensed & bonded in Idaho" },
  { icon: Clock,  text: "60-minute emergency response" },
  { icon: Star,   text: "5-star rated on Google" },
  { icon: Award,  text: "Serving Boise since 2008" },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd()} />
      <Header />
      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1 text-sm mb-5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-300 font-medium">Available now — 24/7 dispatch</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
                  Boise&apos;s Trusted<br />
                  <span className="text-blue-300">Local Plumber</span>
                </h1>
                <p className="text-blue-100 text-lg leading-relaxed mb-6">
                  When something goes wrong with your plumbing, you need someone who shows up fast and fixes it right. We&apos;ve been doing that for Boise homeowners since 2008.
                </p>

                {/* Guarantees inline */}
                <ul className="space-y-2 mb-8">
                  {guarantees.map((g) => {
                    const Icon = g.icon;
                    return (
                      <li key={g.text} className="flex items-center gap-2.5 text-sm text-blue-100">
                        <Icon className="w-4 h-4 text-blue-300 shrink-0" />
                        {g.text}
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={BUSINESS_PHONE_E164}
                    className="flex items-center justify-center gap-2 bg-white text-blue-900 font-bold px-6 py-4 rounded-xl hover:bg-blue-50 transition-colors text-lg"
                  >
                    <Phone className="w-5 h-5" />
                    {BUSINESS_PHONE}
                  </a>
                  <Link
                    href="/contact"
                    className="flex items-center justify-center gap-2 bg-blue-600/60 border border-blue-400/50 text-white font-semibold px-6 py-4 rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Request a free quote
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Form */}
              <div>
                <LeadForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────── */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-gray-900 mb-3">
                Plumbing Services in Boise, ID
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Whether it&apos;s an emergency at 2 a.m. or a clogged drain on a Saturday, we handle it. Serving all of Ada and Canyon County.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {services.map((svc) => {
                const Icon = svc.icon;
                return (
                  <Link
                    key={svc.href}
                    href={svc.href}
                    className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-blue-100 transition-all"
                  >
                    <div className={`${svc.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${svc.color}`} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{svc.description}</p>
                    <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                      {svc.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Why us ───────────────────────────────────────────── */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Why Boise Homeowners Choose Us
            </h2>
            <p className="text-gray-500 mb-10 max-w-2xl mx-auto">
              We&apos;re a local Boise company — not a franchise. When you call us, you speak to someone who knows Treasure Valley plumbing and is on the road to your home.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              {[
                { title: "No surprise charges", body: "We give you a clear estimate before any work starts. The price we quote is the price you pay." },
                { title: "Fully licensed & insured", body: "All plumbers are licensed in Idaho, background-checked, and covered by liability insurance." },
                { title: "Warranty on all work", body: "Every repair we complete is backed by a workmanship guarantee. If it fails, we fix it." },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Service area ──────────────────────────────────────── */}
        <section className="py-12 bg-white border-y border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-lg font-bold text-gray-700 mb-4">
              Serving Boise and the Treasure Valley
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {["Boise","Meridian","Eagle","Star","Kuna","Nampa","Caldwell","Garden City","Middleton","Parma"].map((city) => (
                <span key={city} className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-600">
                  {city}, ID
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="py-16 bg-blue-900 text-white text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-black mb-3">Plumbing problem right now?</h2>
            <p className="text-blue-200 mb-8 text-lg">
              Call us. We pick up 24 hours a day, 7 days a week.
            </p>
            <a
              href={BUSINESS_PHONE_E164}
              className="inline-flex items-center gap-3 bg-white text-blue-900 font-black text-xl px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Phone className="w-6 h-6" />
              {BUSINESS_PHONE}
            </a>
            <p className="text-blue-400 text-sm mt-4">Average response under 60 minutes in Boise</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
