import React, { useState, useEffect } from 'react';
import { OverlayView } from './components/OverlayView';
import { ViewerJoinView } from './components/ViewerJoinView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { Tv, Users, LayoutDashboard } from 'lucide-react';
import type { UserProfile } from './types/queue';

export default function App() {
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
  const [adminPin, setAdminPin] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('streamer_admin_pin') : null
  );

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

  // 1. Overlay Route: /overlay/:token
  if (currentPath.startsWith('/overlay/')) {
    const token = currentPath.split('/overlay/')[1];
    return <OverlayView token={token} />;
  }

  // 2. Viewer Join Route: /join
  if (currentPath === '/join') {
    return (
      <div className="relative">
        {/* Quick App Switcher Bar - Apple Minimal Floating Pill */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => navigateTo('/')}
            className="apple-button-secondary text-xs py-2 px-3.5 flex items-center gap-2 rounded-full backdrop-blur-xl shadow-lg cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-medium text-zinc-200">Dashboard Streamer</span>
          </button>
        </div>
        <ViewerJoinView />
      </div>
    );
  }

  // 3. Admin Dashboard Route: / or /admin
  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-sans selection:bg-white/20 selection:text-white antialiased">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />

      {/* Top Floating Apple Minimal Navigation Bar */}
      <header className="relative z-20 px-4 py-3 border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-[-0.01em] text-white text-[13px]">
              ANTRIAN 1V1
            </span>
            <span className="text-white/[0.2] font-mono">•</span>
            <span className="text-zinc-400 text-xs font-normal hidden sm:inline">
              Studio Overlay & Queue Platform
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <button
              onClick={() => navigateTo('/')}
              className={`px-3 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                currentPath === '/' || currentPath === '/admin'
                  ? 'bg-white text-black shadow-sm'
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
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Halaman Viewer</span>
            </button>

            <a
              href="/overlay/preview"
              onClick={(e) => {
                e.preventDefault();
                const headers: Record<string, string> = {};
                if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
                if (adminPin) headers['x-admin-pin'] = adminPin;

                fetch('/api/admin/dashboard', { headers })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data?.settings?.streamer_token) {
                      navigateTo(`/overlay/${data.settings.streamer_token}`);
                    } else {
                      navigateTo('/overlay/preview');
                    }
                  })
                  .catch(() => navigateTo('/overlay/preview'));
              }}
              className="px-3 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1.5 text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-[#2997ff]" />
              <span>OBS Direct</span>
            </a>
          </div>
        </div>
      </header>

      {sessionToken || adminPin ? (
        <AdminDashboard
          user={currentUser || undefined}
          sessionToken={sessionToken || undefined}
          adminPin={adminPin || undefined}
          onLogout={() => {
            localStorage.removeItem('streamer_session_token');
            localStorage.removeItem('streamer_user_data');
            localStorage.removeItem('streamer_admin_pin');
            setSessionToken(null);
            setCurrentUser(null);
            setAdminPin(null);
          }}
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
  );
}
