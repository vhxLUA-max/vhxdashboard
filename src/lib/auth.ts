import { supabase } from './supabase';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
};

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@vhx.local`;
}

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { success: false, error: 'Username already taken.' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) return { success: false, error: 'Invalid username or password.' };
  return { success: true };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthState> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { isLoggedIn: false, username: null };
  const username = session.user.user_metadata?.username ?? session.user.email?.replace('@vhx.local', '') ?? null;
  return { isLoggedIn: true, username };
}
