import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types/queue';

export const getSupabaseUrl = (): string => {
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_URL
      : undefined;
  const url = envUrl || 'https://ddznezhftcwmftdrnyso.supabase.co';
  return typeof url === 'string' ? url.trim() : 'https://ddznezhftcwmftdrnyso.supabase.co';
};

export const getSupabaseAnonKey = (): string => {
  const envKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : undefined;
  const key =
    envKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkem5lemhmdGN3bWZ0ZHJueXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDAzMTgsImV4cCI6MjEwODU3NjMxOH0.XEUvnliZN_7VJhHDHv_DPrtUO6Q81EkYpsPNZulz3rI';
  return typeof key === 'string' ? key.trim() : '';
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && url.length > 0 && key && key.length > 0);
};

// Safe debug logging (NO full keys printed)
if (typeof window !== 'undefined') {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  console.log('[Supabase Config Debug]', {
    url,
    hasKey: Boolean(key),
    keyPrefix: key ? key.slice(0, 15) + '...' : 'MISSING',
  });
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Performs lightweight diagnostic check against Supabase
 */
export async function testSupabaseConnection(): Promise<{
  urlAvailable: boolean;
  keyAvailable: boolean;
  keyPrefix: string;
  clientCreated: boolean;
  pingSuccess: boolean;
  pingMessage: string;
}> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const urlAvailable = Boolean(url && url.length > 0);
  const keyAvailable = Boolean(key && key.length > 0);
  const keyPrefix = key ? key.slice(0, 15) + '...' : 'MISSING';
  const clientCreated = Boolean(supabase);

  if (!supabase || !urlAvailable || !keyAvailable) {
    return {
      urlAvailable,
      keyAvailable,
      keyPrefix,
      clientCreated,
      pingSuccess: false,
      pingMessage: 'Supabase client belum terinisialisasi (URL atau Key kosong).',
    };
  }

  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return {
        urlAvailable,
        keyAvailable,
        keyPrefix,
        clientCreated,
        pingSuccess: false,
        pingMessage: error.message,
      };
    }
    return {
      urlAvailable,
      keyAvailable,
      keyPrefix,
      clientCreated,
      pingSuccess: true,
      pingMessage: 'Koneksi ke Supabase Auth API berhasil!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghubungi server Supabase.';
    return {
      urlAvailable,
      keyAvailable,
      keyPrefix,
      clientCreated,
      pingSuccess: false,
      pingMessage: msg,
    };
  }
}

/**
 * Validates email address format
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export interface SupabaseAuthResult {
  user?: UserProfile | null;
  authUser?: User | null;
  session?: Session | null;
  sessionToken?: string;
  needEmailVerification?: boolean;
  error?: string;
  rawError?: string;
}

/**
 * Synchronizes Supabase authenticated user with the public.profiles table.
 * - Queries profiles table for matching auth_user_id.
 * - If profile does not exist yet (e.g. trigger skipped or delay), creates the profile row safely.
 * - Handles conflict without duplicate errors and never crashes the login flow.
 */
export async function syncUserProfile(authUser: User): Promise<{
  profile: UserProfile;
  error?: string;
}> {
  const authUserId = authUser.id;
  const email = authUser.email || '';
  const name =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split('@')[0] ||
    'Streamer';
  const avatarUrl =
    authUser.user_metadata?.avatar_url ||
    authUser.user_metadata?.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${authUserId}`;

  // Deterministic user ID for profile (e.g. usr_ + auth UUID hex)
  const deterministicId = 'usr_' + authUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

  const fallbackProfile: UserProfile = {
    id: deterministicId,
    auth_user_id: authUserId,
    email,
    name,
    avatar_url: avatarUrl,
    role: 'streamer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!supabase) {
    return { profile: fallbackProfile };
  }

  try {
    // 1. Fetch profile from Supabase profiles table for this authenticated user
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, name, email, avatar_url, role, created_at, updated_at')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (selectError) {
      console.warn('[Supabase Profile Sync] Notice on profiles SELECT:', selectError.message);
    }

    if (existingProfile) {
      const typedProfile = existingProfile as UserProfile;
      return { profile: typedProfile };
    }

    // 2. Profile missing: Safely insert profile record
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: deterministicId,
        auth_user_id: authUserId,
        name,
        email,
        avatar_url: avatarUrl,
        role: 'streamer',
      })
      .select('id, auth_user_id, name, email, avatar_url, role, created_at, updated_at')
      .maybeSingle();

    if (insertError) {
      console.warn('[Supabase Profile Sync] Notice on profiles INSERT:', insertError.message);
      // If error is duplicate/conflict (e.g. concurrent trigger), query one more time
      const { data: retryProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id, name, email, avatar_url, role, created_at, updated_at')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (retryProfile) {
        return { profile: retryProfile as UserProfile };
      }
    }

    const finalProfile: UserProfile = (inserted as UserProfile) || fallbackProfile;

    // 3. Ensure streamer has active overlay token & settings
    try {
      const { data: existingToken } = await supabase
        .from('overlay_tokens')
        .select('token')
        .eq('user_id', finalProfile.id)
        .maybeSingle();

      let streamerToken = existingToken?.token;
      if (!streamerToken) {
        streamerToken = '1v1_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        await supabase
          .from('overlay_tokens')
          .insert({
            user_id: finalProfile.id,
            token: streamerToken,
          })
          .catch(() => null);
      }

      const { data: existingSettings } = await supabase
        .from('overlay_settings')
        .select('id')
        .eq('user_id', finalProfile.id)
        .maybeSingle();

      if (!existingSettings) {
        const webhookKey = 'sb_' + Math.random().toString(36).substring(2, 10);
        await supabase
          .from('overlay_settings')
          .insert({
            user_id: finalProfile.id,
            streamer_token: streamerToken,
            webhook_key: webhookKey,
            title: 'ANTRIAN BY1',
            theme: 'obsidian',
            min_donation: 10000,
            vip_min_donation: 25000,
            vvip_min_donation: 50000,
          })
          .catch(() => null);
      }
    } catch (auxErr) {
      console.warn('[Supabase Profile Sync] Aux token/settings non-fatal notice:', auxErr);
    }

    return { profile: finalProfile };
  } catch (err) {
    console.error('[Supabase Profile Sync] Non-blocking exception during profile sync:', err);
    return { profile: fallbackProfile };
  }
}

/**
 * Registers a new streamer account with Email & Password in Supabase Auth
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada pengaturan environment variables Anda.',
    };
  }

  const cleanEmail = email.trim();
  const cleanName = fullName.trim();

  if (!cleanName) {
    return { error: 'Nama streamer/lengkap wajib diisi.' };
  }
  if (!isValidEmail(cleanEmail)) {
    return { error: 'Format alamat email tidak valid.' };
  }
  if (!password || password.length < 6) {
    return { error: 'Password minimal harus 6 karakter.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
        },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] signUp raw error:', error.message);
      return { error: translateAuthError(error.message), rawError: error.message };
    }

    const authUser = data.user;
    const session = data.session;

    // Check if Supabase returned zero identities (means email is already registered)
    if (authUser && Array.isArray(authUser.identities) && authUser.identities.length === 0) {
      return {
        error:
          'Email ini sudah terdaftar di Supabase Auth. Silakan masuk menggunakan menu Login atau gunakan fitur Lupa Password.',
      };
    }

    const needVerification = Boolean(authUser && !session);

    let profile: UserProfile | undefined = undefined;
    let sessionToken: string | undefined = undefined;

    if (authUser && session) {
      const syncRes = await syncUserProfile(authUser);
      profile = syncRes.profile;
      sessionToken = session.access_token;
    }

    return {
      user: profile,
      authUser,
      session,
      sessionToken,
      needEmailVerification: needVerification,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan jaringan atau koneksi Supabase.';
    console.error('[Supabase Auth] signUp exception:', errorMsg);
    return { error: errorMsg };
  }
}

/**
 * Logs in an existing streamer with Email & Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada konfigurasi environment variables Anda.',
    };
  }

  const cleanEmail = email.trim();

  if (!isValidEmail(cleanEmail)) {
    return { error: 'Format alamat email tidak valid.' };
  }
  if (!password) {
    return { error: 'Password wajib diisi.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.warn('[Supabase Auth] signIn raw error:', error.message);
      return {
        error: translateAuthError(error.message),
        rawError: error.message,
      };
    }

    if (!data.user || !data.session) {
      return {
        error: 'Sesi login tidak ditemukan. Harap periksa email dan password Anda.',
      };
    }

    // Direct synchronization with Supabase profiles table
    const { profile } = await syncUserProfile(data.user);
    const sessionToken = data.session.access_token;

    return {
      user: profile,
      authUser: data.user,
      session: data.session,
      sessionToken,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan jaringan atau koneksi Supabase.';
    console.error('[Supabase Auth] signIn exception:', errorMsg);
    return { error: errorMsg };
  }
}

/**
 * Sends a password reset link to user's email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Supabase belum terkonfigurasi dengan API key yang valid. Silakan periksa environment variables Anda.',
    };
  }

  const cleanEmail = email.trim();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : '/reset-password';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[Supabase Auth] resetPassword error:', error.message);
      return { success: false, error: translateAuthError(error.message) };
    }

    return {
      success: true,
      message:
        'Link reset password telah dikirim ke email Anda! Harap periksa folder Inbox atau Spam (pastikan konfigurasi SMTP di Supabase Auth sudah aktif).',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan jaringan atau koneksi Supabase.';
    return { success: false, error: translateAuthError(errorMsg) };
  }
}

/**
 * Updates user password (used in password reset flow)
 */
export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Supabase belum terkonfigurasi dengan API key yang valid.',
    };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password baru minimal harus 6 karakter.' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('[Supabase Auth] updateUser error:', error.message);
      return { success: false, error: translateAuthError(error.message) };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan jaringan atau koneksi Supabase.';
    return { success: false, error: translateAuthError(errorMsg) };
  }
}

/**
 * Real Supabase sign out
 */
export async function signOut(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase signOut error:', e);
    }
  }
  localStorage.removeItem('streamer_session_token');
  localStorage.removeItem('streamer_user_data');
  localStorage.removeItem('streamer_admin_pin');
}

/**
 * Helper to translate raw Supabase Auth errors into Indonesian
 */
function translateAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (
    lower.includes('invalid api key') ||
    lower.includes('api key') ||
    lower.includes('apikey')
  ) {
    return 'Kunci API Supabase tidak valid. Harap periksa VITE_SUPABASE_ANON_KEY atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY pada file .env dari Supabase Dashboard > Project Settings > API.';
  }
  if (
    lower.includes('disabled') ||
    lower.includes('provider is disabled') ||
    lower.includes('email provider is disabled') ||
    lower.includes('signup is disabled')
  ) {
    return 'Email Auth Provider di Supabase Console masih NON-AKTIF (DISABLED). Buka Supabase Dashboard > Authentication > Providers > Email, lalu aktifkan "Enable Email provider" dan simpan.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Email atau password yang Anda masukkan salah. Jika akun baru saja dibuat, pastikan Anda telah memverifikasi email atau periksa kredensial Anda.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Email ini sudah terdaftar di Supabase Auth. Silakan masuk menggunakan menu Login atau gunakan Lupa Password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Silakan cek inbox/spam email Anda untuk verifikasi, atau matikan opsi "Confirm email" di Supabase Dashboard -> Authentication -> Providers -> Email.';
  }
  if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit')) {
    return 'Terlalu banyak permintaan pengiriman email (Rate Limit). Harap tunggu beberapa menit sebelum mencoba lagi.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password minimal harus 6 karakter.';
  }
  return msg;
}


