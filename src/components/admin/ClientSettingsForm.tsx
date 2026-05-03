"use client";
// src/components/admin/ClientSettingsForm.tsx

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

interface ClientSettingsFormProps {
  clientId: string;
  initialSettings: {
    defaultRoute:             string;
    messagingEnabled:         boolean;
    messageRecipientPhones:   string[];
    defaultMessageTemplateId: string | null;
  };
  templates: Array<{ id: string; name: string }>;
}

const ROUTE_OPTIONS = [
  { value: "jobber_only",    label: "Jobber only",     description: "Sync to Jobber. No SMS." },
  { value: "dashboard_only", label: "Dashboard only",  description: "Store in DB only. No Jobber, no SMS." },
  { value: "sms_only",       label: "SMS only",        description: "Queue SMS notification. No Jobber sync." },
  { value: "jobber_and_sms", label: "Jobber + SMS",    description: "Sync to Jobber AND send SMS notification." },
];

export function ClientSettingsForm({
  clientId,
  initialSettings,
  templates,
}: ClientSettingsFormProps) {
  const [defaultRoute,             setDefaultRoute]             = useState(initialSettings.defaultRoute);
  const [messagingEnabled,         setMessagingEnabled]         = useState(initialSettings.messagingEnabled);
  const [recipientPhones,          setRecipientPhones]          = useState<string[]>(initialSettings.messageRecipientPhones);
  const [defaultMessageTemplateId, setDefaultMessageTemplateId] = useState(initialSettings.defaultMessageTemplateId ?? "");
  const [newPhone,                 setNewPhone]                 = useState("");

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function addPhone() {
    const trimmed = newPhone.trim().replace(/\D/g, "");
    if (trimmed && !recipientPhones.includes(trimmed)) {
      setRecipientPhones([...recipientPhones, trimmed]);
    }
    setNewPhone("");
  }

  function removePhone(phone: string) {
    setRecipientPhones(recipientPhones.filter((p) => p !== phone));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/settings`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultRoute,
          messagingEnabled,
          messageRecipientPhones:   recipientPhones,
          defaultMessageTemplateId: defaultMessageTemplateId || null,
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

  const needsMessaging = defaultRoute === "sms_only" || defaultRoute === "jobber_and_sms";

  return (
    <div className="space-y-6">

      {/* Default Route */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Default Lead Route</h2>
        <div className="space-y-2">
          {ROUTE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                defaultRoute === opt.value
                  ? "bg-blue-950 border-blue-700"
                  : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <input
                type="radio"
                name="defaultRoute"
                value={opt.value}
                checked={defaultRoute === opt.value}
                onChange={() => setDefaultRoute(opt.value)}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <div className="text-white text-sm font-medium">{opt.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Messaging */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-sm">SMS Notifications</h2>
            {needsMessaging && !messagingEnabled && (
              <p className="text-yellow-400 text-xs mt-0.5">
                Your route includes SMS but messaging is disabled
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMessagingEnabled(!messagingEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              messagingEnabled ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                messagingEnabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        {messagingEnabled && (
          <div className="space-y-4">
            {/* Recipient phones */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Recipient Phone Numbers
                <span className="text-gray-600 ml-1">(digits only, US numbers)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhone())}
                  placeholder="12085551234"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={addPhone}
                  className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
              {recipientPhones.length === 0 ? (
                <p className="text-gray-600 text-xs">No recipients added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipientPhones.map((phone) => (
                    <span
                      key={phone}
                      className="inline-flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full"
                    >
                      {phone}
                      <button
                        onClick={() => removePhone(phone)}
                        className="text-gray-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Template */}
            {templates.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Default Message Template
                </label>
                <select
                  value={defaultMessageTemplateId}
                  onChange={(e) => setDefaultMessageTemplateId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Use default operator template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
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
