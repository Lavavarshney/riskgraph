'use client';

import { useEffect, useState } from 'react';

type NetworkSceneProps = { phase?: number };

type Entity = {
  id: string;
  label: string;
  kind: 'payment' | 'account' | 'device' | 'ip' | 'infra';
  position: string;
};

const entities: Entity[] = [
  { id: 'payment-a', label: 'PAYMENT', kind: 'payment', position: 'left-[9%] top-[20%]' },
  { id: 'payment-b', label: 'PAYMENT', kind: 'payment', position: 'left-[9%] top-[45%]' },
  { id: 'payment-c', label: 'PAYMENT', kind: 'payment', position: 'left-[9%] top-[70%]' },
  { id: 'account', label: 'ACCOUNT', kind: 'account', position: 'left-[42%] top-[11%]' },
  { id: 'device', label: 'DEVICE', kind: 'device', position: 'left-[42%] top-[45%]' },
  { id: 'ip', label: 'IP', kind: 'ip', position: 'left-[70%] top-[45%]' },
  { id: 'infra', label: 'INFRASTRUCTURE', kind: 'infra', position: 'left-[70%] top-[70%]' },
];

const links = [
  ['payment-a', 'account', 1], ['payment-b', 'device', 2], ['payment-c', 'device', 2],
  ['account', 'device', 2], ['device', 'ip', 3], ['ip', 'infra', 4],
] as const;

const tone: Record<Entity['kind'], string> = {
  payment: 'border-accent-blue text-accent-blue',
  account: 'border-success text-success',
  device: 'border-warning bg-warning-tint text-warning',
  ip: 'border-warning text-warning',
  infra: 'border-danger bg-danger-tint text-danger',
};

export function NetworkScene({ phase = 1 }: NetworkSceneProps) {
  const [revealed, setRevealed] = useState(phase);

  useEffect(() => {
    setRevealed(1);
    const timer = window.setInterval(() => setRevealed((current) => Math.min(4, current + 1)), 950);
    return () => window.clearInterval(timer);
  }, [phase]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0D1012]" aria-label="Payments connected through a shared device, IP, and infrastructure" role="img">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute left-5 top-5 font-mono text-[9px] tracking-[0.2em] text-[#93968F]">ENTITY RELATIONSHIPS / LIVE</div>
      <div className="absolute bottom-5 right-5 font-mono text-[9px] tracking-[0.16em] text-[#93968F]">CONNECTED ACTIVITY</div>
      <div className="absolute inset-x-0 top-[45%] border-t border-[#2A2E30]" />
      <div className="absolute inset-y-0 left-[29%] border-l border-[#2A2E30]" />
      <div className="absolute inset-y-0 left-[58%] border-l border-[#2A2E30]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {links.map(([from, to, revealAt]) => {
          const a = entities.find((entity) => entity.id === from);
          const b = entities.find((entity) => entity.id === to);
          if (!a || !b) return null;
          const coords = (position: string) => {
            const values = position.match(/left-\[(\d+)%\] top-\[(\d+)%\]/);
            return values ? { x: Number(values[1]) + 3, y: Number(values[2]) + 3 } : { x: 0, y: 0 };
          };
          const start = coords(a.position); const end = coords(b.position);
          return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`transition-opacity duration-700 ${revealed >= revealAt ? 'opacity-100' : 'opacity-0'}`} stroke={revealAt >= 3 ? '#C59B62' : '#8BA9B6'} strokeWidth="0.32" strokeDasharray={revealAt >= 3 ? '1.2 1.2' : undefined} />;
        })}
      </svg>
      {entities.map((entity) => {
        const active = revealed >= (entity.kind === 'payment' ? 1 : entity.kind === 'account' ? 1 : entity.kind === 'device' ? 2 : entity.kind === 'ip' ? 3 : 4);
        return <div key={entity.id} className={`absolute ${entity.position} flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 transition-all duration-700 ${active ? 'opacity-100' : 'opacity-40'}`}><div className={`flex size-12 items-center justify-center rounded-full border bg-[#131719] font-mono text-[8px] tracking-[0.12em] ${tone[entity.kind]} ${entity.kind === 'device' && revealed >= 4 ? 'shadow-[0_0_0_8px_rgba(197,155,98,.1)]' : ''}`}>{entity.kind === 'payment' ? '₹' : entity.kind === 'account' ? 'A' : entity.kind === 'device' ? 'D' : entity.kind === 'ip' ? 'IP' : 'I'}</div><span className="bg-[#131719] px-1 font-mono text-[8px] tracking-[0.14em] text-[#93968F]">{entity.label}</span></div>;
      })}
    </div>
  );
}

export const networkLabels: never[] = [];
export const networkPoints: never[] = [];
