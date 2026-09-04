'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/websocket';
import { checkHealth } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, RefreshCw } from 'lucide-react';

type Mode = 'Monitor' | 'Investigate' | 'Control' | 'Analyze';

type NavItem = { label: string; href: string };

const modeNavigation: Record<Mode, NavItem[]> = {
  Monitor: [
    { label: 'Risk Stream', href: '/dashboard' },
    { label: 'Transactions', href: '/transactions' },
  ],
  Investigate: [
    { label: 'Cases', href: '/investigations' },
    { label: 'Network', href: '/network' },
    { label: 'Clusters', href: '/attacks' },
  ],
  Control: [
    { label: 'Policies', href: '/policies' },
    { label: 'Actions', href: '/ledger' },
  ],
  Analyze: [
    { label: 'Model', href: '/evaluation' },
    { label: 'Simulation', href: '/demo' },
  ],
};

function modeForPath(pathname: string): Mode {
  if (pathname.startsWith('/transactions') || pathname === '/dashboard' || pathname === '/') return 'Monitor';
  if (pathname.startsWith('/investigations') || pathname.startsWith('/network') || pathname.startsWith('/attacks')) return 'Investigate';
  if (pathname.startsWith('/policies') || pathname.startsWith('/ledger')) return 'Control';
  return 'Analyze';
}

export const Header = () => {
  const pathname = usePathname();
  const { isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const [healthStatus, setHealthStatus] = useState<{ status: string; database: { connected: boolean } } | null>(null);
  const [loading, setLoading] = useState(false);
  const mode = modeForPath(pathname);
  const isLanding = pathname === '/';

  const fetchStatus = async () => {
    setLoading(true);
    try {
      setHealthStatus(await checkHealth());
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

  if (isLanding) {
    return (
      <header className="border-b border-subtle bg-surface px-5 md:px-8">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6">
          <Link href="/" className="font-mono text-sm font-bold tracking-[0.2em] text-primary">RISKGRAPH</Link>
          <nav className="hidden items-center gap-7 text-xs text-muted md:flex" aria-label="Marketing navigation">
            <a href="#demo" className="transition-colors hover:text-primary">Demo</a>
          </nav>
          <Link href="/dashboard" className="border border-subtle px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:border-primary">Open Console</Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-subtle bg-surface transition-colors">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="shrink-0 font-mono text-sm font-bold tracking-[0.18em] text-primary">RISKGRAPH</Link>
          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary navigation">
            {(Object.keys(modeNavigation) as Mode[]).map((item) => (
              <Link key={item} href={modeNavigation[item][0].href} className={`whitespace-nowrap border-b-2 px-3 py-5 text-xs transition-colors ${mode === item ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}>
                {item}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted">
          <span className="flex items-center gap-2 text-primary"><span className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />LIVE</span>
          <div className="hidden items-center gap-3 border-l border-subtle pl-3 lg:flex">
            <span className={dbConnected ? 'text-muted' : 'text-rose-500'}>DB {dbConnected ? 'OK' : 'OFF'}</span>
            <span className={apiHealthy ? 'text-muted' : 'text-amber-500'}>API {apiHealthy ? 'OK' : 'CHECK'}</span>
          </div>
          <button onClick={fetchStatus} title="Refresh telemetry" className="text-muted transition-colors hover:text-primary" aria-label="Refresh telemetry"><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="border-l border-subtle pl-3 text-muted transition-colors hover:text-primary" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}</button>
        </div>
      </div>
      <nav className="flex min-h-10 items-center gap-5 overflow-x-auto border-t border-subtle px-4 md:px-6" aria-label={`${mode} navigation`}>
        {modeNavigation[mode].map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return <Link key={item.href} href={item.href} className={`whitespace-nowrap border-b-2 py-3 text-[11px] transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-primary'}`}>{item.label}</Link>;
        })}
      </nav>
    </header>
  );
};

export default Header;
