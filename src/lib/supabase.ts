import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    supabaseUrl.startsWith('https://') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Initiates real Google OAuth flow with Supabase
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) {
    return {
      error:
        'Supabase belum terkonfigurasi. Harap masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env aplikasi.',
    };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
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
