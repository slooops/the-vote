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

    // Determine availability status relative to wanted services
    const matchesService = (providerName: string) =>
      wantedServices.some(
        (ws) =>
          providerName.toLowerCase().includes(ws.toLowerCase()) ||
          ws.toLowerCase().includes(providerName.toLowerCase())
      );

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
