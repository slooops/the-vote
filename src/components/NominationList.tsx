"use client";

import { Film, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";
import type { Nomination } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";

interface NominationListProps {
  nominations: Nomination[];
  sessionType: "movie" | "book";
  currentUserToken?: string;
  onNominationClick?: (nomination: Nomination) => void;
}

export default function NominationList({
  nominations,
  sessionType,
  currentUserToken,
  onNominationClick,
}: NominationListProps) {
  if (nominations.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg">No nominations yet</p>
        <p className="text-sm mt-1">Be the first to suggest something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
        Nominations ({nominations.length})
      </h3>
      {nominations.map((nom, i) => (
        <motion.button
          key={nom.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onNominationClick?.(nom)}
          className={`w-full flex gap-3 p-4 rounded-xl border transition-colors text-left ${
            nom.nominated_by_token === currentUserToken
              ? "bg-violet-500/10 border-violet-500/30"
              : "bg-zinc-800/30 border-zinc-700/50"
          } ${onNominationClick ? "cursor-pointer hover:bg-zinc-800/60 active:scale-[0.98]" : ""}`}
        >
          {nom.poster_url ? (
            <Image
              src={nom.poster_url}
              alt={nom.title}
              width={48}
              height={72}
              className="w-12 h-18 object-cover rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-18 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
              {sessionType === "movie" ? (
                <Film className="w-5 h-5 text-zinc-500" />
              ) : (
                <BookOpen className="w-5 h-5 text-zinc-500" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white font-medium truncate">{nom.title}</p>
              {sessionType === "movie" && nom.availability && (
                <AvailabilityBadge
                  availability={(nom.availability as "free" | "rent" | "unavailable") || "unavailable"}
                />
              )}
            </div>
            <p className="text-zinc-400 text-sm">
              {nom.year}
              {nom.author ? ` · ${nom.author}` : ""}
              {nom.pages ? ` · ${nom.pages} pages` : ""}
            </p>
            {nom.synopsis && (
              <p className="text-zinc-500 text-xs mt-1 line-clamp-2">
                {nom.synopsis}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2 text-zinc-600 text-xs">
              <User className="w-3 h-3" />
              {nom.nominated_by_name}
              {nom.nominated_by_token === currentUserToken && (
                <span className="text-violet-400 ml-1">(you)</span>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
