// Client-side user identity management via localStorage

export interface UserIdentity {
  token: string;
  nickname: string;
  hasSeenWelcome: boolean;
}

const STORAGE_KEY = "the-vote-user";

export function getUser(): UserIdentity | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setUser(user: UserIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export function markWelcomeSeen(): void {
  const user = getUser();
  if (user) {
    setUser({ ...user, hasSeenWelcome: true });
  }
}
