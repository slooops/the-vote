import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const OL_BASE = "https://openlibrary.org";

// GET /api/search?q=xxx&type=movie|book
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const type = req.nextUrl.searchParams.get("type") || "movie";

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  if (type === "movie") {
    return searchMovies(query);
  } else {
    return searchBooks(query);
  }
}

async function searchMovies(query: string) {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "TMDB search failed" }, { status: 500 });
  }

  const data = await res.json();
  const results = data.results.slice(0, 8).map(
    (m: { id: number; title: string; overview: string; poster_path: string | null; release_date: string }) => ({
      id: `tmdb-${m.id}`,
      title: m.title,
      year: m.release_date ? m.release_date.slice(0, 4) : "",
      poster_url: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
      synopsis: m.overview || "",
      tmdb_id: m.id,
    })
  );

  return NextResponse.json(results);
}

async function searchBooks(query: string) {
  const res = await fetch(
    `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median`
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Open Library search failed" }, { status: 500 });
  }

  const data = await res.json();
  const results = data.docs.slice(0, 8).map(
    (b: { key: string; title: string; author_name?: string[]; cover_i?: number; first_publish_year?: number; number_of_pages_median?: number }) => ({
      id: `ol-${b.key}`,
      title: b.title,
      year: b.first_publish_year ? String(b.first_publish_year) : "",
      poster_url: b.cover_i
        ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
        : null,
      synopsis: "",
      author: b.author_name?.[0] || "Unknown Author",
      openlibrary_key: b.key,
      pages: b.number_of_pages_median || undefined,
    })
  );

  return NextResponse.json(results);
}
