import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { DEFAULT_OVERLAY_COLORS, type UserProfile, type OverlaySettings } from '../types/queue';

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
 * Helper to validate UUID format
 */
export function isUUID(val: string): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  );
}

/**
 * Wraps a promise with a hard timeout (default 10s)
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = 10000,
  contextMsg = 'Proses Supabase'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `[TIMEOUT 10s] ${contextMsg} melebihi batas waktu 10 detik. Silakan periksa koneksi jaringan atau RLS Supabase.`
        )
      );
    }, timeoutMs);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Ensures streamer has an active overlay token and overlay settings in Supabase.
 * Automatically backfills and repairs missing tokens or settings rows.
 */
export async function ensureUserOverlayTokenAndSettings(profileId: string): Promise<{
  streamer_token: string;
  webhook_key: string;
  error?: string;
}> {
  if (!supabase) {
    const fallbackTok = '1v1_' + profileId.slice(-8);
    const fallbackKey = 'sb_' + profileId.slice(-8);
    return { streamer_token: fallbackTok, webhook_key: fallbackKey };
  }

  let authUserId: string | null = null;
  try {
    const { data: authData } = await withTimeout(supabase.auth.getUser(), 5000, 'auth.getUser');
    if (authData?.user) {
      authUserId = authData.user.id;
    }
  } catch (e) {
    console.warn('[OBS Token Debug] Auth user lookup notice:', e);
  }

  console.log('[OBS Token Debug] Starting token verification:', {
    profileId,
    hasAuthUserId: Boolean(authUserId),
  });

  const idsToSearch = Array.from(
    new Set([profileId, authUserId].filter((x): x is string => Boolean(x) && typeof x === 'string' && x.trim().length > 0))
  );

  let streamerToken: string | null = null;
  let tokenQueryError: string | null = null;

  try {
    // 1. Fetch existing unrevoked token from overlay_tokens table
    console.log('[OBS Token Debug] Querying active token for user_id list:', idsToSearch);

    for (const searchId of idsToSearch) {
      const { data: tokData, error: tokErr } = await withTimeout(
        supabase
          .from('overlay_tokens')
          .select('token')
          .eq('user_id', searchId)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        10000,
        'overlay_tokens.select'
      );

      if (tokErr) {
        tokenQueryError = `[Code ${tokErr.code || 'RLS_ERR'}] ${tokErr.message}`;
        console.error('[OBS Token Debug] overlay_tokens query error:', {
          code: tokErr.code,
          message: tokErr.message,
          details: tokErr.details,
        });
      } else if (tokData?.token) {
        streamerToken = tokData.token;
        console.log(
          '[OBS Token Debug] Query result: FOUND active token:',
          streamerToken ? streamerToken.slice(0, 8) + '...' : ''
        );
        break;
      }
    }

    if (!streamerToken) {
      console.log('[OBS Token Debug] Query result: NOT_FOUND. Generating new token...');

      let randomUuid = '';
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        randomUuid = window.crypto.randomUUID();
      } else {
        const randomArr = new Uint8Array(16);
        if (typeof window !== 'undefined' && window.crypto) {
          window.crypto.getRandomValues(randomArr);
        } else {
          for (let i = 0; i < 16; i++) randomArr[i] = Math.floor(Math.random() * 256);
        }
        randomUuid = Array.from(randomArr)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      streamerToken = `1v1_${randomUuid}`;

      let insertSuccess = false;
      const insertCandidateIds = Array.from(
        new Set([profileId, authUserId].filter((x): x is string => Boolean(x) && typeof x === 'string' && x.trim().length > 0))
      );

      for (const targetId of insertCandidateIds) {
        console.log('[OBS Token Debug] Saving new token to overlay_tokens for target:', targetId);

        // Pre-seed profile row with targetId if missing to satisfy FK constraint 23503
        try {
          await supabase.from('profiles').upsert(
            {
              id: targetId,
              auth_user_id: authUserId || (isUUID(targetId) ? targetId : undefined),
              name: 'Streamer',
              email: '',
              role: 'streamer',
            },
            { onConflict: 'id' }
          );
        } catch (seedErr) {
          console.warn('[OBS Token Debug] Profile pre-seed notice:', seedErr);
        }

        const { error: insertTokErr } = await withTimeout(
          supabase.from('overlay_tokens').insert({
            user_id: targetId,
            token: streamerToken,
          }),
          10000,
          'overlay_tokens.insert'
        );

        if (!insertTokErr) {
          console.log('[OBS Token Debug] Token save result: SUCCESS for target:', targetId);
          insertSuccess = true;
          tokenQueryError = null;
          break;
        } else {
          console.warn('[OBS Token Debug] Token insert notice for target', targetId, ':', {
            code: insertTokErr.code,
            message: insertTokErr.message,
            details: insertTokErr.details,
          });
          if (insertTokErr.code !== '42501' && insertTokErr.code !== '23503') {
            tokenQueryError = `[Code ${insertTokErr.code || 'INSERT_ERR'}] ${insertTokErr.message}`;
          }
        }
      }
    }

    // 2. Fetch or update overlay_settings table
    let existingSettings: { id?: string; streamer_token?: string; webhook_key?: string } | null =
      null;

    for (const searchId of idsToSearch) {
      const { data: setArr, error: setErr } = await withTimeout(
        supabase
          .from('overlay_settings')
          .select('id, streamer_token, webhook_key')
          .eq('user_id', searchId)
          .maybeSingle(),
        10000,
        'overlay_settings.select'
      );

      if (setErr) {
        console.warn('[OBS Token Debug] overlay_settings query notice:', {
          code: setErr.code,
          message: setErr.message,
        });
      } else if (setArr) {
        existingSettings = setArr;
        break;
      }
    }

    let webhookKey = existingSettings?.webhook_key;
    if (!webhookKey) {
      const randomArr = new Uint8Array(8);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomArr);
      } else {
        for (let i = 0; i < 8; i++) randomArr[i] = Math.floor(Math.random() * 256);
      }
      webhookKey =
        'sb_' +
        Array.from(randomArr)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
    }

    if (!existingSettings) {
      console.log('[OBS Token Debug] Inserting row to overlay_settings...');
      const insertSettingsCandidateIds = Array.from(
        new Set([profileId, authUserId].filter((x): x is string => Boolean(x) && typeof x === 'string' && x.trim().length > 0))
      );

      for (const targetId of insertSettingsCandidateIds) {
        // Pre-seed profile row with targetId if missing to satisfy FK constraint 23503
        try {
          await supabase.from('profiles').upsert(
            {
              id: targetId,
              auth_user_id: authUserId || (isUUID(targetId) ? targetId : undefined),
              name: 'Streamer',
              email: '',
              role: 'streamer',
            },
            { onConflict: 'id' }
          );
        } catch (seedErr) {
          console.warn('[OBS Token Debug] Profile pre-seed notice (settings):', seedErr);
        }

        const { error: insertSetErr } = await withTimeout(
          supabase.from('overlay_settings').insert({
            user_id: targetId,
            streamer_token: streamerToken,
            webhook_key: webhookKey,
            title: 'ANTRIAN BY1',
            theme: 'obsidian',
            min_donation: 10000,
            vip_min_donation: 25000,
            vvip_min_donation: 50000,
          }),
          10000,
          'overlay_settings.insert'
        );

        if (!insertSetErr) {
          console.log('[OBS Token Debug] overlay_settings insert SUCCESS for target:', targetId);
          break;
        } else {
          console.warn('[OBS Token Debug] overlay_settings insert notice for target', targetId, ':', {
            code: insertSetErr.code,
            message: insertSetErr.message,
          });
        }
      }
    } else if (!existingSettings.streamer_token || existingSettings.streamer_token !== streamerToken) {
      console.log('[OBS Token Debug] Updating streamer_token in overlay_settings...');
      const updateCandidateIds = Array.from(
        new Set([profileId, authUserId].filter((x): x is string => Boolean(x) && typeof x === 'string' && x.trim().length > 0))
      );
      for (const updateId of updateCandidateIds) {
        try {
          await withTimeout(
            supabase
              .from('overlay_settings')
              .update({
                streamer_token: streamerToken,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', updateId),
            10000,
            'overlay_settings.update'
          );
        } catch (e) {
          console.warn('[OBS Token Debug] overlay_settings update notice:', e);
        }
      }
    }

    return {
      streamer_token: streamerToken,
      webhook_key: webhookKey,
      error: tokenQueryError || undefined,
    };
  } catch (err: unknown) {
    const errMsg =
      err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memproses token Supabase';
    console.error('[OBS Token Debug] Exception caught in ensureUserOverlayTokenAndSettings:', errMsg);
    return {
      streamer_token: '1v1_' + profileId.slice(-8),
      webhook_key: 'sb_' + profileId.slice(-8),
      error: errMsg,
    };
  }
}

/**
 * Regenerates a brand new OBS streamer token for the user in Supabase.
 * Revokes all previous active tokens in overlay_tokens and updates overlay_settings.
 */
export async function regenerateOverlayTokenInSupabase(profileId: string): Promise<{
  streamer_token: string;
}> {
  const now = new Date().toISOString();

  let randomUuid = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    randomUuid = window.crypto.randomUUID();
  } else {
    const randomArr = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomArr);
    } else {
      for (let i = 0; i < 16; i++) randomArr[i] = Math.floor(Math.random() * 256);
    }
    randomUuid = Array.from(randomArr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const newToken = `1v1_${randomUuid}`;

  if (!supabase) {
    return { streamer_token: newToken };
  }

  try {
    // 1. Revoke existing active tokens for this user in overlay_tokens
    await withTimeout(
      supabase
        .from('overlay_tokens')
        .update({ revoked_at: now })
        .eq('user_id', profileId)
        .is('revoked_at', null),
      10000,
      'overlay_tokens.revoke'
    ).catch((e) => console.warn('[Supabase Token Revoke Notice]', e));

    // 2. Insert new active token into overlay_tokens
    await withTimeout(
      supabase.from('overlay_tokens').insert({
        user_id: profileId,
        token: newToken,
        created_at: now,
      }),
      10000,
      'overlay_tokens.insertNew'
    ).catch((e) => console.warn('[Supabase Token Insert Notice]', e));

    // 3. Update overlay_settings table streamer_token
    await withTimeout(
      supabase
        .from('overlay_settings')
        .update({
          streamer_token: newToken,
          updated_at: now,
        })
        .eq('user_id', profileId),
      10000,
      'overlay_settings.updateToken'
    ).catch((e) => console.warn('[Supabase Settings Token Update Notice]', e));

    return { streamer_token: newToken };
  } catch (err) {
    console.error('[Supabase Token Regenerate Exception]', err);
    return { streamer_token: newToken };
  }
}

/**
 * Gets overlay settings directly from Supabase with automatic token repair
 */
export async function getOverlaySettingsFromSupabase(
  profileIdOrAuthId: string
): Promise<{ settings: OverlaySettings | null; error?: string }> {
  if (!supabase || !profileIdOrAuthId) {
    return { settings: null, error: 'Supabase client belum terkonfigurasi' };
  }

  try {
    let profileId = profileIdOrAuthId;
    let profName: string | undefined = undefined;

    // Safely query profiles table without invalid UUID syntax errors
    if (isUUID(profileIdOrAuthId)) {
      const { data: prof, error: profErr } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, auth_user_id, name')
          .or(`id.eq.${profileIdOrAuthId},auth_user_id.eq.${profileIdOrAuthId}`)
          .maybeSingle(),
        10000,
        'profiles.select.uuid'
      );
      if (profErr) {
        console.error('[OBS Token Debug] profiles query error:', profErr.message);
      } else if (prof) {
        profileId = prof.id;
        profName = prof.name;
      }
    } else {
      const { data: prof, error: profErr } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, auth_user_id, name')
          .eq('id', profileIdOrAuthId)
          .maybeSingle(),
        10000,
        'profiles.select.text'
      );
      if (profErr) {
        console.error('[OBS Token Debug] profiles text query error:', profErr.message);
      } else if (prof) {
        profileId = prof.id;
        profName = prof.name;
      }
    }

    // Ensure token & settings exist with 10s max timeout
    const tokenRes = await ensureUserOverlayTokenAndSettings(profileId);
    const { streamer_token, webhook_key, error: tokenErr } = tokenRes;

    // Fetch full overlay_settings row
    const idsToSearch = Array.from(new Set([profileId, profileIdOrAuthId].filter(Boolean)));
    let settingsRow: OverlaySettings | null = null;

    for (const searchId of idsToSearch) {
      const { data: sRow, error: sErr } = await withTimeout(
        supabase
          .from('overlay_settings')
          .select('*')
          .eq('user_id', searchId)
          .maybeSingle(),
        10000,
        'overlay_settings.selectFull'
      );

      if (sErr) {
        console.error('[OBS Token Debug] overlay_settings full query error:', sErr.message);
      } else if (sRow) {
        settingsRow = sRow as OverlaySettings;
        break;
      }
    }

    if (settingsRow) {
      return {
        settings: {
          ...settingsRow,
          streamer_name: profName || settingsRow.streamer_name,
          streamer_token: settingsRow.streamer_token || streamer_token,
          webhook_key: settingsRow.webhook_key || webhook_key,
          animation_speed: settingsRow.animation_speed || 'normal',
          dashboard_ui_theme: settingsRow.dashboard_ui_theme || 'neobrutalism',
          custom_colors: {
            ...DEFAULT_OVERLAY_COLORS,
            ...(typeof settingsRow.custom_colors === 'object' && settingsRow.custom_colors !== null ? settingsRow.custom_colors : {}),
          },
        } as OverlaySettings,
        error: tokenErr,
      };
    }

    // Fallback constructed settings
    return {
      settings: {
        id: 'set_' + profileId,
        user_id: profileId,
        streamer_name: profName,
        streamer_token: streamer_token,
        webhook_key: webhook_key,
        title: 'ANTRIAN BY1',
        theme: 'obsidian',
        font_size: 'medium',
        max_visible_players: 5,
        animation: 'smooth',
        opacity: 96,
        card_size: 'normal',
        spacing: 8,
        sociabuzz_url: 'https://sociabuzz.com',
        min_donation: 10000,
        vip_min_donation: 25000,
        vvip_min_donation: 50000,
        max_queue_limit: 50,
        sound_alert: true,
        allow_free_queue: false,
        live_badge_text: 'LIVE',
        hide_playing_in_overlay: false,
        panel_width: 440,
        show_id: true,
        show_vip_badge: true,
        show_live_badge: true,
        border_radius: 22,
        enable_animation: true,
        animation_speed: 'normal',
        dashboard_ui_theme: 'neobrutalism',
        allow_promotion: false,
        custom_colors: { ...DEFAULT_OVERLAY_COLORS },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as OverlaySettings,
      error: tokenErr,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Gagal mengambil overlay settings dari Supabase';
    console.error('[Supabase getOverlaySettings Error]', msg);
    return { settings: null, error: msg };
  }
}

/**
 * Whitelist of columns present in public.overlay_settings table.
 * Includes custom_colors (JSONB), animation_speed (TEXT), and dashboard_ui_theme (TEXT).
 */
export const SUPABASE_OVERLAY_SETTINGS_COLUMNS = [
  'title',
  'theme',
  'font_size',
  'max_visible_players',
  'animation',
  'opacity',
  'card_size',
  'spacing',
  'sociabuzz_url',
  'min_donation',
  'vip_min_donation',
  'vvip_min_donation',
  'max_queue_limit',
  'sound_alert',
  'allow_free_queue',
  'live_badge_text',
  'hide_playing_in_overlay',
  'panel_width',
  'show_id',
  'show_vip_badge',
  'show_live_badge',
  'border_radius',
  'enable_animation',
  'allow_promotion',
  'webhook_key',
  'webhook_secret',
  'streamer_token',
  'custom_colors',
  'animation_speed',
  'dashboard_ui_theme',
] as const;

export function filterSupabaseOverlaySettings(raw: Partial<OverlaySettings>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const col of SUPABASE_OVERLAY_SETTINGS_COLUMNS) {
    if (raw[col] !== undefined) {
      if (col === 'custom_colors') {
        if (typeof raw.custom_colors === 'object' && raw.custom_colors !== null) {
          filtered.custom_colors = raw.custom_colors;
        }
      } else if (col === 'animation_speed') {
        filtered.animation_speed = String(raw.animation_speed);
      } else if (col === 'dashboard_ui_theme') {
        filtered.dashboard_ui_theme = String(raw.dashboard_ui_theme);
      } else {
        filtered[col] = raw[col];
      }
    }
  }
  return filtered;
}

/**
 * Persists overlay settings to Supabase with column whitelisting, error checking, and profile name syncing.
 * Handles both post-migration (persisting custom_colors, animation_speed, dashboard_ui_theme directly to Supabase)
 * and graceful fallback if the SQL migration has not yet been executed in Supabase SQL Editor.
 */
export async function saveOverlaySettingsToSupabase(
  profileIdOrAuthId: string,
  updates: Partial<OverlaySettings>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !profileIdOrAuthId) {
    return { success: false, error: 'Supabase client belum terkonfigurasi atau User ID tidak valid.' };
  }

  try {
    const payload = filterSupabaseOverlaySettings(updates);
    payload.updated_at = new Date().toISOString();

    // 1. Sync streamer_name to profiles table if present
    if (updates.streamer_name && typeof updates.streamer_name === 'string' && updates.streamer_name.trim().length > 0) {
      const cleanName = updates.streamer_name.trim();
      const targetQuery = isUUID(profileIdOrAuthId)
        ? supabase.from('profiles').update({ name: cleanName, updated_at: new Date().toISOString() }).or(`id.eq.${profileIdOrAuthId},auth_user_id.eq.${profileIdOrAuthId}`)
        : supabase.from('profiles').update({ name: cleanName, updated_at: new Date().toISOString() }).eq('id', profileIdOrAuthId);

      const { error: profErr } = await targetQuery;
      if (profErr) {
        console.warn('[Supabase Profiles Update Notice]', profErr.message);
      }
    }

    // 2. Try updating overlay_settings by user_id
    const idsToSearch = Array.from(new Set([profileIdOrAuthId].filter(Boolean)));
    let updateSuccess = false;
    let lastError: string | undefined = undefined;

    for (const searchId of idsToSearch) {
      let { data, error } = await supabase
        .from('overlay_settings')
        .update(payload)
        .eq('user_id', searchId)
        .select('id');

      // Graceful fallback if database schema does not have new columns yet (Postgres code 42703)
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        console.warn(
          '[Supabase Migration Notice] Columns custom_colors/animation_speed/dashboard_ui_theme not yet migrated in Supabase. Executing core update...'
        );
        const { custom_colors, animation_speed, dashboard_ui_theme, ...corePayload } = payload;
        const fallbackRes = await supabase
          .from('overlay_settings')
          .update(corePayload)
          .eq('user_id', searchId)
          .select('id');
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[Supabase overlay_settings update error]', error);
        lastError = error.message;
      } else if (data && data.length > 0) {
        updateSuccess = true;
        break;
      }
    }

    // 3. If update did not find an existing row, attempt upsert
    if (!updateSuccess) {
      const upsertId = idsToSearch[0];
      let { error: upsertErr } = await supabase
        .from('overlay_settings')
        .upsert({ ...payload, user_id: upsertId }, { onConflict: 'user_id' });

      // Fallback for upsert if columns missing
      if (upsertErr && (upsertErr.code === '42703' || upsertErr.message?.includes('does not exist'))) {
        console.warn(
          '[Supabase Migration Notice] Columns not yet in schema for upsert. Executing core upsert...'
        );
        const { custom_colors, animation_speed, dashboard_ui_theme, ...corePayload } = payload;
        const fallbackUpsertRes = await supabase
          .from('overlay_settings')
          .upsert({ ...corePayload, user_id: upsertId }, { onConflict: 'user_id' });
        upsertErr = fallbackUpsertRes.error;
      }

      if (upsertErr) {
        console.error('[Supabase overlay_settings upsert error]', upsertErr);
        return { success: false, error: upsertErr.message };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan ke database Supabase.';
    console.error('[Supabase saveOverlaySettings Exception]', msg);
    return { success: false, error: msg };
  }
}


/**
 * Synchronizes Supabase authenticated user with the public.profiles table.
 * - Queries profiles table for matching auth_user_id.
 * - If profile does not exist yet, creates the profile row safely.
 * - Always ensures an active overlay token and settings exist in Supabase for the user.
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

  const deterministicId = 'usr_' + authUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

  let profileRecord: UserProfile | null = null;

  if (supabase) {
    try {
      // 1. Fetch profile from Supabase profiles table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id, name, email, avatar_url, role, created_at, updated_at')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (existingProfile) {
        profileRecord = existingProfile as UserProfile;
        // Ensure profiles table also contains a row where id = authUserId to satisfy FK constraints for legacy profiles
        if (existingProfile.id !== authUserId) {
          try {
            await supabase.from('profiles').upsert(
              {
                id: authUserId,
                auth_user_id: authUserId,
                name: existingProfile.name || name,
                email: existingProfile.email || email,
                avatar_url: existingProfile.avatar_url || avatarUrl,
                role: existingProfile.role || 'streamer',
              },
              { onConflict: 'id' }
            );
          } catch (e) {
            console.warn('[Supabase Profile Sync] Legacy profile alias pre-seed notice:', e);
          }
        }
      } else {
        // 2. Profile missing: Safely insert profile record using authUserId as primary id
        const { data: inserted } = await supabase
          .from('profiles')
          .insert({
            id: authUserId,
            auth_user_id: authUserId,
            name,
            email,
            avatar_url: avatarUrl,
            role: 'streamer',
          })
          .select('id, auth_user_id, name, email, avatar_url, role, created_at, updated_at')
          .maybeSingle();

        if (inserted) {
          profileRecord = inserted as UserProfile;
        } else {
          // Fallback insert with deterministicId if authUserId insert failed
          const { data: fallbackInserted } = await supabase
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
          if (fallbackInserted) {
            profileRecord = fallbackInserted as UserProfile;
          }
        }
      }

      // 3. Guarantee active overlay token and settings exist in Supabase
      const targetProfileId = profileRecord ? profileRecord.id : authUserId;
      const { streamer_token } = await ensureUserOverlayTokenAndSettings(targetProfileId);

      if (profileRecord) {
        profileRecord.streamer_token = streamer_token;
      }
    } catch (err) {
      console.warn('[Supabase Profile Sync] Notice during profile/token sync:', err);
    }
  }

  const finalProfile: UserProfile = profileRecord || {
    id: deterministicId,
    auth_user_id: authUserId,
    email,
    name,
    avatar_url: avatarUrl,
    role: 'streamer',
    streamer_token: '1v1_' + deterministicId.slice(-8),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { profile: finalProfile };
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


