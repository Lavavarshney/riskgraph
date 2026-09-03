'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Search, Network, ShieldAlert, Sliders, BarChart3, Zap, History, ShieldCheck } from 'lucide-react';

const navSections = [
  { title: 'OVERVIEW', items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }, { name: 'Live Transactions', href: '/transactions', icon: CreditCard }] },
  { title: 'INVESTIGATE', items: [{ name: 'Investigations', href: '/investigations', icon: Search }, { name: 'Network Graph', href: '/network', icon: Network }, { name: 'Attack Clusters', href: '/attacks', icon: ShieldAlert, badge: 'LIVE' }] },
  { title: 'CONTROL', items: [{ name: 'Containment Policies', href: '/policies', icon: Sliders }, { name: 'Action Ledger', href: '/ledger', icon: History }] },
  { title: 'ANALYZE', items: [{ name: 'Model Evaluation', href: '/evaluation', icon: BarChart3 }, { name: 'Live Attack Demo', href: '/demo', icon: Zap }] },
];

export const Sidebar = () => {
  const pathname = usePathname();
  return (
    <aside className="console-sidebar w-60 bg-surface border-r border-subtle flex flex-col justify-between min-h-screen font-sans transition-colors">
      <div>
        <div className="px-6 py-6 border-b border-subtle">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-500" /><span className="font-bold tracking-[0.18em] text-sm text-primary">RISKGRAPH</span></div>
          <p className="text-[10px] text-muted mt-2 font-mono uppercase tracking-wider">Payment risk intelligence</p>
        </div>
        <nav className="py-6 flex flex-col gap-6">
          {navSections.map((section) => <div key={section.title} className="px-3 flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{section.title}</span>
            {section.items.map((item) => { const active = pathname === item.href || (item.href === '/dashboard' && pathname === '/'); const Icon = item.icon; return <Link key={item.name} href={item.href} className={`flex items-center justify-between px-3 py-2.5 text-xs transition-all border-l-2 ${active ? 'bg-blue-500/10 text-blue-500 border-blue-500 font-semibold' : 'text-muted border-transparent hover:text-primary hover:bg-surface-secondary'}`}><span className="flex items-center gap-2.5"><Icon className="w-3.5 h-3.5" />{item.name}</span>{item.badge && <span className="text-[9px] font-mono text-rose-500">{item.badge}</span>}</Link>; })}
          </div>)}
        </nav>
      </div>
      <div className="p-4 border-t border-subtle text-xs font-mono"><span className="text-[10px] text-muted uppercase">SYSTEM TELEMETRY</span><div className="flex items-center gap-2 mt-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-primary text-[10px]">Graph engine active</span></div></div>
    </aside>
  );
};
