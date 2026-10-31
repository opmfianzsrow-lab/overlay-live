import React, { useState, useEffect, useCallback } from 'react';
import { OverlayView } from './components/OverlayView';
import { ViewerJoinView } from './components/ViewerJoinView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { Tv, Users, LayoutDashboard, LogOut } from 'lucide-react';
import type { UserProfile } from './types/queue';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppBackground } from './components/AppBackground';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { ThemeHeaderControls } from './components/ThemeHeaderControls';
import { supabase, signOut, syncUserProfile } from './lib/supabase';

function AppContent() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer_user_data');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [sessionToken, setSessionToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('streamer_session_token') : null
  );
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Sync Supabase Auth and validate session on mount
  useEffect(() => {
    let isMounted = true;

    async function syncAuth() {
      // 1. Check if Supabase client is available and has active session
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const user = session.user;
            let loggedInUser: UserProfile | null = null;
            let token: string = session.access_token || `sp_${user.id}`;

            try {
              const res = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  auth_user_id: user.id,
                  email: user.email,
                  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                  avatar_url: user.user_metadata?.avatar_url,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                loggedInUser = data.user;
                token = data.sessionToken;
              }
            } catch (err) {
              console.warn('[Auth] Express /api/auth/session check unreachable:', err);
            }

            if (!loggedInUser) {
              const { profile: directProfile } = await syncUserProfile(user);
              if (directProfile) {
                loggedInUser = {
                  id: directProfile.id || user.id,
                  auth_user_id: user.id,
                  name: directProfile.name || user.email?.split('@')[0] || 'Streamer',
                  email: user.email || '',
                  role: directProfile.role || 'streamer',
                  streamer_token: directProfile.streamer_token || user.id,
                  created_at: directProfile.created_at || new Date().toISOString(),
                };
              }
            }

            if (loggedInUser && isMounted) {
              setCurrentUser(loggedInUser);
              setSessionToken(token);
              localStorage.setItem('streamer_session_token', token);
              localStorage.setItem('streamer_user_data', JSON.stringify(loggedInUser));
              setAuthChecking(false);
              return;
            }
          }
        } catch (e) {
          console.error('[Auth] Supabase session check error:', e);
        }
      }

      // 2. Fallback: Check existing session token with backend /api/auth/me
      const localToken = localStorage.getItem('streamer_session_token');
      if (localToken && isMounted) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${localToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setCurrentUser(data.user);
              setSessionToken(localToken);
            }
          } else {
            // Invalid or expired session
            localStorage.removeItem('streamer_session_token');
            localStorage.removeItem('streamer_user_data');
            if (isMounted) {
              setCurrentUser(null);
              setSessionToken(null);
            }
          }
        } catch {
          // Network error, retain local state
        }
      }

      if (isMounted) setAuthChecking(false);
    }

    syncAuth();

    // 3. Listen to Supabase auth state change (e.g. Email login, Sign Up, Password Reset)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
          session?.user &&
          isMounted
        ) {
          try {
            const user = session.user;
            let loggedInUser: UserProfile | null = null;
            let token: string = session.access_token || `sp_${user.id}`;

            try {
              const res = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  auth_user_id: user.id,
                  email: user.email,
                  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                  avatar_url: user.user_metadata?.avatar_url,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                loggedInUser = data.user;
                token = data.sessionToken;
              }
            } catch (err) {
              console.warn('[Auth] Error syncing auth session via API:', err);
            }

            if (!loggedInUser) {
              const { profile: directProfile } = await syncUserProfile(user);
              if (directProfile) {
                loggedInUser = {
                  id: directProfile.id || user.id,
                  auth_user_id: user.id,
                  name: directProfile.name || user.email?.split('@')[0] || 'Streamer',
                  email: user.email || '',
                  role: directProfile.role || 'streamer',
                  streamer_token: directProfile.streamer_token || user.id,
                  created_at: directProfile.created_at || new Date().toISOString(),
                };
              }
            }

            if (loggedInUser && isMounted) {
              setCurrentUser(loggedInUser);
              setSessionToken(token);
              localStorage.setItem('streamer_session_token', token);
              localStorage.setItem('streamer_user_data', JSON.stringify(loggedInUser));
            }
          } catch (err) {
            console.error('[Auth] Error syncing auth session:', err);
          }
        } else if (event === 'SIGNED_OUT' && isMounted) {
          localStorage.removeItem('streamer_session_token');
          localStorage.removeItem('streamer_user_data');
          setCurrentUser(null);
          setSessionToken(null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch {
        // Ignore logout request error
      }
    }
    localStorage.removeItem('streamer_session_token');
    localStorage.removeItem('streamer_user_data');
    setSessionToken(null);
    setCurrentUser(null);
  }, [sessionToken]);

  // 1. Overlay Route: /overlay/:token (Strictly public, no auth required, no dashboard UI, works in Incognito)
  if (currentPath.startsWith('/overlay')) {
    const rawToken = currentPath
      .replace(/^\/overlay\/?/, '')
      .split('?')[0]
      .split('/')[0]
      .trim();

    return (
      <div className="w-full min-h-screen bg-transparent overflow-hidden select-none">
        <OverlayView token={rawToken} />
      </div>
    );
  }

  // 2. Admin Dashboard & Viewer Join Routes
  return (
    <div
      className={`relative min-h-screen font-sans selection:bg-white/20 selection:text-white antialiased transition-colors duration-300 ${
        isLight ? 'theme-light text-zinc-900' : 'theme-dark text-white'
      }`}
    >
      {/* Dynamic Sumi-e Ink Mountains Background (InkRidges) */}
      <AppBackground />
      <ThemeCustomizerModal />

      {/* Top Floating Apple Minimal Navigation Bar */}
      <header
        className={`relative z-20 px-4 py-2.5 border-b backdrop-blur-2xl sticky top-0 transition-colors duration-300 ${
          isLight
            ? 'bg-white/70 border-black/[0.08] text-zinc-900 shadow-xs'
            : 'bg-black/40 border-white/[0.06] text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`font-semibold tracking-[-0.01em] text-[13px] ${isLight ? 'text-zinc-900' : 'text-white'}`}>
              ANTRIAN 1V1
            </span>
            <span className="opacity-30 font-mono">•</span>
            <span className={`text-xs font-normal hidden sm:inline ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Studio Overlay &amp; Queue Platform
            </span>
            {currentUser && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20">
                {currentUser.name} {currentUser.role === 'admin' ? '(Admin)' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Theme & Background Controls */}
            <ThemeHeaderControls />

            {/* Navigation Tab Group */}
            <div
              className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-xl ${
                isLight ? 'bg-black/[0.04] border-black/[0.08]' : 'bg-white/[0.04] border-white/[0.08]'
              }`}
            >
              <button
                onClick={() => navigateTo('/')}
                className={`px-3 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                  currentPath === '/' || currentPath === '/admin'
                    ? isLight
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-white text-black shadow-sm'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => navigateTo('/join')}
                className={`px-3 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                  currentPath === '/join'
                    ? isLight
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-white text-black shadow-sm'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Halaman Viewer</span>
              </button>

              {currentUser && (
                <button
                  onClick={handleLogout}
                  title="Keluar dari akun"
                  className={`px-2.5 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1 cursor-pointer text-red-500 hover:bg-red-500/10`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <div className="relative z-10">
        <div style={{ display: currentPath === '/join' ? 'block' : 'none' }}>
          <ViewerJoinView />
        </div>
        <div style={{ display: currentPath !== '/join' ? 'block' : 'none' }}>
          {sessionToken && currentUser ? (
            <AdminDashboard
              user={currentUser}
              sessionToken={sessionToken}
              onLogout={handleLogout}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={(user, token) => {
                setCurrentUser(user);
                setSessionToken(token);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
