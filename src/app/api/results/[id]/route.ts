import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { IRVRound, IRVRoundTally } from "@/lib/types";

interface IRVOutcome {
  rounds: IRVRound[];
  winner: string | null;
  eliminationOrder: string[];
}

// Runs standard instant-runoff on a set of candidate ids and ranked (possibly
// partial) ballots. Ballots with no remaining ranked candidate in a given
// round are "exhausted" - they stop transferring and don't count toward that
// round's majority threshold, exactly like a real-world partial IRV ballot.
function runIRV(candidateIds: string[], ballots: string[][]): IRVOutcome {
  if (candidateIds.length === 0) {
    return { rounds: [], winner: null, eliminationOrder: [] };
  }

  const active = new Set(candidateIds);
  const cumulativeVotes: Record<string, number> = {};
  for (const id of candidateIds) cumulativeVotes[id] = 0;

  const rounds: IRVRound[] = [];
  const eliminationOrder: string[] = [];
  let winner: string | null = null;

  while (true) {
    const tallies: Record<string, number> = {};
    for (const id of active) tallies[id] = 0;

    let continuingBallots = 0;
    for (const ballot of ballots) {
      const topChoice = ballot.find((id) => active.has(id));
      if (topChoice !== undefined) {
        tallies[topChoice]++;
        continuingBallots++;
      }
    }
    const exhausted_count = ballots.length - continuingBallots;

    for (const id of active) cumulativeVotes[id] += tallies[id];

    const tallyList: IRVRoundTally[] = Array.from(active)
      .map((id) => ({ nomination_id: id, votes: tallies[id] }))
      .sort((a, b) => b.votes - a.votes);

    const majority = Math.floor(continuingBallots / 2) + 1;

    let roundWinner: string | null = null;
    if (active.size === 1) {
      roundWinner = Array.from(active)[0];
    } else if (continuingBallots > 0 && tallyList[0].votes >= majority) {
      roundWinner = tallyList[0].nomination_id;
    }

    if (roundWinner) {
      rounds.push({ round: rounds.length + 1, tallies: tallyList, eliminated: null, exhausted_count });
      winner = roundWinner;
      break;
    }

    const minVotes = Math.min(...Array.from(active).map((id) => tallies[id]));
    let candidates = Array.from(active).filter((id) => tallies[id] === minVotes);
    if (candidates.length > 1) {
      // Deterministic tiebreak: fewest cumulative votes across all rounds so
      // far, then lowest id alphabetically - reproducible, no randomness.
      candidates = [...candidates].sort((a, b) => {
        if (cumulativeVotes[a] !== cumulativeVotes[b]) return cumulativeVotes[a] - cumulativeVotes[b];
        return a.localeCompare(b);
      });
    }
    const eliminated = candidates[0];

    rounds.push({ round: rounds.length + 1, tallies: tallyList, eliminated, exhausted_count });
    eliminationOrder.push(eliminated);
    active.delete(eliminated);
  }

  return { rounds, winner, eliminationOrder };
}

// GET /api/results/[id] - Get IRV-tallied results for a session
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);
  if (session.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const nominations = await sql(
    `SELECT * FROM tv_nominations WHERE session_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  const votes = await sql(`SELECT * FROM tv_votes WHERE session_id = $1`, [id]);

  const nominationIds: string[] = nominations.map((n: Record<string, unknown>) => n.id as string);
  const validIds = new Set(nominationIds);

  // Each ballot is an ordered list of nomination ids, filtered to ids that
  // still exist (a nomination may have been deleted after votes were cast).
  const ballots: string[][] = votes.map((v: Record<string, unknown>) => {
    const rankings = Array.isArray(v.rankings)
      ? (v.rankings as string[])
      : JSON.parse((v.rankings as string) || "[]");
    return rankings.filter((nomId: string) => validIds.has(nomId));
  });

  let rounds: IRVRound[] = [];
  let winner: string | null = null;
  let eliminationOrder: string[] = [];

  if (votes.length > 0) {
    const outcome = runIRV(nominationIds, ballots);
    rounds = outcome.rounds;
    winner = outcome.winner;
    eliminationOrder = outcome.eliminationOrder;
  }

  const eliminatedRoundByNomId: Record<string, number> = {};
  for (const r of rounds) {
    if (r.eliminated) eliminatedRoundByNomId[r.eliminated] = r.round;
  }
  const firstRoundVotesByNomId: Record<string, number> =
    rounds.length > 0
      ? Object.fromEntries(rounds[0].tallies.map((t) => [t.nomination_id, t.votes]))
      : {};

  // Full final ranking: winner first, then any other candidates still active
  // when the winner was found (ranked by their final-round vote count - these
  // never lost a runoff, they just didn't need to since a majority emerged),
  // then formally-eliminated candidates in reverse elimination order (most
  // recently eliminated ranks higher - standard IRV convention).
  const rankOrder = winner
    ? [
        winner,
        ...rounds[rounds.length - 1].tallies
          .filter((t) => t.nomination_id !== winner)
          .map((t) => t.nomination_id),
        ...[...eliminationOrder].reverse(),
      ]
    : votes.length > 0
    ? [...eliminationOrder].reverse()
    : nominationIds;

  const rankById: Record<string, number> = {};
  rankOrder.forEach((nomId, i) => {
    rankById[nomId] = i + 1;
  });

  const results = nominations
    .map((nom: Record<string, unknown>) => ({
      ...nom,
      rank: rankById[nom.id as string] ?? nominationIds.length,
      first_round_votes: firstRoundVotesByNomId[nom.id as string] ?? 0,
      eliminated_round: eliminatedRoundByNomId[nom.id as string] ?? null,
    }))
    .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);

  // Strip admin_token from session
  const { admin_token: _, ...publicSession } = session[0];

  return NextResponse.json({
    session: publicSession,
    results,
    rounds,
    total_votes: votes.length,
    exhausted_final: rounds.length > 0 ? rounds[rounds.length - 1].exhausted_count : 0,
  });
}
