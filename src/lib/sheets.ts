import { supabase } from './supabase';

// Fetches the Apps Script webhook ID from Supabase config
// then constructs the URL at runtime — never hardcoded
async function getWebhookUrl(): Promise<string | null> {
  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'sheets_webhook')
    .maybeSingle();
  if (!data?.value) return null;
  return `https://script.google.com/macros/s/${data.value}/exec`;
}

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

// GET all users from Sheets via Apps Script
export async function fetchSheetUsers(): Promise<SheetUser[]> {
  try {
    const url = await getWebhookUrl();
    if (!url) return [];
    const res = await fetch(`${url}?action=getUsers`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.users ?? [];
  } catch {
    return [];
  }
}

// GET summary (total executions, unique users) from Sheets
export async function fetchSheetsSummary(): Promise<SheetsSummary | null> {
  try {
    const url = await getWebhookUrl();
    if (!url) return null;
    const res = await fetch(`${url}?action=getSummary`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
