"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  /** 0-5 scale. TMDB's 0-10 scores are halved before they get here. */
  rating: number | null | undefined;
  ratingCount?: number | null;
  size?: "sm" | "md";
  showCount?: boolean;
}

// Below this, an average is noise - a lone 5-star review shouldn't read as
// "the best book in the election".
const MIN_RATINGS = 3;

export default function StarRating({
  rating,
  ratingCount,
  size = "sm",
  showCount = false,
}: StarRatingProps) {
  const value = typeof rating === "string" ? parseFloat(rating) : rating;
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) return null;
  if (ratingCount !== null && ratingCount !== undefined && ratingCount < MIN_RATINGS) return null;

  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const star = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span className={`inline-flex items-center gap-1 ${text} text-amber-400/90 font-medium`}>
      <Star className={`${star} fill-amber-400/90`} />
      {value.toFixed(1)}
      {showCount && ratingCount ? (
        <span className="text-zinc-600 font-normal">
          ({ratingCount.toLocaleString()})
        </span>
      ) : null}
    </span>
  );
}
