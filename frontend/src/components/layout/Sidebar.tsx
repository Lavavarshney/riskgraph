'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Search,
  Network,
  ShieldAlert,
  Sliders,
  BarChart3,
  Zap,
  History,
  Activity
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Live Transactions', href: '/transactions', icon: CreditCard },
    ],
  },
  {
    title: 'INVESTIGATE',
    items: [
      { name: 'Investigations', href: '/investigations', icon: Search },
      { name: 'Network Graph', href: '/network', icon: Network },
      { name: 'Attack Clusters', href: '/attacks', icon: ShieldAlert, badge: 'LIVE' },
    ],
  },
  {
    title: 'CONTROL',
    items: [
      { name: 'Containment Policies', href: '/policies', icon: Sliders },
      { name: 'Action Ledger', href: '/ledger', icon: History },
    ],
  },
  {
    title: 'ANALYZE',
    items: [
      { name: 'Model Evaluation', href: '/evaluation', icon: BarChart3 },
      { name: 'Live Attack Demo', href: '/demo', icon: Zap },
    ],
  },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-surface border-r border-subtle flex flex-col justify-between min-h-screen font-sans transition-colors">
      <div className="py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="px-3 space-y-1">
            <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1.5">
              {section.title}
            </span>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/dashboard' && pathname === '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-500 border-l-2 border-blue-500 font-semibold pl-2.5'
                      : 'text-muted hover:text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-muted'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Engine Status Bottom Panel */}
      <div className="p-3 m-3 rounded-lg bg-surface-secondary border border-subtle text-xs font-mono">
        <span className="text-[10px] text-muted block uppercase font-bold">SYSTEM TELEMETRY</span>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-primary font-medium text-[11px]">Realtime Graph Engine Active</span>
        </div>
      </div>
    </aside>
  );
};
