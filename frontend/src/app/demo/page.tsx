'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Play, Activity, ShieldAlert, Target, CheckCircle2, Clock, Zap, ArrowRight } from 'lucide-react';
import { useWebSocket } from '@/lib/websocket';

interface DemoEvent {
  phase: number;
  timestamp: string;
  message: string;
  details?: Record<string, any>;
}

export default function DemoPage() {
  const { lastMessage } = useWebSocket();
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [summaryData, setSummaryData] = useState<any | null>(null);

  const demoPhases = [
    { phase: 1, name: 'NORMAL TRAFFIC', desc: 'Legitimate payment baseline' },
    { phase: 2, name: 'ATTACK BEGINS', desc: 'Sybil proxy injection' },
    { phase: 3, name: 'ATTACK DETECTED', desc: 'Graph cluster escalation' },
    { phase: 4, name: 'ATTACK CONTAINED', desc: 'Choke point quarantine' },
  ];

  const startDemoSimulation = async () => {
    setIsRunning(true);
    setEvents([]);
    setCurrentPhase(1);
    setSummaryData(null);

    try {
      const res = await fetch('http://localhost:8000/demo/simulate', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (e) {
      console.error('Failed to trigger demo simulation:', e);
    }
  };

  useEffect(() => {
    if (lastMessage && lastMessage.event === 'demo_event') {
      const demoData = lastMessage.data;
      if (demoData.phase) setCurrentPhase(demoData.phase);
      setEvents(prev => [...prev, {
        phase: demoData.phase || 1,
        timestamp: demoData.timestamp || new Date().toLocaleTimeString(),
        message: demoData.message || 'Event processed',
        details: demoData.details
      }]);

      if (demoData.phase === 4) {
        setIsRunning(false);
      }
    }
  }, [lastMessage]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary tracking-tight">LIVE ATTACK DEMO MODE</h2>
            <Badge variant="danger">4-PHASE SIMULATOR</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5 font-sans">
            End-to-end automated attack injection, multi-hop graph detection, choke point containment, and counterfactual loss prevention
          </p>
        </div>

        <button
          onClick={startDemoSimulation}
          disabled={isRunning}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-surface-secondary text-white font-mono font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 animate-spin" /> SIMULATING ATTACK...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> SIMULATE ATTACK
            </>
          )}
        </button>
      </div>

      {/* 4-PHASE STEPPER BAR */}
      <div className="bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block font-sans">
          DEMO LIFECYCLE PROGRESSION
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {demoPhases.map((p) => {
            const isActive = currentPhase === p.phase;
            const isPassed = currentPhase > p.phase;

            return (
              <div
                key={p.phase}
                className={`p-3.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold shadow-sm'
                    : isPassed
                    ? 'bg-surface-secondary border-subtle text-primary font-semibold'
                    : 'bg-surface-secondary border-subtle text-muted opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span>PHASE {p.phase}</span>
                  {isPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : isActive ? <Activity className="w-3.5 h-3.5 animate-spin" /> : null}
                </div>
                <div className="text-xs font-bold font-sans">{p.name}</div>
                <div className="text-[10px] text-muted font-sans mt-0.5">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid: Realtime Console Log (7 cols) + Containment Summary (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Realtime Event Timeline Console */}
        <div className="lg:col-span-7 bg-card border border-subtle rounded-xl p-5 flex flex-col h-[500px] shadow-sm">
          <div className="pb-3 border-b border-subtle flex items-center justify-between font-sans">
            <span className="text-xs font-bold text-primary uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> REALTIME ATTACK EVENT TIMELINE CONSOLE
            </span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
            {events.length === 0 ? (
              <div className="p-8 text-center text-muted italic font-sans">
                Click <strong>&quot;SIMULATE ATTACK&quot;</strong> to launch the live 4-phase attack sequence.
              </div>
            ) : (
              events.map((evt, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-surface-secondary border border-subtle space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-500 font-bold">[{evt.timestamp}]</span>
                    <Badge variant={evt.phase === 4 ? 'success' : evt.phase === 3 ? 'danger' : 'neutral'}>
                      Phase {evt.phase}
                    </Badge>
                  </div>
                  <p className="text-primary font-sans leading-relaxed">{evt.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attack Containment Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-subtle pb-2 font-sans">
              <span className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                <Target className="w-4 h-4 text-rose-500" /> ATTACK CONTAINMENT RESULT
              </span>
              <Badge variant={currentPhase === 4 ? 'success' : 'warning'}>
                {currentPhase === 4 ? 'ATTACK CONTAINED' : 'SIMULATION ACTIVE'}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-secondary border border-subtle space-y-1">
                <span className="text-muted block text-[10px] uppercase font-bold">DETECTED ATTACK RING</span>
                <span className="text-primary font-bold text-sm block">Sybil Proxy Ring #C91</span>
                <span className="text-muted text-[11px]">14 newly created accounts connected through Device D91</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-secondary border border-subtle space-y-1">
                <span className="text-muted block text-[10px] uppercase font-bold">DISRUPTED CHOKE POINT</span>
                <span className="text-blue-500 font-bold text-sm block">QUARANTINE DEVICE dev_stealth_c91_primary</span>
                <span className="text-muted text-[11px]">86.8% attack graph disruption coverage</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold">PROTECTED AMOUNT</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl block">₹84,000 INR ($4,164.00)</span>
                <span className="text-muted text-[10px] italic">Simulated counterfactual savings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
