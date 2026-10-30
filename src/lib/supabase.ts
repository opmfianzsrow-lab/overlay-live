import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

export const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://ddznezhftcwmftdrnyso.supabase.co';
  return typeof url === 'string' ? url.trim() : 'https://ddznezhftcwmftdrnyso.supabase.co';
};

export const getSupabaseAnonKey = (): string => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
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
        'Supabase belum terkonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada file .env Anda.',
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
      return { error: error.message };
    }

    const user = data.user;
    const session = data.session;

    // Check if Supabase returned zero identities (means email is already registered)
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      return {
        error: 'Email ini sudah terdaftar di Supabase Auth. Silakan masuk menggunakan menu Login atau gunakan fitur Lupa Password.',
      };
    }

    // If user created but session is missing, Email Confirmation is active in Supabase Console
    const needVerification = Boolean(user && !session);

    return {
      user,
      session,
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
): Promise<{ user?: User | null; session?: Session | null; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada file .env.',
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
      return { error: error.message };
    }

    return {
      user: data.user,
      session: data.session,
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


