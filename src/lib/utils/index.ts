// src/lib/utils/index.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month:    "short",
    day:      "numeric",
    year:     "numeric",
    hour:     "numeric",
    minute:   "2-digit",
    timeZone: "America/Boise",
  }).format(new Date(date));
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case "EMERGENCY": return "text-red-700 bg-red-100";
    case "URGENT":    return "text-orange-700 bg-orange-100";
    case "STANDARD":  return "text-blue-700 bg-blue-100";
    case "FLEXIBLE":  return "text-green-700 bg-green-100";
    default:          return "text-gray-700 bg-gray-100";
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case "NEW":                 return "text-blue-700 bg-blue-100";
    case "SUBMITTED_TO_JOBBER": return "text-purple-700 bg-purple-100";
    case "JOBBER_ERROR":        return "text-red-700 bg-red-100";
    case "CONTACTED":           return "text-yellow-700 bg-yellow-100";
    case "BOOKED":              return "text-green-700 bg-green-100";
    case "LOST":                return "text-gray-700 bg-gray-100";
    default:                    return "text-gray-700 bg-gray-100";
  }
}
