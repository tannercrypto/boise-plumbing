"use client";
// src/components/tracking/AttributionInit.tsx
// Runs once on every page load in the browser.
// Captures UTM params, gclid, fbclid, and referrer into sessionStorage.
// The LeadForm reads from sessionStorage when submitting.

import { useEffect } from "react";
import { captureAndStoreAttribution } from "@/lib/tracking/capture";

export function AttributionInit() {
  useEffect(() => {
    captureAndStoreAttribution();
  }, []);

  // Renders nothing — pure side effect
  return null;
}
