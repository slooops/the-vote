"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Film, BookOpen, RefreshCw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import WelcomeModal from "@/components/WelcomeModal";
import SearchNominate from "@/components/SearchNominate";
import NominationList from "@/components/NominationList";
import NominationDetailModal from "@/components/NominationDetailModal";
import VotingBooth from "@/components/VotingBooth";
import ResultsChart from "@/components/ResultsChart";
import {
  getUser,
  setUser,
  generateToken,
  markWelcomeSeen,
} from "@/lib/user";
import type { Session, Nomination, Vote, NominationWithScore } from "@/lib/types";

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [results, setResults] = useState<NominationWithScore[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [hasNominated, setHasNominated] = useState(false);
  const [detailNomination, setDetailNomination] = useState<Nomination | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSession(data);
    }
  }, [id]);

  const fetchNominations = useCallback(async () => {
    const res = await fetch(`/api/nominations?session_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setNominations(data);
      const user = getUser();
      if (user) {
        setHasNominated(data.some((n: Nomination) => n.nominated_by_token === user.token));
      }
    }
  }, [id]);

  const fetchMyVote = useCallback(async () => {
    const user = getUser();
    if (!user) return;
    const res = await fetch(
      `/api/votes?session_id=${id}&voter_token=${user.token}`
    );
    if (res.ok) {
      const data = await res.json();
      setMyVote(data);
    }
  }, [id]);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/results/${id}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
      setTotalVotes(data.total_votes);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchSession(), fetchNominations(), fetchResults(), fetchMyVote()]);
  }, [fetchSession, fetchNominations, fetchResults, fetchMyVote]);

  useEffect(() => {
    const user = getUser();
    if (!user || !user.hasSeenWelcome) {
      setShowWelcome(true);
    } else {
      setUserToken(user.token);
      setUserName(user.nickname);
    }

    (async () => {
      await Promise.all([fetchSession(), fetchNominations(), fetchResults()]);
      if (user?.token) {
        setUserToken(user.token);
        setUserName(user.nickname);
        await fetchMyVote();
      }
      setLoading(false);
    })();
  }, [fetchSession, fetchNominations, fetchResults, fetchMyVote]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleWelcomeComplete = (nickname: string) => {
    const token = generateToken();
    setUser({ token, nickname, hasSeenWelcome: true });
    markWelcomeSeen();
    setUserToken(token);
    setUserName(nickname);
    setShowWelcome(false);
  };

  const handleNominationClick = (nom: Nomination) => {
    setDetailNomination(nom);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Election not found</h1>
          <p className="text-zinc-400">This election doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const statusLabel = {
    nominations_open: "Nominations Open",
    nominations_closed: "Nominations Closed",
    voting_open: "Voting Open",
    voting_closed: "Voting Closed",
  }[session.status];

  const statusColor = {
    nominations_open: "bg-green-500",
    nominations_closed: "bg-yellow-500",
    voting_open: "bg-blue-500",
    voting_closed: "bg-zinc-500",
  }[session.status];

  return (
    <div className="min-h-screen bg-zinc-950">
      {showWelcome && <WelcomeModal onComplete={handleWelcomeComplete} />}

      {/* Nomination detail modal */}
      <AnimatePresence>
        {detailNomination && userToken && (
          <NominationDetailModal
            nomination={detailNomination}
            session={session}
            isOwn={detailNomination.nominated_by_token === userToken}
            voterToken={userToken}
            voterName={userName}
            onClose={() => setDetailNomination(null)}
            onNominationChanged={
              session.status === "nominations_open" &&
              detailNomination.nominated_by_token === userToken
                ? () => fetchNominations()
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              {session.type === "movie" ? (
                <Film className="w-5 h-5 text-white" />
              ) : (
                <BookOpen className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{session.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-zinc-400 text-xs">{statusLabel}</span>
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 text-zinc-500 hover:text-violet-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        {userName && (
          <div className="text-zinc-500 text-sm">
            Voting as <span className="text-violet-400 font-medium">{userName}</span>
          </div>
        )}

        {/* Nominations phase */}
        {session.status === "nominations_open" && userToken && (
          <>
            {!hasNominated ? (
              <>
                <NominationList
                  nominations={nominations}
                  sessionType={session.type}
                  currentUserToken={userToken}
                  onNominationClick={handleNominationClick}
                />
                <div className="border-t border-zinc-800 pt-6">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Your Nomination
                  </h2>
                  <SearchNominate
                    session={session}
                    voterToken={userToken}
                    voterName={userName}
                    onNominated={() => {
                      setHasNominated(true);
                      fetchNominations();
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-medium">
                    ✓ You&apos;ve submitted your nomination!
                  </p>
                  <p className="text-zinc-400 text-sm mt-1">
                    Tap your nomination to view details or change it.
                  </p>
                </div>
                <NominationList
                  nominations={nominations}
                  sessionType={session.type}
                  currentUserToken={userToken}
                  onNominationClick={handleNominationClick}
                />
              </>
            )}
          </>
        )}

        {/* Nominations closed — waiting */}
        {session.status === "nominations_closed" && (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-yellow-400 font-medium">
                Nominations are closed
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                Voting will open soon!
              </p>
            </div>
            <NominationList
              nominations={nominations}
              sessionType={session.type}
              currentUserToken={userToken || undefined}
              onNominationClick={handleNominationClick}
            />
          </>
        )}

        {/* Voting phase */}
        {session.status === "voting_open" && userToken && (
          <>
            <VotingBooth
              sessionId={id}
              nominations={nominations}
              sessionType={session.type}
              voterToken={userToken}
              voterName={userName}
              existingVote={myVote}
              onVoted={() => {
                fetchResults();
                fetchMyVote();
              }}
              onNominationClick={handleNominationClick}
            />
            {/* Live results */}
            {results.length > 0 && (
              <div className="border-t border-zinc-800 pt-6">
                <ResultsChart results={results} totalVotes={totalVotes} />
              </div>
            )}
          </>
        )}

        {/* Final results */}
        {session.status === "voting_closed" && (
          <ResultsChart results={results} totalVotes={totalVotes} isFinal />
        )}
      </div>
    </div>
  );
}
