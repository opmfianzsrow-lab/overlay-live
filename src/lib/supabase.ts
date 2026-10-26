import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ddznezhftcwmftdrnyso.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_ueUrs8_po2mt8nZwMaih0w_pT0MR6ImSSS';

export const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  return typeof url === 'string' ? url.trim() : DEFAULT_SUPABASE_URL;
};

export const getSupabaseAnonKey = (): string => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return typeof key === 'string' ? key.trim() : DEFAULT_SUPABASE_ANON_KEY;
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('your-project') &&
    !key.includes('your-supabase-anon-key')
  );
};

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
 * Validates email address format
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Registers a new streamer account with Email & Password in Supabase Auth
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ user?: User | null; session?: Session | null; needEmailVerification?: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi dengan benar. Harap periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada environment variables Anda.',
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
    return { error: translateAuthError(error.message) };
  }

  let user = data.user;
  let session = data.session;

  // Check if Supabase returned zero identities (means email is already registered)
  if (user && Array.isArray(user.identities) && user.identities.length === 0) {
    const signInRes = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInRes.data?.user) {
      return {
        user: signInRes.data.user,
        session: signInRes.data.session,
      };
    }
    return {
      error: 'Email ini sudah terdaftar di Supabase Auth. Silakan masuk menggunakan menu Login.',
    };
  }

  // If user created but session is missing, attempt direct sign in (if Confirm Email is disabled in Supabase)
  if (user && !session) {
    const signInRes = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInRes.data?.session) {
      session = signInRes.data.session;
      user = signInRes.data.user || user;
    }
  }

  const needVerification = Boolean(user && !session);

  return {
    user,
    session,
    needEmailVerification: needVerification,
  };
}

/**
 * Logs in an existing streamer with Email & Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user?: User | null; session?: Session | null; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi dengan benar. Harap periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.',
    };
  }

  const cleanEmail = email.trim();

  if (!isValidEmail(cleanEmail)) {
    return { error: 'Format alamat email tidak valid.' };
  }
  if (!password) {
    return { error: 'Password wajib diisi.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return {
    user: data.user,
    session: data.session,
  };
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
      error: 'Supabase belum terkonfigurasi. Silakan periksa environment variables Anda.',
    };
  }

  const cleanEmail = email.trim();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'http://localhost:3000/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    return { success: false, error: translateAuthError(error.message) };
  }

  return {
    success: true,
    message:
      'Link reset password telah dikirim ke email Anda! Harap periksa folder Inbox atau Spam (pastikan konfigurasi SMTP di Supabase Auth sudah aktif).',
  };
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
      error: 'Supabase belum terkonfigurasi dengan benar.',
    };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password baru minimal harus 6 karakter.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: translateAuthError(error.message) };
  }

  return { success: true };
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
    lower.includes('disabled') ||
    lower.includes('provider is disabled') ||
    lower.includes('email provider is disabled') ||
    lower.includes('signup is disabled')
  ) {
    return 'Email Auth Provider di Supabase Console masih NON-AKTIF (DISABLED). Buka Supabase Dashboard > Authentication > Sign In / Providers > Email, lalu klik "Enable Email provider" dan simpan.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Email atau password yang Anda masukkan salah. Jika akun baru saja dibuat, pastikan Email Auth Provider sudah ENABLED dan opsi "Confirm email" dimatikan di Supabase Dashboard.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan masuk dengan menu Login atau gunakan Lupa Password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Silakan cek inbox/spam email Anda, atau matikan opsi "Confirm email" di Supabase Console -> Authentication -> Providers -> Email.';
  }
  if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit')) {
    return 'Terlalu banyak permintaan pengiriman email (Rate Limit). Harap tunggu beberapa menit atau matikan "Confirm email" di Supabase Console.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password minimal harus 6 karakter.';
  }
  return msg;
}

