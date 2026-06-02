"use client";

import { X, Film, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";
import type { Nomination } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";

interface NominationDetailModalProps {
  nomination: Nomination;
  sessionType: "movie" | "book";
  isOwn: boolean;
  onClose: () => void;
  onChangeNomination?: () => void;
}

export default function NominationDetailModal({
  nomination,
  sessionType,
  isOwn,
  onClose,
  onChangeNomination,
}: NominationDetailModalProps) {
  const streamingFree = Array.isArray(nomination.streaming_availability)
    ? nomination.streaming_availability
    : JSON.parse((nomination.streaming_availability as unknown as string) || "[]");
  const streamingRent = Array.isArray(nomination.streaming_rent)
    ? nomination.streaming_rent
    : JSON.parse((nomination.streaming_rent as unknown as string) || "[]");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with poster */}
        <div className="relative">
          {nomination.poster_url ? (
            <div className="relative w-full h-64 bg-zinc-800">
              <Image
                src={nomination.poster_url}
                alt={nomination.title}
                fill
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 flex gap-4">
                <Image
                  src={nomination.poster_url}
                  alt={nomination.title}
                  width={100}
                  height={150}
                  className="w-24 h-36 object-cover rounded-xl shadow-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-end">
                  <h2 className="text-2xl font-bold text-white">{nomination.title}</h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    {nomination.year}
                    {nomination.author ? ` · ${nomination.author}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 pb-0">
              <div className="flex items-center gap-4">
                <div className="w-24 h-36 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  {sessionType === "movie" ? (
                    <Film className="w-10 h-10 text-zinc-600" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-zinc-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{nomination.title}</h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    {nomination.year}
                    {nomination.author ? ` · ${nomination.author}` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Availability */}
          {sessionType === "movie" && (
            <div className="space-y-2">
              <AvailabilityBadge
                availability={(nomination.availability as "free" | "rent" | "unavailable") || "unavailable"}
                size="lg"
              />
              {streamingFree.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {streamingFree.map((s: string) => (
                    <span key={s} className="px-2 py-1 bg-green-500/15 text-green-400 text-xs rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
              {streamingRent.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {streamingRent.map((s: string) => (
                    <span key={s} className="px-2 py-1 bg-yellow-500/15 text-yellow-400 text-xs rounded-full">
                      $ {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Synopsis */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Synopsis
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {nomination.synopsis || "No synopsis available."}
            </p>
          </div>

          {/* Nominated by */}
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <User className="w-4 h-4" />
            Nominated by {nomination.nominated_by_name}
            {isOwn && <span className="text-violet-400">(you)</span>}
          </div>

          {/* Change nomination button */}
          {isOwn && onChangeNomination && (
            <button
              onClick={onChangeNomination}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors"
            >
              Change My Nomination
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
