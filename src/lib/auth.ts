import { supabase } from './supabase';

export type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
};

const toEmail = (u: string) => `${u.trim().toLowerCase()}@vhx.local`;

export function isUsernameVhxReserved(username: string): boolean {
  const lower = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const isVhx = lower.includes('vhx');
  const isAllowed = lower === 'vhxluamax' || lower === 'vhxlua-max' || lower === 'vhxluamax';
  return isVhx && !isAllowed;
}

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (isUsernameVhxReserved(username)) {
    return { success: false, error: 'This username is reserved and cannot be registered.' };
  }
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
  // Query user_roles table for existing username — avoids Supabase auth enumeration protection
  const { data } = await supabase
    .from('user_roles')
    .select('username')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  if (data) return false; // found in user_roles = taken
  // Also check admins metadata via a safe signup probe
  const { error } = await supabase.auth.signUp({
    email: toEmail(username),
    password: Math.random().toString(36) + Math.random().toString(36),
    options: { data: { username: username.trim().toLowerCase() } },
  });
  if (error?.message?.toLowerCase().includes('already registered')) return false;
  return true;
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

export async function loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://vhxdashboard.vercel.app' },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function loginWithDiscord(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: 'https://vhxdashboard.vercel.app',
      scopes: 'identify email',
    },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function sendVerificationOTP(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });
  // Supabase returns error if email not found — treat as success to avoid enumeration
  if (error && !error.message.toLowerCase().includes('not found') && !error.message.toLowerCase().includes('rate')) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function verifyOTPAndResetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'email',
  });
  if (verifyErr) return { success: false, error: 'Invalid or expired code.' };
  const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
  if (pwErr) return { success: false, error: pwErr.message };
  return { success: true };
}

export async function updateUserEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function logout() {
  await supabase.auth.signOut();
}
