"use client";

import { useMemo } from "react";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { motion } from "framer-motion";
import type { NominationWithScore } from "@/lib/types";
import Image from "next/image";

interface ResultsChartProps {
  results: NominationWithScore[];
  totalVotes: number;
  isFinal?: boolean;
}

export default function ResultsChart({ results, totalVotes, isFinal }: ResultsChartProps) {
  const maxScore = useMemo(
    () => Math.max(...results.map((r) => r.score), 1),
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
        const barWidth = maxScore > 0 ? (result.score / maxScore) * 100 : 0;
        const isWinner = isFinal && i === 0 && result.score > 0;

        return (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl overflow-hidden ${
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
                ) : (
                  <span className="text-zinc-500 font-bold text-lg">
                    {i + 1}
                  </span>
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
                </p>

                {/* Score bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        isWinner
                          ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                          : "bg-violet-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                  <span className={`text-sm font-bold min-w-[2rem] text-right ${
                    isWinner ? "text-yellow-400" : "text-violet-400"
                  }`}>
                    {result.score}
                  </span>
                </div>

                {/* Medal breakdown */}
                <div className="flex gap-3 mt-1.5">
                  {result.gold_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400">
                      <Trophy className="w-3 h-3" />
                      {result.gold_count}
                    </span>
                  )}
                  {result.silver_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-zinc-300">
                      <Medal className="w-3 h-3" />
                      {result.silver_count}
                    </span>
                  )}
                  {result.bronze_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Award className="w-3 h-3" />
                      {result.bronze_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
