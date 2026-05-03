"use client";
// src/components/forms/LeadForm.tsx

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Mail, MapPin, Wrench, Clock, FileText, Loader2, CheckCircle } from "lucide-react";
import { leadFormSchema, type LeadFormSchema } from "@/lib/utils/validation";
import { readAttribution } from "@/lib/tracking/capture";
import { trackFormStart, trackLeadSubmit } from "@/lib/tracking/events";
import { BUSINESS_PHONE, BUSINESS_PHONE_E164 } from "@/lib/config/site";
import { SERVICE_OPTIONS, URGENCY_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";

interface LeadFormProps {
  defaultService?: string;
  siteSlug?: string;
  className?: string;
}

export function LeadForm({
  defaultService,
  siteSlug = "boise-plumbing",
  className,
}: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const formStarted = useRef(false);

  function handleFirstInteraction() {
    if (!formStarted.current) {
      formStarted.current = true;
      trackFormStart({ siteSlug, page: typeof window !== "undefined" ? window.location.pathname : "/" });
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormSchema>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      service: defaultService ?? "",
      urgency: "STANDARD",
    },
  });

  async function onSubmit(data: LeadFormSchema) {
    setIsSubmitting(true);
    try {
      const attribution = readAttribution();

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          siteSlug,
          attribution,
          website: "",   // honeypot — always empty from real submissions
        }),
      });

      const result = await response.json();

      if (result.success) {
        trackLeadSubmit({
          siteSlug,
          page:    typeof window !== "undefined" ? window.location.pathname : "/",
          service: data.service,
          urgency: data.urgency,
          leadId:  result.data?.leadId,
        });
        setSubmitResult({
          success: true,
          message: result.data?.message ?? "Request received!",
        });
        reset();
      } else {
        setSubmitResult({
          success: false,
          message:
            result.error ?? "Something went wrong. Please call us directly.",
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: `Network error. Please call us at ${BUSINESS_PHONE}.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitResult?.success) {
    return (
      <div className={cn("bg-white rounded-2xl p-8 shadow-xl text-center", className)}>
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h3>
        <p className="text-gray-600 mb-6">{submitResult.message}</p>
        <p className="text-sm text-gray-500">
          Need immediate help?{" "}
          <a href="tel:+12085550100" className="text-blue-600 font-semibold">
            Call {BUSINESS_PHONE}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocus={handleFirstInteraction}
      className={cn("bg-white rounded-2xl p-6 md:p-8 shadow-xl space-y-5", className)}
    >
      {/* Honeypot field — hidden from real users, bots fill it */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Get a Free Quote</h3>
        <p className="text-sm text-gray-500">
          Boise&apos;s trusted plumbers — response in under 1 hour
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          type="text"
          placeholder="John Smith"
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            errors.name ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register("phone")}
            type="tel"
            placeholder={BUSINESS_PHONE !== "⚠️ PHONE NOT SET" ? BUSINESS_PHONE : "(208) 555-XXXX"}
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              errors.phone ? "border-red-400 bg-red-50" : "border-gray-200"
            )}
          />
        </div>
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register("email")}
            type="email"
            placeholder="john@example.com"
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              errors.email ? "border-red-400 bg-red-50" : "border-gray-200"
            )}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Service Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register("address")}
            type="text"
            placeholder="123 Main St, Boise, ID"
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              errors.address ? "border-red-400 bg-red-50" : "border-gray-200"
            )}
          />
        </div>
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      {/* Service */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Service Needed <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            {...register("service")}
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 appearance-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              errors.service ? "border-red-400 bg-red-50" : "border-gray-200"
            )}
          >
            <option value="">Select a service...</option>
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {errors.service && (
          <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>
        )}
      </div>

      {/* Urgency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="inline w-4 h-4 mr-1 -mt-0.5" />
          How Soon Do You Need Service? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {URGENCY_OPTIONS.map((opt) => (
            <label key={opt.value} className="cursor-pointer">
              <input
                {...register("urgency")}
                type="radio"
                value={opt.value}
                className="sr-only peer"
              />
              <div
                className={cn(
                  "border-2 rounded-lg p-3 text-sm transition-all",
                  "peer-checked:border-blue-500 peer-checked:bg-blue-50",
                  "hover:border-gray-300 border-gray-200"
                )}
              >
                <div className="font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                  {opt.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.urgency && (
          <p className="mt-1 text-sm text-red-600">{errors.urgency.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <FileText className="inline w-4 h-4 mr-1 -mt-0.5" />
          Additional Notes
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Describe the issue in more detail (optional)..."
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Error state */}
      {submitResult && !submitResult.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {submitResult.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all",
          "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-lg shadow-blue-600/30"
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending Request...
          </span>
        ) : (
          "Request Free Quote →"
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        By submitting, you agree to receive a call or text about your plumbing
        request. No spam — ever.
      </p>
    </form>
  );
}
