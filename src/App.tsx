import React, { useState, useEffect } from 'react';
import { OverlayView } from './components/OverlayView';
import { ViewerJoinView } from './components/ViewerJoinView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { Tv, Users, LayoutDashboard, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
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
        {/* Quick App Switcher Bar for easy review */}
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
          <button
            onClick={() => navigateTo('/')}
            className="px-3 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FFD700] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Ke Dashboard Streamer</span>
          </button>
        </div>
        <ViewerJoinView />
      </div>
    );
  }

  // 3. Admin Dashboard Route: / or /admin
  const [appTheme, setAppTheme] = useState<'neobrutalism' | 'dark'>(() => {
    return (localStorage.getItem('dashboard_ui_theme') as 'neobrutalism' | 'dark') || 'neobrutalism';
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('dashboard_ui_theme') as 'neobrutalism' | 'dark';
      if (saved) setAppTheme(saved);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isNeo = appTheme === 'neobrutalism';

  return (
    <div className={`relative min-h-screen font-sans ${
      isNeo ? 'bg-[#F5F2EB] text-black selection:bg-[#FFE600] selection:text-black' : 'bg-[#09090b] text-white selection:bg-red-500 selection:text-white'
    }`}>
      {/* Top Quick Navigation Helper Bar */}
      <div className={`px-4 py-2 flex flex-wrap items-center justify-between text-xs font-black gap-2 transition-colors ${
        isNeo
          ? 'bg-white border-b-[2.5px] border-black shadow-[0_2px_0_0_#000] text-black'
          : 'bg-[#121215] border-b border-zinc-800 text-zinc-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isNeo ? 'bg-[#4EFE82] border border-black shadow-[1px_1px_0px_0px_#000]' : 'bg-emerald-500 animate-pulse'}`} />
          <span className={`font-black uppercase tracking-wider ${isNeo ? 'text-black' : 'text-white'}`}>
            1v1 Queue & OBS Applet
          </span>
          <span className="text-zinc-500 hidden sm:inline">•</span>
          <span className="text-zinc-500 hidden sm:inline uppercase text-[11px]">
            Navigasi Cepat:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('/')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              isNeo
                ? currentPath === '/' || currentPath === '/admin'
                  ? 'bg-[#FFE600] text-black font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[1px_1px_0px_0px_#000]'
                : currentPath === '/' || currentPath === '/admin'
                ? 'bg-zinc-800 text-white font-bold border border-zinc-600'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Dashboard Streamer</span>
          </button>

          <button
            onClick={() => navigateTo('/join')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              isNeo
                ? currentPath === '/join'
                  ? 'bg-[#00E5FF] text-black font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[1px_1px_0px_0px_#000]'
                : currentPath === '/join'
                ? 'bg-sky-950 text-sky-400 font-bold border border-sky-700'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Halaman Viewer (/join)</span>
          </button>

          <a
            href="/overlay/preview"
            onClick={(e) => {
              e.preventDefault();
              fetch('/api/admin/dashboard', { headers: { 'x-admin-pin': adminPin || '' } })
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
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              isNeo
                ? 'bg-[#FF5B89] hover:bg-[#ff4579] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                : 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/50 shadow'
            }`}
          >
            <Tv className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>OBS Overlay Direct</span>
          </a>
        </div>
      </div>

      {adminPin ? (
        <AdminDashboard
          adminPin={adminPin}
          onLogout={() => {
            localStorage.removeItem('streamer_admin_pin');
            setAdminPin(null);
          }}
        />
      ) : (
        <AdminLogin onLoginSuccess={(pin) => setAdminPin(pin)} />
      )}
    </div>
  );
}
