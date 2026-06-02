"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, Loader2, Check, Film, BookOpen, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Nomination, Vote } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";

interface VotingBoothProps {
  sessionId: string;
  nominations: Nomination[];
  sessionType: "movie" | "book";
  voterToken: string;
  voterName: string;
  existingVote: Vote | null;
  onVoted: () => void;
  onNominationClick?: (nomination: Nomination) => void;
}

const TIERS = [
  { key: "gold", label: "Gold", points: 3, icon: Trophy, color: "yellow", bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-400" },
  { key: "silver", label: "Silver", points: 2, icon: Medal, color: "zinc", bg: "bg-zinc-400/20", border: "border-zinc-400/40", text: "text-zinc-300" },
  { key: "bronze", label: "Bronze", points: 1, icon: Award, color: "amber", bg: "bg-amber-700/20", border: "border-amber-700/40", text: "text-amber-600" },
] as const;

export default function VotingBooth({
  sessionId,
  nominations,
  sessionType,
  voterToken,
  voterName,
  existingVote,
  onVoted,
  onNominationClick,
}: VotingBoothProps) {
  const [picks, setPicks] = useState<Record<string, string | null>>({
    gold: null,
    silver: null,
    bronze: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const maxTiers = Math.min(nominations.length, 3);
  const activeTiers = TIERS.slice(0, maxTiers);

  useEffect(() => {
    if (existingVote) {
      setPicks({
        gold: existingVote.gold_nomination_id,
        silver: existingVote.silver_nomination_id,
        bronze: existingVote.bronze_nomination_id,
      });
      setSubmitted(true);
    }
  }, [existingVote]);

  const isSelected = (nomId: string) =>
    Object.values(picks).includes(nomId);

  const getTierForNom = (nomId: string) =>
    Object.entries(picks).find(([, v]) => v === nomId)?.[0];

  const selectForTier = (tier: string, nomId: string) => {
    const newPicks = { ...picks };

    // If this nomination is already in another tier, swap
    const existingTier = getTierForNom(nomId);
    if (existingTier) {
      newPicks[existingTier] = newPicks[tier];
    }
    newPicks[tier] = nomId;

    setPicks(newPicks);
    setSubmitted(false);
  };

  const [selectingTier, setSelectingTier] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          voter_token: voterToken,
          voter_name: voterName,
          gold_nomination_id: picks.gold,
          silver_nomination_id: picks.silver,
          bronze_nomination_id: picks.bronze,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onVoted();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit votes");
      }
    } catch {
      alert("Failed to submit votes");
    } finally {
      setSubmitting(false);
    }
  };

  const getNomById = (id: string | null) =>
    nominations.find((n) => n.id === id);

  const hasAllPicks = activeTiers.every((t) => picks[t.key]);

  return (
    <div className="space-y-6">
      {/* Tier slots */}
      <div className="space-y-3">
        {activeTiers.map((tier) => {
          const picked = getNomById(picks[tier.key]);
          return (
            <motion.div
              key={tier.key}
              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                selectingTier === tier.key
                  ? `${tier.bg} ${tier.border} border-solid`
                  : picked
                  ? `${tier.bg} ${tier.border} border-solid`
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
              onClick={() =>
                setSelectingTier(selectingTier === tier.key ? null : tier.key)
              }
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${tier.bg} flex items-center justify-center`}
                >
                  <tier.icon className={`w-5 h-5 ${tier.text}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${tier.text}`}>
                    {tier.label} — {tier.points} pts
                  </p>
                  {picked ? (
                    <p className="text-white text-sm">{picked.title}</p>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      Tap to select your {tier.label.toLowerCase()} pick
                    </p>
                  )}
                </div>
                {picked && picked.poster_url && (
                  <Image
                    src={picked.poster_url}
                    alt={picked.title}
                    width={36}
                    height={54}
                    className="w-9 h-14 object-cover rounded-lg"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selection list when a tier is active */}
      <AnimatePresence>
        {selectingTier && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <p className="text-zinc-400 text-sm">
              Pick your{" "}
              <span className={activeTiers.find((t) => t.key === selectingTier)?.text}>
                {selectingTier}
              </span>{" "}
              choice:
            </p>
            {nominations.map((nom) => {
              const currentTier = getTierForNom(nom.id);
              return (
                <motion.button
                  key={nom.id}
                  onClick={() => {
                    selectForTier(selectingTier, nom.id);
                    setSelectingTier(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    currentTier
                      ? "bg-zinc-800/30 border-zinc-600 opacity-60"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:border-violet-500/50"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {nom.poster_url ? (
                    <Image
                      src={nom.poster_url}
                      alt={nom.title}
                      width={36}
                      height={54}
                      className="w-9 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-14 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {sessionType === "movie" ? (
                        <Film className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">
                        {nom.title}
                      </p>
                      {sessionType === "movie" && nom.availability && (
                        <AvailabilityBadge
                          availability={(nom.availability as "free" | "rent" | "unavailable") || "unavailable"}
                        />
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs">
                      {nom.year}
                      {nom.author ? ` · ${nom.author}` : ""}
                    </p>
                  </div>
                  {onNominationClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNominationClick(nom);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-violet-400"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                  {currentTier && (
                    <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-1 rounded-full">
                      {currentTier}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={submitting || !hasAllPicks}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
          submitted
            ? "bg-green-600 hover:bg-green-500 text-white"
            : "bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white"
        }`}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : submitted ? (
          <>
            <Check className="w-5 h-5" />
            Update Votes
          </>
        ) : (
          <>Submit Votes</>
        )}
      </button>

      {submitted && (
        <p className="text-center text-green-400 text-sm">
          ✓ Your votes are in! You can change them anytime while voting is open.
        </p>
      )}
    </div>
  );
}
