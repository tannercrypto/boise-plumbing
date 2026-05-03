"use client";
// src/components/admin/RevenueEditor.tsx
// Inline revenue editor on the lead detail page.
// Replaces the "Phase 4 stub" read-only revenue section.

import { useState } from "react";
import { DollarSign, Check, Loader2, Pencil, X } from "lucide-react";
import type { RevenueSource } from "@/types";

interface RevenueEditorProps {
  leadId:             string;
  estimatedJobValue:  number | null;
  confirmedJobValue:  number | null;
  revenueSource:      string | null;
  commissionAmount:   number | null;
}

const SOURCE_OPTIONS: Array<{ value: RevenueSource; label: string }> = [
  { value: "MANUAL", label: "Manual" },
  { value: "JOBBER", label: "Jobber" },
];

export function RevenueEditor({
  leadId,
  estimatedJobValue:  initEstimated,
  confirmedJobValue:  initConfirmed,
  revenueSource:      initSource,
  commissionAmount:   initCommission,
}: RevenueEditorProps) {
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Form state
  const [estimated,   setEstimated]   = useState<string>(initEstimated?.toString()  ?? "");
  const [confirmed,   setConfirmed]   = useState<string>(initConfirmed?.toString()  ?? "");
  const [source,      setSource]      = useState<string>(initSource                 ?? "MANUAL");
  const [commission,  setCommission]  = useState<string>(initCommission?.toString() ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      estimatedJobValue: estimated !== "" ? parseFloat(estimated) : null,
      confirmedJobValue: confirmed !== "" ? parseFloat(confirmed) : null,
      revenueSource:     source as RevenueSource,
      commissionAmount:  commission !== "" ? parseFloat(commission) : null,
    };

    try {
      const res = await fetch(`/api/admin/leads/${leadId}/revenue`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setEditing(false);
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

  function handleCancel() {
    setEditing(false);
    setError(null);
    // Reset to initial values
    setEstimated(initEstimated?.toString()  ?? "");
    setConfirmed(initConfirmed?.toString()  ?? "");
    setSource(initSource                    ?? "MANUAL");
    setCommission(initCommission?.toString() ?? "");
  }

  if (!editing) {
    return (
      <div className="divide-y divide-gray-800">
        <ReadRow label="Estimated Value"   value={initEstimated  != null ? `$${initEstimated.toFixed(2)}`  : null} />
        <ReadRow label="Confirmed Value"   value={initConfirmed  != null ? `$${initConfirmed.toFixed(2)}`  : null} highlight />
        <ReadRow label="Revenue Source"    value={initSource} />
        <ReadRow label="Commission"        value={initCommission != null ? `$${initCommission.toFixed(2)}` : null} />
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-600">Revenue data</span>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>
        {saved && (
          <div className="px-5 py-2 text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Estimated Job Value"
          value={estimated}
          onChange={setEstimated}
          placeholder="0.00"
          prefix="$"
        />
        <Field
          label="Confirmed Job Value"
          value={confirmed}
          onChange={setConfirmed}
          placeholder="0.00"
          prefix="$"
        />
        <Field
          label="Commission Amount"
          value={commission}
          onChange={setCommission}
          placeholder="0.00"
          prefix="$"
        />
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Revenue Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {saving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            : <><DollarSign className="w-3.5 h-3.5" /> Save Revenue</>}
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ReadRow({
  label, value, highlight,
}: {
  label: string; value: string | null | undefined; highlight?: boolean;
}) {
  return (
    <div className="px-5 py-3 flex gap-4">
      <dt className="text-xs text-gray-500 w-32 shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm flex-1 ${highlight ? "text-green-400 font-semibold" : "text-gray-300"}`}>
        {value ?? <span className="text-gray-700">—</span>}
      </dd>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; prefix?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-6 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
        />
      </div>
    </div>
  );
}
