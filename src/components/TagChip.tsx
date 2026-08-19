"use client";

import { TAG_TO_CATEGORY, type TagCategory } from "@/lib/tags";

interface TagChipProps {
  tag: string;
  size?: "sm" | "md";
}

const categoryStyle: Record<TagCategory, { bg: string; border: string; text: string }> = {
  mood: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
  type: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400" },
  genre: { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-400" },
};

export default function TagChip({ tag, size = "sm" }: TagChipProps) {
  const category = TAG_TO_CATEGORY[tag];
  if (!category) return null;

  const c = categoryStyle[category];
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <span className={`${sizeCls} rounded-full font-medium border ${c.bg} ${c.border} ${c.text}`}>
      {tag}
    </span>
  );
}
