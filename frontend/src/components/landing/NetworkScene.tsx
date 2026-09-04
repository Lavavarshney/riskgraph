'use client';

import { useEffect, useState } from 'react';

type NetworkSceneProps = { phase?: number };

type Payment = {
  amount: string;
  account: string;
  y: number;
};

const payments: Payment[] = [
  { amount: '₹2,499', account: 'ACCOUNT 01', y: 13 },
  { amount: '₹799', account: 'ACCOUNT 02', y: 25 },
  { amount: '₹1,299', account: 'ACCOUNT 03', y: 37 },
  { amount: '₹2,150', account: 'ACCOUNT 04', y: 49 },
  { amount: '₹649', account: 'ACCOUNT 05', y: 61 },
  { amount: '₹1,899', account: 'ACCOUNT 06', y: 73 },
  { amount: '₹999', account: 'ACCOUNT 07', y: 85 },
];

const lineColor = '#8199A4';
const amber = '#C59B62';

export function NetworkScene({ phase = 1 }: NetworkSceneProps) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setCycle((value) => (value + 1) % 12), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = Math.max(cycle, phase > 1 ? 4 + phase : 0);
  const showPayments = time >= 1;
  const showIp = time >= 5;
  const showDevice = time >= 7;
  const showInfra = time >= 9;
  const showCluster = time >= 10;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0D1012]"
      aria-label="Seven ordinary payments converge through the same IP, device, and infrastructure to reveal coordinated activity"
      role="img"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute left-5 top-5 z-10 font-mono text-[9px] tracking-[0.2em] text-[#93968F]">RELATIONSHIP GRAPH / LIVE</div>
      <div className="absolute right-5 top-5 z-10 font-mono text-[9px] tracking-[0.16em] text-[#93968F]">{showCluster ? 'SUSPICIOUS CLUSTER' : 'NORMAL PAYMENTS'}</div>
      <div className="absolute bottom-5 left-5 z-10 font-mono text-[9px] tracking-[0.16em] text-[#93968F]">{showCluster ? 'COORDINATED ACTIVITY' : 'ANALYZING RELATIONSHIPS'}</div>

      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {payments.map((payment, index) => (
          <line
            key={payment.account}
            x1="26"
            y1={payment.y}
            x2="47"
            y2="49"
            stroke={showIp ? amber : lineColor}
            strokeWidth={showIp ? "0.42" : "0.28"}
            className={`transition-all duration-1000 ${showIp ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
          />
        ))}
        <line x1="53" y1="49" x2="70" y2="49" stroke={amber} strokeWidth="0.42" className={`transition-opacity duration-1000 ${showDevice ? 'opacity-100' : 'opacity-0'}`} />
        <line x1="77" y1="49" x2="91" y2="49" stroke={amber} strokeWidth="0.42" className={`transition-opacity duration-1000 ${showInfra ? 'opacity-100' : 'opacity-0'}`} />
      </svg>

      <div className="absolute left-[47%] top-[49%] z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={{ opacity: showIp ? 1 : 0.22 }}>
        <div className={`flex size-20 items-center justify-center border bg-[#151A1C] font-mono text-[10px] tracking-[0.14em] text-warning ${showCluster ? 'border-warning shadow-[0_0_0_8px_rgba(197,155,98,.1)]' : 'border-warning/60'}`}>SAME IP</div>
      </div>
      <div className="absolute left-[73.5%] top-[49%] z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={{ opacity: showDevice ? 1 : 0.16 }}>
        <div className="flex size-20 items-center justify-center border border-warning/60 bg-[#151A1C] font-mono text-[9px] tracking-[0.12em] text-warning">SAME DEVICE</div>
      </div>
      <div className="absolute left-[91%] top-[49%] z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={{ opacity: showInfra ? 1 : 0.16 }}>
        <div className="flex size-24 items-center justify-center border border-danger/70 bg-[#151A1C] px-2 text-center font-mono text-[9px] tracking-[0.1em] text-danger">INFRASTRUCTURE</div>
      </div>

      {payments.map((payment, index) => (
        <div
          key={payment.account}
          className="absolute left-[4%] z-10 w-[23%] -translate-y-1/2 border border-[#344048] bg-[#131719] px-2.5 py-2 transition-all duration-700 md:px-3"
          style={{ top: `${payment.y}%`, opacity: showPayments ? 1 : 0, transitionDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-[#E9E6DD]"><span>PAYMENT</span><span className="text-success">LOW RISK</span></div>
          <div className="mt-1 font-display text-base text-[#E9E6DD] md:text-lg">{payment.amount}</div>
          <div className="mt-1 font-mono text-[8px] tracking-[0.1em] text-[#93968F]">{payment.account}</div>
        </div>
      ))}

      <div className={`absolute bottom-14 right-5 border border-danger/50 bg-danger-tint px-3 py-2 font-mono text-[9px] tracking-[0.12em] text-danger transition-all duration-700 ${showCluster ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>7 ACCOUNTS / SUSPICIOUS CLUSTER</div>
    </div>
  );
}

export const networkLabels: never[] = [];
export const networkPoints: never[] = [];
