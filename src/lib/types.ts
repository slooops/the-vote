export interface Session {
  id: string;
  name: string;
  type: "movie" | "book";
  status:
    | "nominations_open"
    | "nominations_closed"
    | "voting_open"
    | "voting_closed";
  admin_token: string;
  streaming_services: string[];
  max_nominations: number;
  // Single-vote mode: a ballot locks on submit and only the admin can reopen
  // voting. Turn off for the old behavior where voters re-rank freely.
  lock_ballots: boolean;
  // Show the running tally while voting is open. Off by default so an early
  // voter can't watch the standings and lobby whoever hasn't voted yet.
  live_results: boolean;
  created_at: string;
  updated_at: string;
}

export interface Nomination {
  id: string;
  session_id: string;
  title: string;
  poster_url: string | null;
  synopsis: string | null;
  author: string | null;
  year: string | null;
  tmdb_id: number | null;
  openlibrary_key: string | null;
  pages: number | null;
  streaming_availability: string[];
  streaming_rent: string[];
  availability: "free" | "rent" | "unavailable";
  tags: string[];
  // Community rating normalized to 0-5 (TMDB for movies, Open Library for
  // books). Null when the source has none or too few to be meaningful.
  rating: number | null;
  rating_count: number | null;
  rating_source: string | null;
  nominated_by_token: string;
  nominated_by_name: string;
  created_at: string;
}

export interface Vote {
  id: string;
  session_id: string;
  voter_token: string;
  voter_name: string;
  rankings: string[];
  // True once submitted in single-vote mode; cleared when an admin reopens.
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface IRVRoundTally {
  nomination_id: string;
  votes: number;
}

export interface IRVRound {
  round: number;
  tallies: IRVRoundTally[];
  eliminated: string | null;
  exhausted_count: number;
  // True when several candidates were tied for last and the tiebreak rule,
  // not the voters, decided who went out.
  tiebreak: boolean;
}

// Set when the FINAL elimination was settled by the tiebreak rule, meaning the
// winner didn't actually out-poll the runner-up. Surfaced to the admin as a
// prompt to reopen voting.
export interface FinalTie {
  round: number;
  candidates: string[];
  votes: number;
}

export interface RankedResult extends Nomination {
  rank: number;
  first_round_votes: number;
  eliminated_round: number | null;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  year: string;
  poster_url: string | null;
  synopsis: string;
  author?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
  pages?: number;
  rating?: number | null;
  rating_count?: number | null;
  rating_source?: string | null;
}
