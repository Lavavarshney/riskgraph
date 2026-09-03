'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket';
import { checkHealth } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Bell, RefreshCw } from 'lucide-react';

export const Header = () => {
  const { isConnected } = useWebSocket(); const { theme, toggleTheme } = useTheme();
  const [healthStatus, setHealthStatus] = useState<{ status: string; database: { connected: boolean } } | null>(null); const [loading, setLoading] = useState(false);
  const fetchStatus = async () => { setLoading(true); try { setHealthStatus(await checkHealth()); } catch { setHealthStatus({ status: 'offline', database: { connected: false } }); } finally { setLoading(false); } };
  useEffect(() => { fetchStatus(); const interval = setInterval(fetchStatus, 15000); return () => clearInterval(interval); }, []);
  const dbConnected = healthStatus?.database?.connected; const apiHealthy = healthStatus?.status === 'healthy';
  return <header className="min-h-14 bg-surface border-b border-subtle px-4 md:px-6 py-3 flex items-center justify-between transition-colors"><div className="text-[10px] font-mono text-muted uppercase tracking-widest">Operations / <span className="text-primary">Live overview</span></div><div className="flex items-center gap-3 md:gap-5 text-[10px] font-mono text-muted"><div className="hidden md:flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />DB {dbConnected ? 'CONNECTED' : 'OFFLINE'}</div><div className="hidden md:flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${apiHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />API {apiHealthy ? 'HEALTHY' : 'CHECKING'}</div><div className="hidden md:flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-500' : 'bg-slate-400'}`} />STREAM {isConnected ? 'LIVE' : 'OFFLINE'}</div><button onClick={fetchStatus} title="Refresh telemetry" className="text-muted hover:text-primary"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="flex items-center gap-2 text-muted hover:text-primary border-l border-subtle pl-3"><span>{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}</span><span className="hidden sm:inline uppercase">{theme}</span></button><Bell className="w-3.5 h-3.5 text-muted" /></div></header>;
};
