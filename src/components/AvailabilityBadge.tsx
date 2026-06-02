"use client";

import { Check, DollarSign, XCircle } from "lucide-react";

interface AvailabilityBadgeProps {
  availability: "free" | "rent" | "unavailable";
  size?: "sm" | "lg";
}

const config = {
  free: {
    label: "Streaming",
    icon: Check,
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-400",
    dot: "bg-green-400",
  },
  rent: {
    label: "Rent Only",
    icon: DollarSign,
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  unavailable: {
    label: "Not Available",
    icon: XCircle,
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
  },
};

export default function AvailabilityBadge({
  availability,
  size = "sm",
}: AvailabilityBadgeProps) {
  const c = config[availability];
  const Icon = c.icon;

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text} border ${c.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}
