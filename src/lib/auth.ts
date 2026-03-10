import { supabase } from './supabase';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
};

export async function register(email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { success: false, error: 'Email already registered.' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { success: false, error: 'Invalid email or password.' };
  return { success: true };
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}?reset=true`,
  });
  if (error) return { success: false, error: error.message };
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
