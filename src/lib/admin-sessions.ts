// Client-side admin session tracking via localStorage

export interface AdminSession {
  id: string;
  name: string;
  type: "movie" | "book";
  admin_token: string;
  created_at: string;
}

const STORAGE_KEY = "the-vote-admin-sessions";

export function getAdminSessions(): AdminSession[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveAdminSession(session: AdminSession): void {
  const sessions = getAdminSessions();
  // Replace if already exists (same id)
  const filtered = sessions.filter((s) => s.id !== session.id);
  filtered.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function removeAdminSession(id: string): void {
  const sessions = getAdminSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
