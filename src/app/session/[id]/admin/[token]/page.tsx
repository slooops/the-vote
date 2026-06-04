"use client";

import { useEffect, useState, useCallback, use } from "react";
import {
  Film,
  BookOpen,
  Play,
  Pause,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Vote,
  Plus,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NominationList from "@/components/NominationList";
import ResultsChart from "@/components/ResultsChart";
import type { Session, Nomination, NominationWithScore } from "@/lib/types";
import { saveAdminSession, getAdminSessions, type AdminSession } from "@/lib/admin-sessions";

export default function AdminPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [results, setResults] = useState<NominationWithScore[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editServices, setEditServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [editMaxNoms, setEditMaxNoms] = useState(1);
  const [authorized, setAuthorized] = useState(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);
  const [otherSessions, setOtherSessions] = useState<AdminSession[]>([]);

  // Load other admin sessions for the switcher
  useEffect(() => {
    const all = getAdminSessions();
    setOtherSessions(all.filter((s) => s.id !== id));
  }, [id]);

  const fetchAll = useCallback(async () => {
    const [sessionRes, nomsRes, resultsRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/nominations?session_id=${id}`),
      fetch(`/api/results/${id}`),
    ]);

    if (sessionRes.ok) {
      const s = await sessionRes.json();
      setSession(s);
      const services = Array.isArray(s.streaming_services)
        ? s.streaming_services
        : JSON.parse(s.streaming_services);
      setEditServices(services);
      setEditMaxNoms(s.max_nominations ?? 1);
    }
    if (nomsRes.ok) setNominations(await nomsRes.json());
    if (resultsRes.ok) {
      const r = await resultsRes.json();
      setResults(r.results);
      setTotalVotes(r.total_votes);
    }
  }, [id]);

  // Verify admin token
  useEffect(() => {
    (async () => {
      // Try a PATCH with just a status read to verify token
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: token }),
      });
      if (res.ok) {
        setAuthorized(true);
        await fetchAll();
      }
      setLoading(false);
    })();
  }, [id, token, fetchAll]);

  // Save admin session to localStorage for recovery
  useEffect(() => {
    if (authorized && session) {
      saveAdminSession({
        id,
        name: session.name,
        type: session.type,
        admin_token: token,
        created_at: session.created_at,
      });
    }
  }, [authorized, session, id, token]);

  // Auto-refresh
  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [authorized, fetchAll]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: token, status: newStatus }),
      });
      await fetchAll();
    } catch {
      alert("Failed to update election");
    } finally {
      setUpdating(false);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_token: token,
          streaming_services: editServices,
          max_nominations: editMaxNoms,
        }),
      });
      await fetchAll();
      setShowSettings(false);
    } catch {
      alert("Failed to save settings");
    }
  };

  const copyVoterLink = () => {
    const url = `${window.location.origin}/session/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteNomination = async (nomId: string) => {
    if (!confirm("Delete this nomination?")) return;
    await fetch(`/api/nominations/${nomId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_token: token }),
    });
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Not Authorized</h1>
          <p className="text-zinc-400">Invalid admin link.</p>
        </div>
      </div>
    );
  }

  const statusFlow = [
    { key: "nominations_open", label: "Open Noms", icon: Unlock },
    { key: "nominations_closed", label: "Close Noms", icon: Lock },
    { key: "voting_open", label: "Open Voting", icon: Play },
    { key: "voting_closed", label: "Close Voting", icon: Pause },
  ];

  const currentIndex = statusFlow.findIndex((s) => s.key === session.status);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Session switcher bar */}
        {otherSessions.length > 0 && (
          <div>
            <button
              onClick={() => setShowSessionSwitcher(!showSessionSwitcher)}
              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span>{otherSessions.length} other election{otherSessions.length > 1 ? "s" : ""}</span>
              <span className={`transition-transform ${showSessionSwitcher ? "rotate-180" : ""}`}>▾</span>
            </button>
            <AnimatePresence>
              {showSessionSwitcher && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1.5"
                >
                  {otherSessions.map((s) => (
                    <a
                      key={s.id}
                      href={`/session/${s.id}/admin/${s.admin_token}`}
                      className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-colors"
                    >
                      <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {s.type === "movie" ? (
                          <Film className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.name}</p>
                        <p className="text-zinc-600 text-xs">{s.type === "movie" ? "Movie Night" : "Book Club"}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                    </a>
                  ))}
                  <a
                    href="/"
                    className="flex items-center justify-center gap-2 p-2 text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    New Election
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              {session.type === "movie" ? (
                <Film className="w-5 h-5 text-white" />
              ) : (
                <BookOpen className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{session.name}</h1>
              <span className="text-red-400 text-xs font-medium">Admin</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-zinc-500 hover:text-violet-400"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={fetchAll}
              className="p-2 text-zinc-500 hover:text-violet-400"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Share link */}
        <div className="flex gap-2">
          <button
            onClick={copyVoterLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy voter link
              </>
            )}
          </button>
          <a
            href={`/session/${id}`}
            target="_blank"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm text-white transition-colors"
          >
            <Vote className="w-4 h-4" />
            Vote
          </a>
          <a
            href={`/session/${id}`}
            target="_blank"
            className="flex items-center justify-center px-3 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Status controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Election Controls
          </h3>

          {/* Progress bar */}
          <div className="flex gap-1">
            {statusFlow.map((s, i) => (
              <div
                key={s.key}
                className={`flex-1 h-2 rounded-full ${
                  i <= currentIndex ? "bg-violet-500" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statusFlow.map((s, i) => {
              const Icon = s.icon;
              const isCurrent = s.key === session.status;
              const isNext = i === currentIndex + 1;
              const isPast = i < currentIndex;

              return (
                <button
                  key={s.key}
                  onClick={() => updateStatus(s.key)}
                  disabled={updating || isCurrent}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-violet-600 text-white"
                      : isNext
                      ? "bg-zinc-800 hover:bg-violet-600/50 text-white border border-violet-500/50"
                      : isPast
                      ? "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800"
                      : "bg-zinc-800/50 text-zinc-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-5"
            >
              {/* Max nominations */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  Nominations Per Person
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 0].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEditMaxNoms(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        editMaxNoms === n
                          ? "bg-violet-600 text-white ring-2 ring-violet-400"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {n === 0 ? "∞" : n}
                    </button>
                  ))}
                </div>
                <p className="text-zinc-600 text-xs">
                  {editMaxNoms === 0
                    ? "Unlimited — everyone can nominate as many as they want"
                    : editMaxNoms === 1
                    ? "Each person gets 1 nomination"
                    : `Each person gets up to ${editMaxNoms} nominations`}
                </p>
              </div>

              {/* Streaming services (movies only) */}
              {session.type === "movie" && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                    Streaming Services
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {editServices.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-full text-sm text-zinc-300"
                      >
                        {s}
                        <button
                          onClick={() =>
                            setEditServices(editServices.filter((x) => x !== s))
                          }
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newService.trim()) {
                          setEditServices([...editServices, newService.trim()]);
                          setNewService("");
                        }
                      }}
                      placeholder="Add service..."
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={() => {
                        if (newService.trim()) {
                          setEditServices([...editServices, newService.trim()]);
                          setNewService("");
                        }
                      }}
                      className="px-3 py-2 bg-violet-600 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={saveSettings}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium"
              >
                Save Settings
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nominations list with delete */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Nominations ({nominations.length})
          </h3>
          {nominations.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">
              No nominations yet. Share the voter link!
            </p>
          ) : (
            nominations.map((nom) => (
              <div
                key={nom.id}
                className="flex items-center gap-2 bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {nom.title}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    by {nom.nominated_by_name} · {nom.year}
                  </p>
                </div>
                <button
                  onClick={() => deleteNomination(nom.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ResultsChart
            results={results}
            totalVotes={totalVotes}
            isFinal={session.status === "voting_closed"}
          />
        )}
      </div>
    </div>
  );
}
