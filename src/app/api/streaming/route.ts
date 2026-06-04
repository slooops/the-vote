import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export interface StreamingService {
  name: string;
  logo: string | null;
  type: "free" | "rent" | "buy";
}

// GET /api/streaming?tmdb_id=xxx&services=Apple+TV%2B,Prime+Video,...
export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdb_id");
  const wantedServices = req.nextUrl.searchParams.get("services")?.split(",") || [];

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${tmdbId}/watch/providers`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "TMDB fetch failed" }, { status: 500 });
    }

    const data = await res.json();
    const usProviders = data.results?.US;

    if (!usProviders) {
      return NextResponse.json({ services: [], availability: "unavailable" });
    }

    // Categorize providers
    const flatrate = (usProviders.flatrate || []).map(
      (p: { provider_name: string; logo_path: string }) => ({
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        type: "free" as const,
      })
    );

    const free = (usProviders.free || []).map(
      (p: { provider_name: string; logo_path: string }) => ({
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        type: "free" as const,
      })
    );

    const rent: StreamingService[] = (usProviders.rent || []).map(
      (p: { provider_name: string; logo_path: string }) => ({
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        type: "rent" as const,
      })
    );

    const allServices: StreamingService[] = [...flatrate, ...free, ...rent];

    // Normalize names for matching — TMDB uses "Disney Plus", users say "Disney+"
    const ALIASES: Record<string, string[]> = {
      "disney+": ["disney plus", "disney+"],
      "apple tv+": ["apple tv plus", "apple tv+", "apple tv"],
      "prime video": ["amazon video", "prime video", "amazon prime"],
      "peacock": ["peacock", "peacock premium", "peacock free"],
      "hulu": ["hulu"],
      "netflix": ["netflix"],
      "hbo max": ["hbo max", "max", "max amazon channel"],
      "paramount+": ["paramount plus", "paramount+", "paramount plus premium", "paramount plus essential"],
    };

    const normalize = (name: string) => name.toLowerCase().trim();

    const matchesService = (providerName: string) => {
      const pn = normalize(providerName);
      return wantedServices.some((ws) => {
        const wn = normalize(ws);
        // Direct match
        if (pn.includes(wn) || wn.includes(pn)) return true;
        // Check aliases — if the wanted service has known aliases, check against those
        const aliases = ALIASES[wn];
        if (aliases) return aliases.some((a) => pn.includes(a) || a.includes(pn));
        // Check reverse — if the provider name has known aliases
        for (const [key, vals] of Object.entries(ALIASES)) {
          if (vals.some((v) => pn.includes(v) || v.includes(pn))) {
            if (key === wn || wn.includes(key) || key.includes(wn)) return true;
          }
        }
        return false;
      });
    };

    const freeOnWanted = [...flatrate, ...free].filter((s) => matchesService(s.name));
    const rentOnWanted = rent.filter((s) => matchesService(s.name));

    let availability: "free" | "rent" | "unavailable" = "unavailable";
    if (freeOnWanted.length > 0) {
      availability = "free";
    } else if (rentOnWanted.length > 0) {
      availability = "rent";
    }

    return NextResponse.json({
      services: allServices,
      freeOn: freeOnWanted.map((s) => s.name),
      rentOn: rentOnWanted.map((s) => s.name),
      availability,
    });
  } catch {
    return NextResponse.json({ services: [], availability: "unavailable" });
  }
}
