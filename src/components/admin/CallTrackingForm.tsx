"use client";
// src/components/admin/CallTrackingForm.tsx

import { useState } from "react";
import { Check, Loader2, Phone } from "lucide-react";

interface CallTrackingFormProps {
  siteSlug: string;
  initialSettings: {
    trackingPhone:        string;
    forwardingPhone:      string;
    callTrackingProvider: string;
    callTrackingEnabled:  boolean;
  };
}

const PROVIDERS = ["", "twilio", "callrail", "calltrackingmetrics", "other"];

export function CallTrackingForm({ siteSlug, initialSettings }: CallTrackingFormProps) {
  const [trackingPhone,        setTrackingPhone]        = useState(initialSettings.trackingPhone);
  const [forwardingPhone,      setForwardingPhone]      = useState(initialSettings.forwardingPhone);
  const [callTrackingProvider, setCallTrackingProvider] = useState(initialSettings.callTrackingProvider);
  const [callTrackingEnabled,  setCallTrackingEnabled]  = useState(initialSettings.callTrackingEnabled);

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/sites/${siteSlug}/call-tracking`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingPhone:        trackingPhone        || null,
          forwardingPhone:      forwardingPhone      || null,
          callTrackingProvider: callTrackingProvider || null,
          callTrackingEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(json.error ?? "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between py-3 border-b border-gray-800">
        <div>
          <div className="text-white text-sm font-medium">Enable Call Tracking</div>
          <div className="text-gray-500 text-xs mt-0.5">
            Activates call event capture when provider is connected
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCallTrackingEnabled(!callTrackingEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            callTrackingEnabled ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              callTrackingEnabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* Tracking phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Tracking Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="tel"
            value={trackingPhone}
            onChange={(e) => setTrackingPhone(e.target.value)}
            placeholder="(208) 555-0199"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          The number displayed on the website (swap number from provider)
        </p>
      </div>

      {/* Forwarding phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Forwarding Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="tel"
            value={forwardingPhone}
            onChange={(e) => setForwardingPhone(e.target.value)}
            placeholder="(208) 555-XXXX"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          The real number calls are forwarded to (business owner&apos;s phone)
        </p>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Call Tracking Provider
        </label>
        <select
          value={callTrackingProvider}
          onChange={(e) => setCallTrackingProvider(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select provider —</option>
          {PROVIDERS.filter(Boolean).map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="w-4 h-4" /> Saved</>
        ) : (
          "Save Settings"
        )}
      </button>
    </div>
  );
}
