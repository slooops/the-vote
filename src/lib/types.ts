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
  nominated_by_token: string;
  nominated_by_name: string;
  created_at: string;
}

export interface Vote {
  id: string;
  session_id: string;
  voter_token: string;
  voter_name: string;
  gold_nomination_id: string | null;
  silver_nomination_id: string | null;
  bronze_nomination_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NominationWithScore extends Nomination {
  score: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
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
}
