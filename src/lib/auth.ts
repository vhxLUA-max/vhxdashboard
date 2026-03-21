import { supabase } from './supabase';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
};

const toEmail = (u: string) => `${u.trim().toLowerCase()}@vhx.local`;

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  });
  if (error) return { success: false, error: error.message.includes('already') ? 'Username already taken.' : error.message };
  return { success: true };
}

export async function login(usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> {
  const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim().toLowerCase() : toEmail(usernameOrEmail);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: 'Invalid username or password.' };
  return { success: true };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const email = toEmail(username);
  const { error } = await supabase.auth.signInWithPassword({ email, password: '___invalid___' });
  return error?.message?.includes('Invalid') ?? true;
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

export async function loginWithDiscord(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin,
      scopes: 'identify email',
    },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function logout() {
  await supabase.auth.signOut();
}
