"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film, BookOpen, Plus, Loader2, Sparkles, Trash2, ExternalLink, Settings } from "lucide-react";
import { motion } from "framer-motion";
import {
  getAdminSessions,
  saveAdminSession,
  removeAdminSession,
  type AdminSession,
} from "@/lib/admin-sessions";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"movie" | "book">("movie");
  const [showCreate, setShowCreate] = useState(false);
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setAdminSessions(getAdminSessions());
  }, []);

  const createSession = async () => {
    if (!name.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });

      if (res.ok) {
        const { id, admin_token } = await res.json();
        // Save to localStorage for recovery
        saveAdminSession({
          id,
          name: name.trim(),
          type,
          admin_token,
          created_at: new Date().toISOString(),
        });
        setAdminSessions(getAdminSessions());
        router.push(`/session/${id}/admin/${admin_token}`);
      } else {
        alert("Failed to create election");
      }
    } catch {
      alert("Failed to create election");
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (session: AdminSession) => {
    if (!confirm(`Delete "${session.name}"? This removes all nominations and votes permanently from this election.`)) return;
    setDeletingId(session.id);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: session.admin_token }),
      });

      if (res.ok) {
        removeAdminSession(session.id);
        setAdminSessions(getAdminSessions());
      } else {
        alert("Failed to delete election");
      }
    } catch {
      alert("Failed to delete election");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            The Vote
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            Pick what to watch or read next
          </p>
        </motion.div>

        {/* Create session */}
        {!showCreate ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCreate(true)}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Election
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-lg font-semibold text-white">Create an Election</h2>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Movie Night, June Book Club"
              className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createSession()}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType("movie")}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all ${
                  type === "movie"
                    ? "bg-violet-600 text-white ring-2 ring-violet-400"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <Film className="w-5 h-5" />
                Movie Night
              </button>
              <button
                onClick={() => setType("book")}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all ${
                  type === "book"
                    ? "bg-violet-600 text-white ring-2 ring-violet-400"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Book Club
              </button>
            </div>

            <button
              onClick={createSession}
              disabled={creating || !name.trim()}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Election
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Your sessions */}
        {adminSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Your Elections
            </h3>
            {adminSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
              >
                <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  {s.type === "movie" ? (
                    <Film className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.name}</p>
                  <p className="text-zinc-600 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/session/${s.id}/admin/${s.admin_token}`}
                  className="p-2 text-zinc-500 hover:text-violet-400 transition-colors"
                  title="Admin panel"
                >
                  <Settings className="w-4 h-4" />
                </a>
                <a
                  href={`/session/${s.id}`}
                  target="_blank"
                  className="p-2 text-zinc-500 hover:text-violet-400 transition-colors"
                  title="Voter view"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deleteSession(s)}
                  disabled={deletingId === s.id}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Delete election"
                >
                  {deletingId === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </motion.div>
        )}

        <p className="text-center text-zinc-600 text-xs">
          Ranked choice voting for groups. No sign-up required.
        </p>
      </div>
    </div>
  );
}
