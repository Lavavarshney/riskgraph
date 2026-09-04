'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CircleDot, Play, Square, Waypoints } from 'lucide-react';
import { useWebSocket } from '@/lib/websocket';
import { fetchApi } from '@/lib/api';
import { NetworkScene } from '@/components/landing/NetworkScene';

const entities = [
  { label: '14 ACCOUNTS', tone: 'bg-danger' },
  { label: '2 DEVICES', tone: 'bg-warning' },
  { label: '1 IP', tone: 'bg-accent-blue' },
  { label: '38 TRANSACTIONS', tone: 'bg-success' },
];

const workflow = [
  ['LIVE TRANSACTIONS', 'Monitor incoming payment activity and risk signals.'],
  ['INVESTIGATION', 'Trace why a payment was flagged.'],
  ['NETWORK GRAPH', 'See the entities connected to that payment.'],
  ['ATTACK CLUSTER', 'Identify coordinated activity across transactions.'],
  ['CONTAINMENT', 'Stop the attack at the most effective choke point.'],
  ['ACTION LEDGER', 'Record what the system did and why.'],
];

export default function Home() {
  const { lastMessage } = useWebSocket();
  const [phase, setPhase] = useState(1);
  const [running, setRunning] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (lastMessage?.event === 'demo_event') {
      const nextPhase = lastMessage.data?.phase;
      if (nextPhase) setPhase(nextPhase);
      setEventCount((count) => count + 1);
      if (nextPhase === 4) setRunning(false);
    }
  }, [lastMessage]);

  const runDemo = async () => {
    setRunning(true);
    setPhase(1);
    setEventCount(0);
    try {
      await fetchApi('/demo/simulate', { method: 'POST' });
    } catch {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-app text-primary">
      <section className="mx-auto grid min-h-[calc(90vh-88px)] max-w-7xl items-center gap-10 px-6 py-12 lg:grid-cols-[.88fr_1.12fr] lg:px-12 lg:py-16">
        <div className="animate-draw-in"><p className="mb-5 font-mono text-xs tracking-[0.18em] text-accent-blue">REAL-TIME PAYMENT RISK INTELLIGENCE</p><h1 className="max-w-2xl font-display text-6xl leading-[.98] tracking-tight text-balance md:text-8xl">Fraud looks ordinary <em className="text-muted">until you see the network.</em></h1><p className="mt-7 max-w-xl text-base leading-7 text-muted md:text-lg">RISKGRAPH connects payments to accounts, devices, IPs and infrastructure to uncover patterns that isolated transaction scoring can miss.</p><div className="mt-8 flex flex-wrap items-center gap-5"><Link href="/dashboard" className="bg-accent-blue px-5 py-3 text-xs font-bold text-surface-primary no-underline hover:opacity-90">Open Risk Console <ArrowUpRight className="ml-2 inline size-3.5" /></Link><a href="#demo" className="border-b border-primary pb-1 text-xs font-semibold no-underline">Watch the attack simulation</a></div></div>
        <div className="relative min-h-[500px] overflow-hidden border border-subtle bg-surface lg:min-h-[580px]"><NetworkScene phase={phase} /><div className="absolute bottom-5 left-6 right-6 flex justify-between border-t border-subtle pt-3 font-mono text-[9px] text-muted"><span>RELATIONSHIP GRAPH / LIVE</span><span>PAYMENT NETWORK / 5 ENTITIES</span></div></div>
      </section>

      <section id="problem" className="border-y border-subtle bg-surface"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-12"><p className="mb-4 font-mono text-xs tracking-[0.16em] text-accent-blue">WHY TRANSACTION-ONLY DETECTION FAILS</p><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><h2 className="max-w-lg font-display text-4xl leading-tight md:text-5xl">The signal is not in the payment. It is in the relationship.</h2><p className="max-w-xl text-sm leading-6 text-muted">Three payments can each look harmless until a shared device, IP, or payment infrastructure reveals the coordinated attack underneath.</p></div><div className="mt-14 grid border-y border-subtle md:grid-cols-3"><div className="p-7 md:border-r md:border-subtle"><p className="mb-10 font-mono text-[10px] text-muted">INDIVIDUAL PAYMENTS</p><div className="flex flex-col gap-4 font-mono text-sm"><span className="flex justify-between"><span>₹2,499</span><b className="font-normal text-success">LOW RISK</b></span><span className="flex justify-between"><span>₹799</span><b className="font-normal text-success">LOW RISK</b></span><span className="flex justify-between"><span>₹1,299</span><b className="font-normal text-success">LOW RISK</b></span></div></div><div className="border-t border-subtle p-7 md:border-r md:border-t-0"><p className="mb-10 font-mono text-[10px] text-muted">HIDDEN RELATIONSHIPS</p><div className="flex flex-col gap-4 text-sm"><span className="flex items-center gap-3"><CircleDot className="size-4 text-accent-blue" />same device</span><span className="flex items-center gap-3"><CircleDot className="size-4 text-warning" />same IP</span><span className="flex items-center gap-3"><CircleDot className="size-4 text-danger" />same infrastructure</span></div></div><div className="border-t border-subtle p-7 md:border-t-0"><p className="mb-10 font-mono text-[10px] text-muted">ATTACK CLUSTER DETECTED</p><div className="grid grid-cols-2 gap-4 font-mono text-sm">{entities.map((entity) => <span key={entity.label} className="flex items-center gap-2"><i className={`size-2 rounded-full ${entity.tone}`} />{entity.label}</span>)}</div><span className="mt-8 inline-block border border-danger/30 bg-danger-tint px-3 py-2 font-mono text-[10px] font-bold text-danger">COORDINATED ATTACK</span></div></div></div></section>

      <section id="demo" className="mx-auto max-w-7xl px-6 py-20 lg:px-12"><div className="flex flex-col justify-between gap-8 border-b border-subtle pb-10 md:flex-row md:items-end"><div><p className="mb-4 font-mono text-xs tracking-[0.16em] text-accent-blue">SEE RISKGRAPH IN ACTION</p><h2 className="font-display text-4xl md:text-5xl">Watch an attack emerge in real time.</h2><p className="mt-4 text-sm text-muted">A live simulation of detection, graph escalation, and choke point containment.</p></div><button onClick={runDemo} disabled={running} className="flex items-center gap-2 self-start border border-danger/30 bg-danger-tint px-4 py-3 font-mono text-xs font-bold text-danger disabled:opacity-60">{running ? <Square className="size-4" /> : <Play className="size-4" />}{running ? 'SIMULATING ATTACK...' : 'SIMULATE ATTACK'}</button></div><div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_.6fr]"><div className="border border-subtle bg-surface"><div className="grid grid-cols-2 border-b border-subtle md:grid-cols-4">{[['NORMAL TRAFFIC',1],['ATTACK BEGINS',2],['ATTACK DETECTED',3],['ATTACK CONTAINED',4]].map(([name, value]) => <div key={name as string} className={`border-r border-subtle p-4 last:border-0 ${phase >= (value as number) ? 'text-primary' : 'text-muted opacity-50'}`}><span className="block font-mono text-[10px]">PHASE 0{value}</span><span className="mt-2 block text-xs font-semibold">{name}</span></div>)}</div><div className="relative min-h-[270px] overflow-hidden p-7"><div className="absolute inset-0 bg-grid-pattern opacity-30" /><div className="relative flex h-full min-h-[220px] items-center justify-center"><div className="absolute size-28 rounded-full border border-accent-blue/40" /><div className={`absolute size-3 rounded-full bg-danger shadow-[0_0_0_12px_var(--danger-tint)] ${phase >= 2 ? 'animate-ping' : ''}`} /><div className="absolute left-1/4 top-1/3 size-2 rounded-full bg-accent-blue" /><div className="absolute right-1/4 bottom-1/3 size-2 rounded-full bg-warning" /><div className="absolute bottom-5 left-0 right-0 text-center font-mono text-[10px] text-muted">{phase === 1 ? 'PAYMENT STREAM / BASELINE' : phase === 2 ? 'SHARED ENTITIES CONNECTING' : phase === 3 ? 'CLUSTER C91 / CHOKE POINT IDENTIFIED' : 'DEVICE D91 QUARANTINED / ATTACK DISRUPTED'}</div></div></div></div><aside className="border border-subtle p-6"><div className="flex items-center justify-between border-b border-subtle pb-4"><span className="font-mono text-[10px] font-bold text-muted">SIMULATION OUTPUT</span><Waypoints className="size-4 text-accent-blue" /></div><div className="mt-6 flex flex-col gap-5"><div><span className="font-mono text-[10px] text-muted">EVENTS PROCESSED</span><strong className="mt-1 block font-mono text-2xl">{eventCount || (phase - 1) * 9}</strong></div><div><span className="font-mono text-[10px] text-muted">GRAPH DISRUPTION</span><strong className="mt-1 block font-mono text-2xl text-success">86.8%</strong></div><div><span className="font-mono text-[10px] text-muted">PROTECTED AMOUNT</span><strong className="mt-1 block font-mono text-2xl">₹84,000</strong><em className="text-[10px] text-muted">Simulated counterfactual savings</em></div>{phase === 4 && <div className="flex items-center gap-2 border border-success/30 bg-success-tint p-3 font-mono text-xs font-bold text-success"><Check className="size-4" />ATTACK DISRUPTED</div>}</div></aside></div></section>

      <section id="method" className="border-y border-subtle bg-surface"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-12"><p className="mb-4 font-mono text-xs tracking-[0.16em] text-accent-blue">HOW RISKGRAPH WORKS</p><h2 className="font-display text-4xl md:text-5xl">From signal to containment.</h2><div className="mt-14 grid border-t border-subtle md:grid-cols-4">{[['SCORE','Score incoming payment risk.'],['CONNECT','Relate payments to devices, accounts, IPs and infrastructure.'],['DETECT','Identify coordinated attack patterns across the graph.'],['CONTAIN','Identify the highest-leverage choke point and apply containment.']].map(([title, desc], i) => <div key={title} className="border-b border-subtle py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"><span className="font-mono text-xs text-muted">0{i + 1}</span><h3 className="mt-7 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{desc}</p><ArrowRight className="mt-7 size-4 text-accent-blue" /></div>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-12"><p className="mb-4 font-mono text-xs tracking-[0.16em] text-accent-blue">FROM SIGNAL TO ACTION</p><h2 className="font-display text-4xl md:text-5xl">The analyst workflow, connected.</h2><div className="mt-12 grid border-y border-subtle sm:grid-cols-2 lg:grid-cols-3">{workflow.map(([title, desc], i) => <div key={title} className="border-b border-subtle p-6 lg:nth-[3n+1]:border-r"><span className="font-mono text-[10px] text-muted">0{i + 1}</span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{desc}</p></div>)}</div><div className="mt-20 flex flex-col items-start justify-between gap-8 border-t border-subtle pt-8 md:flex-row md:items-center"><div><p className="font-mono text-xs text-muted">MODEL INTELLIGENCE</p><h2 className="mt-3 font-display text-3xl">See the network, not just the score.</h2></div><Link href="/dashboard" className="flex items-center gap-2 border-b border-primary pb-2 text-sm font-semibold no-underline">Open the risk console <ArrowUpRight className="size-4" /></Link></div></section>
      <footer className="mx-auto flex max-w-7xl justify-between border-t border-subtle px-6 py-7 font-mono text-[10px] text-muted lg:px-12"><span>RISKGRAPH / PAYMENT RISK INTELLIGENCE</span><span className="hidden md:inline">BUILT FOR THE MOMENT BETWEEN SIGNAL AND ACTION</span></footer>
    </main>
  );
}
