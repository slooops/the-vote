"use client";

import { useState, useCallback } from "react";
import { X, Film, BookOpen, User, Search, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Nomination, Session, SearchResult } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";

interface NominationDetailModalProps {
  nomination: Nomination;
  session: Session;
  isOwn: boolean;
  voterToken: string;
  voterName: string;
  onClose: () => void;
  onNominationChanged?: () => void;
}

export default function NominationDetailModal({
  nomination,
  session,
  isOwn,
  voterToken,
  voterName,
  onClose,
  onNominationChanged,
}: NominationDetailModalProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const streamingFree = Array.isArray(nomination.streaming_availability)
    ? nomination.streaming_availability
    : JSON.parse((nomination.streaming_availability as unknown as string) || "[]");
  const streamingRent = Array.isArray(nomination.streaming_rent)
    ? nomination.streaming_rent
    : JSON.parse((nomination.streaming_rent as unknown as string) || "[]");

  const searchMovies = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${session.type}`
      );
      setResults(await res.json());
    } catch {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [query, session.type]);

  const selectNewNomination = async (result: SearchResult) => {
    setSubmitting(true);
    try {
      // Fetch streaming availability for movies
      let freeOn: string[] = [];
      let rentOn: string[] = [];
      let availability: "free" | "rent" | "unavailable" = "unavailable";

      if (session.type === "movie" && result.tmdb_id) {
        const sessionServices = Array.isArray(session.streaming_services)
          ? session.streaming_services
          : JSON.parse(session.streaming_services as unknown as string);
        const streamRes = await fetch(
          `/api/streaming?tmdb_id=${result.tmdb_id}&services=${encodeURIComponent(sessionServices.join(","))}`
        );
        const streamData = await streamRes.json();
        freeOn = streamData.freeOn || [];
        rentOn = streamData.rentOn || [];
        availability = streamData.availability || "unavailable";
      }

      // Fetch synopsis if not available
      let synopsis = result.synopsis || "";
      let author = result.author || "";
      if (!synopsis) {
        const synRes = await fetch("/api/synopsis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: result.title,
            type: session.type,
            author: result.author,
            year: result.year,
          }),
        });
        const synData = await synRes.json();
        synopsis = synData.synopsis || "";
        if (synData.author) author = synData.author;
      }

      // Submit the new nomination (POST replaces existing)
      const res = await fetch("/api/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          title: result.title,
          poster_url: result.poster_url,
          synopsis,
          author,
          year: result.year,
          tmdb_id: result.tmdb_id,
          openlibrary_key: result.openlibrary_key,
          streaming_availability: freeOn,
          streaming_rent: rentOn,
          availability,
          voter_token: voterToken,
          voter_name: voterName,
          replace_id: nomination.id,
        }),
      });

      if (res.ok) {
        onNominationChanged?.();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to change nomination");
      }
    } catch {
      alert("Failed to change nomination");
    } finally {
      setSubmitting(false);
    }
  };

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
                  {session.type === "movie" ? (
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
          {session.type === "movie" && (
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

          {/* Change nomination — inline search */}
          {isOwn && onNominationChanged && (
            <AnimatePresence mode="wait">
              {!isChanging ? (
                <motion.button
                  key="change-btn"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setIsChanging(true)}
                  className="w-full h-[50px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors"
                >
                  Change My Nomination
                </motion.button>
              ) : (
                <motion.div
                  key="change-search"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Search input — full width to prevent iOS Safari zoom */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchMovies()}
                      placeholder={session.type === "movie" ? "Search new movie..." : "Search new book..."}
                      className="w-full h-[50px] pl-12 pr-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-base placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={searchMovies}
                      disabled={searching || !query.trim()}
                      className="flex-1 h-[44px] bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> Search</>}
                    </button>
                    <button
                      onClick={() => {
                        setIsChanging(false);
                        setQuery("");
                        setResults([]);
                      }}
                      className="h-[44px] px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Search results */}
                  {results.length > 0 && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {results.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectNewNomination(result)}
                          disabled={submitting}
                          className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-violet-500/50 rounded-xl transition-all text-left disabled:opacity-50"
                        >
                          {result.poster_url ? (
                            <Image
                              src={result.poster_url}
                              alt={result.title}
                              width={36}
                              height={54}
                              className="w-9 h-14 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-14 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              {session.type === "movie" ? (
                                <Film className="w-4 h-4 text-zinc-500" />
                              ) : (
                                <BookOpen className="w-4 h-4 text-zinc-500" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{result.title}</p>
                            <p className="text-zinc-500 text-xs">
                              {result.year}
                              {result.author ? ` · ${result.author}` : ""}
                            </p>
                          </div>
                          {submitting ? (
                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                          ) : (
                            <Check className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
