// src/lib/seo/jsonLd.tsx
// JSON-LD structured data helpers for local SEO.
// All business details come from src/lib/config/site.ts — one place to update.

import {
  BUSINESS_NAME,
  BUSINESS_PHONE,
  BUSINESS_EMAIL,
  BUSINESS_STREET,
  BUSINESS_CITY,
  BUSINESS_STATE,
  BUSINESS_ZIP,
  BUSINESS_COUNTRY,
  BUSINESS_LAT,
  BUSINESS_LNG,
  SITE_URL,
} from "@/lib/config/site";

export interface LocalBusinessJsonLd {
  "@context": "https://schema.org";
  "@type":    "Plumber";
  name:       string;
  image?:     string;
  url:        string;
  telephone:  string;
  email?:     string;
  address: {
    "@type":         "PostalAddress";
    streetAddress?:  string;
    addressLocality: string;
    addressRegion:   string;
    postalCode?:     string;
    addressCountry:  string;
  };
  geo?: {
    "@type":    "GeoCoordinates";
    latitude:   number;
    longitude:  number;
  };
  openingHoursSpecification: Array<{
    "@type":     "OpeningHoursSpecification";
    dayOfWeek:   string[];
    opens:       string;
    closes:      string;
  }>;
  priceRange?: string;
  areaServed:  string[];
  sameAs?:     string[];
}

export function buildLocalBusinessJsonLd(
  overrides?: Partial<LocalBusinessJsonLd>
): LocalBusinessJsonLd {
  return {
    "@context": "https://schema.org",
    "@type":    "Plumber",
    name:       BUSINESS_NAME,
    url:        SITE_URL,
    telephone:  BUSINESS_PHONE,
    email:      BUSINESS_EMAIL,
    image:      `${SITE_URL}/og-image.jpg`,
    address: {
      "@type":         "PostalAddress",
      streetAddress:   BUSINESS_STREET,
      addressLocality: BUSINESS_CITY,
      addressRegion:   BUSINESS_STATE,
      postalCode:      BUSINESS_ZIP,
      addressCountry:  BUSINESS_COUNTRY,
    },
    geo: {
      "@type":   "GeoCoordinates",
      latitude:  BUSINESS_LAT,
      longitude: BUSINESS_LNG,
    },
    openingHoursSpecification: [
      {
        "@type":   "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens:     "08:00",
        closes:    "18:00",
      },
      {
        "@type":   "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens:     "09:00",
        closes:    "16:00",
      },
    ],
    priceRange: "$$",
    areaServed: [
      "Boise, ID",
      "Meridian, ID",
      "Eagle, ID",
      "Nampa, ID",
      "Caldwell, ID",
      "Garden City, ID",
      "Star, ID",
      "Kuna, ID",
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE JSON-LD
// ─────────────────────────────────────────────────────────────────────────────

export function buildServiceJsonLd(params: {
  name:        string;
  description: string;
  url:         string;
  areaServed?: string[];
}) {
  return {
    "@context":  "https://schema.org",
    "@type":     "Service",
    name:         params.name,
    description:  params.description,
    url:          params.url,
    provider: {
      "@type": "Plumber",
      name:    BUSINESS_NAME,
      url:     SITE_URL,
    },
    areaServed:  params.areaServed ?? ["Boise, ID"],
    serviceType: params.name,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ JSON-LD
// ─────────────────────────────────────────────────────────────────────────────

export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type":        "Question",
      name:            faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text:     faq.answer,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BREADCRUMB JSON-LD
// ─────────────────────────────────────────────────────────────────────────────

export function buildBreadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
) {
  return {
    "@context":      "https://schema.org",
    "@type":         "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type":  "ListItem",
      position: i + 1,
      name:      crumb.name,
      item:      crumb.url.startsWith("http") ? crumb.url : `${SITE_URL}${crumb.url}`,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REACT HELPER — renders a <script> tag for a JSON-LD object
// ─────────────────────────────────────────────────────────────────────────────

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
