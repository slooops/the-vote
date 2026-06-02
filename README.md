# The Vote 🗳️

Ranked choice voting for book clubs and movie nights. Share a link, nominate picks, vote Gold/Silver/Bronze, see live results.

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS** + **Framer Motion**
- **Neon Postgres** for persistence
- **TMDB API** for movie posters, synopses, and streaming availability
- **Open Library API** for book covers and author data
- **Gemini 2.0 Flash** for AI-powered synopsis generation and corrections

## How It Works

1. **Admin creates a session** — picks Movie Night or Book Club, gets an admin link + shareable voter link
2. **Friends open the link** — set a nickname, browse existing nominations, search and nominate their pick
3. **Admin closes nominations, opens voting** — everyone ranks their top picks (Gold = 3pts, Silver = 2pts, Bronze = 1pt)
4. **Live results** update as votes come in. Admin closes voting to lock in the winner

## Setup

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `TMDB_API_KEY` | TMDB API key (free at themoviedb.org) |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 read access token |
| `GEMINI_API_KEY` | Google Gemini API key |

## Deploy

Deploy to Vercel — set env vars in the dashboard or via `vercel env`.
