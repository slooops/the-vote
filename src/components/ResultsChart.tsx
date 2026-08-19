"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Medal, Award, Crown, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RankedResult, IRVRound } from "@/lib/types";
import Image from "next/image";

interface ResultsChartProps {
  results: RankedResult[];
  rounds: IRVRound[];
  totalVotes: number;
  exhaustedFinal: number;
  isFinal?: boolean;
  onNominationClick?: (nomination: RankedResult) => void;
}

const MEDALS = [
  null, // rank 1 gets the Crown/winner treatment instead
  { icon: Medal, text: "text-zinc-300" },
  { icon: Award, text: "text-amber-600" },
] as const;

export default function ResultsChart({
  results,
  rounds,
  totalVotes,
  exhaustedFinal,
  isFinal,
  onNominationClick,
}: ResultsChartProps) {
  const [showRounds, setShowRounds] = useState(false);

  const maxVotes = useMemo(
    () => Math.max(...results.map((r) => r.first_round_votes), 1),
    [results]
  );
  const titleById = useMemo(
    () => Object.fromEntries(results.map((r) => [r.id, r.title])),
    [results]
  );

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>No results yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          {isFinal ? "🏆 Final Results" : "📊 Live Results"}
        </h3>
        <span className="text-zinc-500 text-sm">{totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast</span>
      </div>

      {results.map((result, i) => {
        const barWidth = maxVotes > 0 ? (result.first_round_votes / maxVotes) * 100 : 0;
        const isWinner = totalVotes > 0 && result.rank === 1;
        const medal = MEDALS[i];

        const caption =
          totalVotes === 0
            ? null
            : isWinner
            ? rounds.length === 1
              ? "Instant winner"
              : `Won in round ${rounds.length}`
            : result.eliminated_round
            ? `Eliminated in round ${result.eliminated_round}`
            : null;

        return (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            {...(onNominationClick
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => onNominationClick(result),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNominationClick(result);
                    }
                  },
                }
              : {})}
            className={`rounded-xl overflow-hidden ${
              onNominationClick ? "cursor-pointer hover:brightness-125 transition-[filter]" : ""
            } ${
              isWinner
                ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
                : "bg-zinc-800/30 border border-zinc-700/50"
            }`}
          >
            <div className="flex items-center gap-3 p-4">
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                {isWinner ? (
                  <Crown className="w-6 h-6 text-yellow-400 mx-auto" />
                ) : medal ? (
                  <medal.icon className={`w-5 h-5 mx-auto ${medal.text}`} />
                ) : (
                  <span className="text-zinc-500 font-bold text-lg">{result.rank}</span>
                )}
              </div>

              {/* Poster */}
              {result.poster_url ? (
                <Image
                  src={result.poster_url}
                  alt={result.title}
                  width={36}
                  height={54}
                  className="w-9 h-14 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-14 bg-zinc-700 rounded-lg flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isWinner ? "text-yellow-200" : "text-white"}`}>
                  {result.title}
                </p>
                <p className="text-zinc-500 text-xs">
                  {result.year}
                  {result.author ? ` · ${result.author}` : ""}
                  {result.pages ? ` · ${result.pages} pages` : ""}
                </p>

                {/* First-round vote bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        isWinner ? "bg-gradient-to-r from-yellow-500 to-amber-400" : "bg-violet-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                  <span
                    className={`text-sm font-bold min-w-[2rem] text-right ${
                      isWinner ? "text-yellow-400" : "text-violet-400"
                    }`}
                  >
                    {result.first_round_votes}
                  </span>
                </div>

                {caption && <p className="text-zinc-500 text-xs mt-1">{caption}</p>}
              </div>
            </div>
          </motion.div>
        );
      })}

      {rounds.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowRounds(!showRounds)}
            className="w-full flex items-center justify-between text-sm font-medium text-zinc-400 uppercase tracking-wider py-2"
          >
            <span>Round-by-round elimination ({rounds.length} round{rounds.length !== 1 ? "s" : ""})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showRounds ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showRounds && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {rounds.map((round) => {
                  const roundMax = Math.max(...round.tallies.map((t) => t.votes), 1);
                  return (
                    <div
                      key={round.round}
                      className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-zinc-300">Round {round.round}</p>
                        {round.exhausted_count > 0 && (
                          <p className="text-zinc-600 text-xs">
                            {round.exhausted_count} ballot{round.exhausted_count !== 1 ? "s" : ""} exhausted
                          </p>
                        )}
                      </div>
                      {round.tallies.map((t) => {
                        const isEliminated = t.nomination_id === round.eliminated;
                        const width = roundMax > 0 ? (t.votes / roundMax) * 100 : 0;
                        return (
                          <div key={t.nomination_id} className="flex items-center gap-2">
                            <p
                              className={`text-xs w-28 truncate flex-shrink-0 ${
                                isEliminated ? "text-red-400/70 line-through" : "text-zinc-400"
                              }`}
                            >
                              {titleById[t.nomination_id] || "Unknown"}
                            </p>
                            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isEliminated ? "bg-red-500/50" : "bg-violet-500/70"}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500 w-6 text-right">{t.votes}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {exhaustedFinal > 0 && (
                  <p className="text-zinc-600 text-xs text-center">
                    {exhaustedFinal} ballot{exhaustedFinal !== 1 ? "s" : ""} exhausted by the final round
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
