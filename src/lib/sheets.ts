// All Sheets requests go through /api/sheets (Vercel proxy)
// The actual Sheets URL never leaves the server

export interface SheetUser {
  roblox_user_id: string;
  username: string;
  game_name: string;
  execution_count: number;
  first_seen: string;
  last_seen: string;
  hwid: string;
  fingerprint: string;
  ip_address: string;
}

export interface SheetsSummary {
  total_executions: number;
  unique_users: number;
  last_updated: string;
}

export async function fetchSheetUsers(): Promise<SheetUser[]> {
  try {
    const res = await fetch('/api/sheets?action=getUsers');
    if (!res.ok) return [];
    const data = await res.json();
    return data.users ?? [];
  } catch {
    return [];
  }
}

export async function fetchSheetsSummary(): Promise<SheetsSummary | null> {
  try {
    const res = await fetch('/api/sheets?action=getSummary');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
