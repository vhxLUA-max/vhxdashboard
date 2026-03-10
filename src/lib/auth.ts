import { supabase } from './supabase';

const SESSION_KEY = 'vhx_session';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
};

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('register_user', {
    p_username: username.trim().toLowerCase(),
    p_password: password,
  });
  if (error) return { success: false, error: 'Something went wrong. Try again.' };
  if (data === 'taken') return { success: false, error: 'Username is already taken.' };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: username.trim().toLowerCase() }));
  return { success: true };
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('check_user_login', {
    p_username: username.trim().toLowerCase(),
    p_password: password,
  });
  if (error || !data) return { success: false, error: 'Invalid username or password.' };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: username.trim().toLowerCase() }));
  return { success: true };
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { isLoggedIn: false, username: null };
    const parsed = JSON.parse(raw);
    return { isLoggedIn: true, username: parsed.username };
  } catch {
    return { isLoggedIn: false, username: null };
  }
}
