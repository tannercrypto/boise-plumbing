"use client";
// src/components/admin/LeadActions.tsx
// Client component — handles status update + Jobber retry via fetch calls.
// Lives on the lead detail page alongside server-rendered content.

import { useState } from "react";
import { RefreshCw, ChevronDown, Check, Loader2 } from "lucide-react";
import type { LeadStatus, JobberSyncStatus } from "@/types";

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW",        label: "New" },
  { value: "CONTACTED",  label: "Contacted" },
  { value: "BOOKED",     label: "Booked" },
  { value: "LOST",       label: "Lost" },
];

interface LeadActionsProps {
  leadId:           string;
  currentStatus:    string;
  jobberSyncStatus: string;
}

export function LeadActions({
  leadId,
  currentStatus,
  jobberSyncStatus,
}: LeadActionsProps) {
  const [status,          setStatus]          = useState(currentStatus);
  const [syncStatus,      setSyncStatus]      = useState(jobberSyncStatus);
  const [statusLoading,   setStatusLoading]   = useState(false);
  const [retryLoading,    setRetryLoading]     = useState(false);
  const [statusMsg,       setStatusMsg]        = useState<string | null>(null);
  const [retryMsg,        setRetryMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  async function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === status) return;
    setStatusLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus(newStatus);
        setStatusMsg("Saved");
        setTimeout(() => setStatusMsg(null), 2000);
      } else {
        setStatusMsg(json.error ?? "Failed");
      }
    } catch {
      setStatusMsg("Network error");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleRetry() {
    setRetryLoading(true);
    setRetryMsg(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/retry-jobber`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSyncStatus("SUCCESS");
        setRetryMsg({ ok: true, text: "Jobber sync succeeded!" });
      } else {
        setSyncStatus("ERROR");
        setRetryMsg({ ok: false, text: json.error ?? "Sync failed." });
      }
    } catch {
      setRetryMsg({ ok: false, text: "Network error." });
    } finally {
      setRetryLoading(false);
    }
  }

  const canRetry =
    syncStatus === "ERROR" || syncStatus === "SKIPPED" || syncStatus === "PENDING";

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Status selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            disabled={statusLoading}
            className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
            {statusLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
        {statusMsg && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> {statusMsg}
          </span>
        )}
      </div>

      {/* Jobber retry */}
      {canRetry && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            disabled={retryLoading}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            {retryLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Retry Jobber Sync
          </button>
        </div>
      )}

      {retryMsg && (
        <p className={`text-xs ${retryMsg.ok ? "text-green-400" : "text-red-400"}`}>
          {retryMsg.text}
        </p>
      )}
    </div>
  );
}
