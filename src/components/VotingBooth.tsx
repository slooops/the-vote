"use client";

import { useState } from "react";
import { Trophy, Medal, Award, Loader2, Check, Film, BookOpen, Info, GripVertical, X, Plus, Lock } from "lucide-react";
import { Reorder, motion } from "framer-motion";
import type { Nomination, Vote } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";
import StarRating from "./StarRating";

interface VotingBoothProps {
  sessionId: string;
  nominations: Nomination[];
  sessionType: "movie" | "book";
  voterToken: string;
  voterName: string;
  existingVote: Vote | null;
  lockBallots: boolean;
  onVoted: () => void;
  onNominationClick?: (nomination: Nomination) => void;
}

const MEDALS = [
  { icon: Trophy, bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-400", label: "Gold" },
  { icon: Medal, bg: "bg-zinc-400/20", border: "border-zinc-400/40", text: "text-zinc-300", label: "Silver" },
  { icon: Award, bg: "bg-amber-700/20", border: "border-amber-700/40", text: "text-amber-600", label: "Bronze" },
] as const;

export default function VotingBooth({
  nominations,
  sessionType,
  voterToken,
  voterName,
  sessionId,
  existingVote,
  lockBallots,
  onVoted,
  onNominationClick,
}: VotingBoothProps) {
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadedVoteId, setLoadedVoteId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // A locked ballot is read-only until an admin reopens voting.
  const isLocked = !!existingVote?.locked;

  // Adjust ranked state when a not-yet-seen existing vote arrives (e.g. after
  // the async fetchMyVote resolves) - done during render, not in an effect,
  // per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (existingVote && existingVote.id !== loadedVoteId) {
    setLoadedVoteId(existingVote.id);
    const valid = new Set(nominations.map((n) => n.id));
    setRankedIds(existingVote.rankings.filter((id) => valid.has(id)));
    setSubmitted(true);
  }

  const getNom = (id: string) => nominations.find((n) => n.id === id);
  const unranked = nominations.filter((n) => !rankedIds.includes(n.id));

  const addToRanked = (id: string) => {
    setRankedIds((prev) => [...prev, id]);
    setSubmitted(false);
  };

  const removeFromRanked = (id: string) => {
    setRankedIds((prev) => prev.filter((r) => r !== id));
    setSubmitted(false);
  };

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
          rankings: rankedIds,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setConfirming(false);
        onVoted();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit vote");
        // A 409 means someone else's tab already locked this ballot - refetch
        // so the UI stops offering an edit that can't succeed.
        if (res.status === 409) onVoted();
      }
    } catch {
      alert("Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  // Submitted-and-locked: read-only receipt of what they ranked.
  if (isLocked) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-medium text-sm">Your ranking is locked in</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Everyone votes once, so nobody can see how it&apos;s going and change their pick.
              Only the organizer can reopen voting.
            </p>
          </div>
        </div>

        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          You ranked ({rankedIds.length})
        </h3>
        <div className="space-y-2">
          {rankedIds.map((id, i) => {
            const nom = getNom(id);
            if (!nom) return null;
            const medal = MEDALS[i];
            return (
              <div
                key={id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  medal ? `${medal.bg} ${medal.border}` : "bg-zinc-800/40 border-zinc-700/50"
                }`}
              >
                <div className="w-7 text-center flex-shrink-0">
                  {medal ? (
                    <medal.icon className={`w-5 h-5 mx-auto ${medal.text}`} />
                  ) : (
                    <span className="text-zinc-500 font-bold text-sm">{i + 1}</span>
                  )}
                </div>
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
                  <p className={`text-sm font-medium truncate ${medal ? medal.text : "text-white"}`}>
                    {nom.title}
                  </p>
                  <p className="text-zinc-500 text-xs truncate">
                    {nom.year}
                    {nom.author ? ` · ${nom.author}` : ""}
                  </p>
                </div>
                {onNominationClick && (
                  <button
                    onClick={() => onNominationClick(nom)}
                    className="p-1.5 text-zinc-500 hover:text-violet-400 flex-shrink-0"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {unranked.length > 0 && (
          <p className="text-zinc-600 text-xs">
            You left {unranked.length} {unranked.length === 1 ? "option" : "options"} unranked.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Your ranking {rankedIds.length > 0 && `(${rankedIds.length})`}
          </h3>
          {rankedIds.length > 0 && (
            <span className="text-zinc-600 text-xs">Drag to reorder</span>
          )}
        </div>

        {rankedIds.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 text-sm">
            Tap items below to start ranking your picks
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={rankedIds}
            onReorder={(next) => {
              setRankedIds(next);
              setSubmitted(false);
            }}
            className="space-y-2"
          >
            {rankedIds.map((id, i) => {
              const nom = getNom(id);
              if (!nom) return null;
              const medal = MEDALS[i];

              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    medal ? `${medal.bg} ${medal.border}` : "bg-zinc-800/40 border-zinc-700/50"
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-zinc-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                  <div className="w-7 text-center flex-shrink-0">
                    {medal ? (
                      <medal.icon className={`w-5 h-5 mx-auto ${medal.text}`} />
                    ) : (
                      <span className="text-zinc-500 font-bold text-sm">{i + 1}</span>
                    )}
                  </div>

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
                    <p className={`text-sm font-medium truncate ${medal ? medal.text : "text-white"}`}>
                      {nom.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-zinc-500 text-xs truncate">
                        {nom.year}
                        {nom.author ? ` · ${nom.author}` : ""}
                      </p>
                      <StarRating rating={nom.rating} ratingCount={nom.rating_count} />
                    </div>
                  </div>

                  {onNominationClick && (
                    <button
                      onClick={() => onNominationClick(nom)}
                      className="p-1.5 text-zinc-500 hover:text-violet-400 flex-shrink-0"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeFromRanked(id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 flex-shrink-0"
                    title="Remove from ranking"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>

      {unranked.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Not ranking ({unranked.length})
          </h3>
          <div className="space-y-2">
            {unranked.map((nom) => (
              <motion.div
                key={nom.id}
                layout
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
              >
                {nom.poster_url ? (
                  <Image
                    src={nom.poster_url}
                    alt={nom.title}
                    width={36}
                    height={54}
                    className="w-9 h-14 object-cover rounded-lg flex-shrink-0 opacity-60"
                  />
                ) : (
                  <div className="w-9 h-14 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    {sessionType === "movie" ? (
                      <Film className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-zinc-400">{nom.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-600 text-xs truncate">
                      {nom.year}
                      {nom.author ? ` · ${nom.author}` : ""}
                    </p>
                    <StarRating rating={nom.rating} ratingCount={nom.rating_count} />
                  </div>
                </div>
                {sessionType === "movie" && nom.availability && (
                  <AvailabilityBadge
                    availability={(nom.availability as "free" | "rent" | "unavailable") || "unavailable"}
                  />
                )}
                {onNominationClick && (
                  <button
                    onClick={() => onNominationClick(nom)}
                    className="p-1.5 text-zinc-500 hover:text-violet-400 flex-shrink-0"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => addToRanked(nom.id)}
                  className="p-1.5 text-zinc-500 hover:text-violet-400 flex-shrink-0"
                  title="Add to ranking"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Single-vote mode is irreversible, so make them confirm rather than
          letting a stray tap end their participation. */}
      {confirming ? (
        <div className="space-y-3 p-4 rounded-xl border border-violet-500/40 bg-violet-500/10">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300">
              Submit this ranking as final? You won&apos;t be able to change it afterwards
              — only the organizer can reopen voting.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Keep editing
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lock it in"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => (lockBallots ? setConfirming(true) : submit())}
          disabled={submitting || rankedIds.length === 0}
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
              Update Ranking
            </>
          ) : lockBallots ? (
            <>
              <Lock className="w-5 h-5" />
              Submit Final Ranking
            </>
          ) : (
            <>Submit Ranking</>
          )}
        </button>
      )}

      {submitted && (
        <p className="text-center text-green-400 text-sm">
          ✓ Your ranking is in! You can change it anytime while voting is open.
        </p>
      )}
    </div>
  );
}
