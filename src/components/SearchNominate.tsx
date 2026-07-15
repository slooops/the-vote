"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, Film, BookOpen, MessageCircle, Send, Check, Undo2, Edit3, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchResult, Session } from "@/lib/types";
import Image from "next/image";
import AvailabilityBadge from "./AvailabilityBadge";

interface SearchNominateProps {
  session: Session;
  voterToken: string;
  voterName: string;
  onNominated: () => void;
  isChanging?: boolean;
  /** When changing an existing pick, the id of the nomination to replace. */
  replaceId?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function SearchNominate({
  session,
  voterToken,
  voterName,
  onNominated,
  isChanging,
  replaceId,
}: SearchNominateProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [synopsis, setSynopsis] = useState("");
  const [author, setAuthor] = useState("");
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [freeOn, setFreeOn] = useState<string[]>([]);
  const [rentOn, setRentOn] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"free" | "rent" | "unavailable">("unavailable");
  const [loadingStreaming, setLoadingStreaming] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualYear, setManualYear] = useState("");

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${session.type}`
      );
      const data = await res.json();
      setResults(data);
    } catch {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [query, session.type]);

  const selectResult = async (result: SearchResult) => {
    setSelected(result);
    setSynopsis(result.synopsis || "");
    setAuthor(result.author || "");
    setChatMessages([]);
    setShowChat(false);
    setEditing(false);
    setFreeOn([]);
    setRentOn([]);
    setAvailability("unavailable");

    // Fetch synopsis from Gemini if not available
    if (!result.synopsis) {
      setLoadingSynopsis(true);
      try {
        const res = await fetch("/api/synopsis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: result.title,
            type: session.type,
            author: result.author,
            year: result.year,
            openlibrary_key: result.openlibrary_key,
          }),
        });
        const data = await res.json();
        setSynopsis(data.synopsis || "");
        if (data.author) setAuthor(data.author);
      } catch {
        console.error("Synopsis fetch failed");
      } finally {
        setLoadingSynopsis(false);
      }
    }

    // Fetch streaming availability for movies
    if (session.type === "movie" && result.tmdb_id) {
      setLoadingStreaming(true);
      try {
        const sessionServices = Array.isArray(session.streaming_services)
          ? session.streaming_services
          : JSON.parse(session.streaming_services as unknown as string);
        const res = await fetch(
          `/api/streaming?tmdb_id=${result.tmdb_id}&services=${encodeURIComponent(sessionServices.join(","))}`
        );
        const data = await res.json();
        setFreeOn(data.freeOn || []);
        setRentOn(data.rentOn || []);
        setAvailability(data.availability || "unavailable");
      } catch {
        setAvailability("unavailable");
      } finally {
        setLoadingStreaming(false);
      }
    }
  };

  const startManualEntry = () => {
    setManualTitle(query.trim());
    setManualAuthor("");
    setManualYear("");
    setManualMode(true);
  };

  // Build a search-result-shaped object from the manual fields and drop into
  // the preview screen. Unlike selectResult, we DON'T auto-generate a synopsis:
  // a manually-added item isn't in any catalog, so Gemini would just stall
  // (30s+) and hallucinate. Open the editor instead so the user can type their
  // own synopsis (or leave it blank), with the chat icon still available if
  // they want to try generating one. No tmdb_id/openlibrary_key => no
  // poster/streaming lookup, as expected for an off-catalog pick.
  const continueManual = () => {
    if (!manualTitle.trim()) return;
    const manualResult: SearchResult = {
      id: `manual-${manualTitle.trim()}`,
      title: manualTitle.trim(),
      year: manualYear.trim(),
      poster_url: null,
      synopsis: "",
      author: session.type === "book" ? manualAuthor.trim() || undefined : undefined,
    };
    setManualMode(false);
    setSelected(manualResult);
    setSynopsis("");
    setAuthor(manualResult.author || "");
    setChatMessages([]);
    setShowChat(false);
    setEditing(true);
    setFreeOn([]);
    setRentOn([]);
    setAvailability("unavailable");
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selected) return;
    const userMsg = chatInput.trim();
    setChatInput("");

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userMsg },
    ];
    setChatMessages(newMessages);

    setLoadingSynopsis(true);
    try {
      const res = await fetch("/api/synopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title,
          type: session.type,
          author: author,
          year: selected.year,
          user_message: userMsg,
          conversation_history: newMessages,
        }),
      });
      const data = await res.json();

      setChatMessages([
        ...newMessages,
        { role: "assistant", content: data.synopsis || "I couldn't generate a response." },
      ]);
      setSynopsis(data.synopsis || synopsis);
      if (data.author) setAuthor(data.author);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, something went wrong. Try again." },
      ]);
    } finally {
      setLoadingSynopsis(false);
    }
  };

  const submitNomination = async () => {
    if (!selected) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          title: selected.title,
          poster_url: selected.poster_url,
          synopsis,
          author,
          year: selected.year,
          tmdb_id: selected.tmdb_id,
          openlibrary_key: selected.openlibrary_key,
          streaming_availability: freeOn,
          streaming_rent: rentOn,
          availability,
          voter_token: voterToken,
          voter_name: voterName,
          replace_id: replaceId,
        }),
      });

      if (res.ok) {
        onNominated();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to nominate");
      }
    } catch {
      alert("Failed to submit nomination");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isChanging && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
          <p className="text-yellow-400 text-sm font-medium">
            Changing your nomination — your previous pick will be replaced
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder={
                session.type === "movie"
                  ? "Search for a movie..."
                  : "Search for a book..."
              }
              className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="px-6 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {searching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {session.type === "movie" ? (
                  <Film className="w-5 h-5" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search results */}
      <AnimatePresence>
        {results.length > 0 && !selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {results.map((result) => (
              <motion.button
                key={result.id}
                onClick={() => selectResult(result)}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-violet-500/50 rounded-xl transition-all text-left"
                whileTap={{ scale: 0.98 }}
              >
                {result.poster_url ? (
                  <Image
                    src={result.poster_url}
                    alt={result.title}
                    width={48}
                    height={72}
                    className="w-12 h-18 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-18 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    {session.type === "movie" ? (
                      <Film className="w-6 h-6 text-zinc-500" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-zinc-500" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{result.title}</p>
                  <p className="text-zinc-400 text-sm">
                    {result.year}
                    {result.author ? ` · ${result.author}` : ""}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual add — for items that don't show up in search */}
      {!selected && (
        !manualMode ? (
          <button
            onClick={startManualEntry}
            className="w-full text-zinc-500 hover:text-violet-400 text-sm flex items-center justify-center gap-1.5 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Can&apos;t find your {session.type}? Add it manually
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-5 space-y-3"
          >
            <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Add {session.type === "movie" ? "a movie" : "a book"} manually
            </h4>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Title (required)"
              className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            {session.type === "book" && (
              <input
                type="text"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                placeholder="Author (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            )}
            <input
              type="text"
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && continueManual()}
              placeholder="Year (optional)"
              inputMode="numeric"
              className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex gap-2">
              <button
                onClick={continueManual}
                disabled={!manualTitle.trim()}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => setManualMode(false)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )
      )}

      {/* Selected item detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden"
          >
            <div className="flex gap-4 p-5">
              {selected.poster_url ? (
                <Image
                  src={selected.poster_url}
                  alt={selected.title}
                  width={120}
                  height={180}
                  className="w-28 h-42 object-cover rounded-xl flex-shrink-0"
                />
              ) : (
                <div className="w-28 h-42 bg-zinc-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  {session.type === "movie" ? (
                    <Film className="w-10 h-10 text-zinc-500" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-zinc-500" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white">{selected.title}</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  {selected.year}
                  {author ? ` · ${author}` : ""}
                </p>

                {/* Availability badge */}
                {session.type === "movie" && (
                  <div className="mt-3">
                    {loadingStreaming ? (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking streaming...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AvailabilityBadge availability={availability} size="lg" />
                        {freeOn.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {freeOn.map((s) => (
                              <span key={s} className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] rounded-full">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {rentOn.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rentOn.map((s) => (
                              <span key={s} className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 text-[10px] rounded-full">
                                $ {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setSelected(null)}
                  className="mt-3 text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" /> Back to results
                </button>
              </div>
            </div>

            {/* Synopsis section */}
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  Synopsis
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="text-zinc-500 hover:text-violet-400 transition-colors"
                    title="Edit manually"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="text-zinc-500 hover:text-violet-400 transition-colors"
                    title="Chat with AI about this"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loadingSynopsis && !synopsis ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating synopsis...</span>
                </div>
              ) : editing ? (
                <div className="space-y-2">
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    placeholder="Write your own synopsis..."
                  />
                  {session.type === "book" && (
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Author name"
                      className="w-full p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  )}
                </div>
              ) : (
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {synopsis || "No synopsis available — you can still nominate, or use the edit or chat icons to add one."}
                </p>
              )}

              {/* Chat interface */}
              <AnimatePresence>
                {showChat && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {chatMessages.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`text-sm p-3 rounded-xl ${
                              msg.role === "user"
                                ? "bg-violet-600/20 text-violet-200 ml-8"
                                : "bg-zinc-700/50 text-zinc-300 mr-8"
                            }`}
                          >
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                        placeholder="e.g. 'The director is actually Christopher Nolan'"
                        className="flex-1 p-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        disabled={loadingSynopsis}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={loadingSynopsis || !chatInput.trim()}
                        className="p-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white rounded-xl transition-colors"
                      >
                        {loadingSynopsis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-zinc-600 text-xs">
                      Tell Gemini if the synopsis is wrong, ask for changes, or provide corrections.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit nomination */}
              <button
                onClick={submitNomination}
                disabled={submitting || loadingSynopsis}
                className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {isChanging ? "Change Nomination" : "Nominate This"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
