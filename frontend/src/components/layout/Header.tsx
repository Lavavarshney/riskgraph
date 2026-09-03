'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket';
import { checkHealth } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Bell, ShieldCheck, RefreshCw, User } from 'lucide-react';

export const Header = () => {
  const { isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    database: { connected: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await checkHealth();
      setHealthStatus(data);
    } catch {
      setHealthStatus({ status: 'offline', database: { connected: false } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const dbConnected = healthStatus?.database?.connected;
  const apiHealthy = healthStatus?.status === 'healthy';

  return (
    <header className="h-14 bg-surface border-b border-subtle px-5 flex items-center justify-between transition-colors">
      {/* Left Brand Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold tracking-tight text-sm font-sans text-primary">RISK<span className="text-blue-500">GRAPH</span></span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-secondary text-muted border border-subtle">v1.4</span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted block mt-0.5">Real-Time Risk Operations</span>
          </div>
        </div>
      </div>

      {/* Center/Right Subtle Telemetry Status Indicators */}
      <div className="hidden md:flex items-center gap-5 text-xs font-mono text-muted">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          <span>PostgreSQL {dbConnected ? 'Connected' : 'Offline'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${apiHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>API {apiHealthy ? 'Healthy' : 'Checking'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
          <span>Stream {isConnected ? 'Live' : 'Disconnected'}</span>
        </div>

        <button
          onClick={fetchStatus}
          className="p-1 rounded text-muted hover:text-primary transition-colors"
          title="Refresh Telemetry Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Right Controls: Theme Toggle, Notifications, User Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-surface-secondary border border-subtle text-muted hover:text-primary transition-colors flex items-center gap-1.5 text-xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          <span className="font-mono text-[11px] uppercase hidden sm:inline">{theme}</span>
        </button>

        <button className="p-2 rounded-lg bg-surface-secondary border border-subtle text-muted hover:text-primary transition-colors relative">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        </button>

        <div className="pl-2 border-l border-subtle flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-secondary border border-subtle flex items-center justify-center text-muted font-mono text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden lg:block text-left font-sans">
            <span className="block text-xs font-semibold text-primary leading-tight">Risk Ops</span>
            <span className="block text-[9px] font-mono text-muted">analyst@riskgraph.io</span>
          </div>
        </div>
      </div>
    </header>
  );
};
