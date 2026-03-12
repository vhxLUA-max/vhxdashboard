import { supabase } from './supabase';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
};

function toInternalEmail(username: string): string {
  return `${username.trim().toLowerCase()}@vhx.internal`;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('dashboard_users')
    .select('username')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  return !data;
}

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const email = toInternalEmail(username);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already')) return { success: false, error: 'Username already taken.' };
    return { success: false, error: signUpError.message };
  }
  if (signUpData.user) {
    await supabase.from('dashboard_users').upsert({
      id: signUpData.user.id,
      username: username.trim().toLowerCase(),
    });
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { success: false, error: 'Account created but could not sign in. Please try signing in.' };
  return { success: true };
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  if (error) return { success: false, error: 'Invalid username or password.' };
  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthState> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { isLoggedIn: false, username: null, email: null };
  return {
    isLoggedIn: true,
    username: session.user.user_metadata?.username ?? null,
    email: session.user.email ?? null,
  };
}
