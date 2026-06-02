"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  onComplete: (nickname: string) => void;
}

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to The Vote 🗳️",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 text-lg">
            Your group&apos;s go-to for picking what to watch or read next.
          </p>
          <p className="text-zinc-400">
            Someone nominated you to help pick the next movie or book. Here&apos;s how it works:
          </p>
        </div>
      ),
    },
    {
      title: "How Voting Works",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-yellow-400 font-semibold">Gold Pick — 3 points</p>
              <p className="text-zinc-400 text-sm">Your #1 choice</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-400/20 flex items-center justify-center flex-shrink-0">
              <Medal className="w-6 h-6 text-zinc-300" />
            </div>
            <div>
              <p className="text-zinc-300 font-semibold">Silver Pick — 2 points</p>
              <p className="text-zinc-400 text-sm">Your runner-up</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-700/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-amber-600 font-semibold">Bronze Pick — 1 point</p>
              <p className="text-zinc-400 text-sm">Honorable mention</p>
            </div>
          </div>
          <p className="text-zinc-500 text-sm mt-4">
            If there are only 2 options, you&apos;ll pick Gold and Silver only.
          </p>
          <div className="bg-zinc-800/50 rounded-lg p-3 mt-2">
            <p className="text-zinc-400 text-xs">
              <span className="text-violet-400 font-medium">Nominations are public</span> — everyone sees who nominated what.{" "}
              <span className="text-violet-400 font-medium">Votes are anonymous</span> — no one sees how you voted.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "What's your name?",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-400">
            Pick a nickname so the group knows who nominated what.
          </p>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Jack, MovieBuff42, etc."
            maxLength={20}
            className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && nickname.trim()) {
                onComplete(nickname.trim());
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    i <= step ? "bg-violet-500" : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            {steps[step].title}
          </h2>

          {steps[step].content}

          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => nickname.trim() && onComplete(nickname.trim())}
                disabled={!nickname.trim()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-medium transition-colors"
              >
                Let&apos;s Go
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
