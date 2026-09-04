'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useWebSocket } from '@/lib/websocket';
import { fetchApi } from '@/lib/api';
import { Play, Square, Activity, DollarSign, ShieldAlert, Layers, ShieldCheck, TrendingUp, Cpu, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { RiskField3D } from '@/components/3d/RiskField3D';

interface PaymentEvent {
  id: string;
  merchant_id: string;
  customer_id: string;
  device_id: string;
  ip_id: string;
  payment_method_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: string;
  country: string;
  is_fraud: boolean;
  fraud_type: string;
}

interface SimulatorStatus {
  is_running: boolean;
  current_scenario: string;
  live_tx_count: number;
  tps: number;
  total_amount: number;
  fraud_count: number;
}

const INITIAL_TRANSACTIONS: PaymentEvent[] = [
  { id: 'tx_98124', merchant_id: 'mch_stripe_01', customer_id: 'cust_109', device_id: 'dev_2379', ip_id: 'ip_3167', payment_method_id: 'pm_227', amount: 217.64, currency: 'USD', timestamp: '12:25:01', status: 'APPROVED', country: 'US', is_fraud: false, fraud_type: 'LEGITIMATE' },
  { id: 'tx_98123', merchant_id: 'mch_shopify_09', customer_id: 'cust_882', device_id: 'dev_stealth_c91_primary', ip_id: 'ip_stealth_c91_proxy', payment_method_id: 'pm_901', amount: 49.99, currency: 'USD', timestamp: '12:24:58', status: 'DECLINED', country: 'CA', is_fraud: true, fraud_type: 'SYBIL_RING' },
  { id: 'tx_98122', merchant_id: 'mch_amazon_44', customer_id: 'cust_401', device_id: 'dev_9912', ip_id: 'ip_1029', payment_method_id: 'pm_411', amount: 1250.00, currency: 'USD', timestamp: '12:24:45', status: 'APPROVED', country: 'US', is_fraud: false, fraud_type: 'LEGITIMATE' },
  { id: 'tx_98121', merchant_id: 'mch_uber_12', customer_id: 'cust_773', device_id: 'dev_5510', ip_id: 'ip_8821', payment_method_id: 'pm_109', amount: 32.50, currency: 'USD', timestamp: '12:24:30', status: 'APPROVED', country: 'GB', is_fraud: false, fraud_type: 'LEGITIMATE' },
];

export default function DashboardPage() {
  const { lastMessage } = useWebSocket();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [userStopped, setUserStopped] = useState<boolean>(true);
  const [scenario, setScenario] = useState<string>('normal');
  const [stats, setStats] = useState<SimulatorStatus>({
    is_running: false,
    current_scenario: 'normal',
    live_tx_count: 0,
    tps: 0,
    total_amount: 0.0,
    fraud_count: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<PaymentEvent[]>(INITIAL_TRANSACTIONS);

  const scenarioDetails: Record<string, { title: string; desc: string; badge: string; color: string }> = {
    normal: {
      title: 'NORMAL TRAFFIC BASELINE',
      desc: 'Standard merchant payment stream. Average 18 TPS with legitimate customer activity.',
      badge: 'BASELINE',
      color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
    },
    card_testing: {
      title: 'CARD TESTING BOTNET ATTACK',
      desc: 'High-velocity automated botnet firing micro-transactions ($1–$5) across stolen card numbers.',
      badge: 'HIGH VELOCITY BOTNET',
      color: 'text-amber-500 border-amber-500/30 bg-amber-500/10'
    },
    account_farm: {
      title: 'SYBIL ACCOUNT FARM INJECTION',
      desc: 'Burst creation of synthetic customer accounts redeeming welcome promos via shared proxy IPs.',
      badge: 'SYBIL CLUSTER',
      color: 'text-blue-500 border-blue-500/30 bg-blue-500/10'
    },
    fraud_ring: {
      title: 'COORDINATED FRAUD RING (CLUSTER C91)',
      desc: 'Multi-account fraud ring sharing Device D91 & Datacenter Proxy IP attempting high-value cashouts.',
      badge: 'CRITICAL ATTACK RING',
      color: 'text-rose-500 border-rose-500/30 bg-rose-500/10'
    },
    account_takeover: {
      title: 'ACCOUNT TAKEOVER BURST',
      desc: 'Compromised credential login attempts from anomalous foreign ASNs attempting rapid wallet drains.',
      badge: 'CREDENTIAL STUFFING',
      color: 'text-purple-500 border-purple-500/30 bg-purple-500/10'
    }
  };

  // Sample Recharts Trend Data
  const trendData = [
    { time: '12:00', totalTxs: 120, fraudTxs: 4 },
    { time: '12:05', totalTxs: 180, fraudTxs: 8 },
    { time: '12:10', totalTxs: 240, fraudTxs: 14 },
    { time: '12:15', totalTxs: 310, fraudTxs: 38 },
    { time: '12:20', totalTxs: 280, fraudTxs: 12 },
    { time: '12:25', totalTxs: 390, fraudTxs: 6 },
  ];

  const riskDistData = [
    { range: '0-30', count: 1420 },
    { range: '31-60', count: 280 },
    { range: '61-80', count: 94 },
    { range: '81-100', count: 38 },
  ];

  const fetchStatus = async () => {
    try {
      const data = await fetchApi<SimulatorStatus>('/api/v1/simulation/status');
      if (data && !userStopped) {
        setStats((prev) => ({
          ...data,
          is_running: data.is_running,
          live_tx_count: prev.live_tx_count,
          total_amount: prev.total_amount,
          tps: data.tps || 18
        }));
        setIsRunning(data.is_running);
        setScenario(data.current_scenario || 'normal');
      }
    } catch (e) {
      console.error('Failed to fetch simulator status', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Scenario-Aware Live Telemetry Ticker Effect
  useEffect(() => {
    if (!isRunning) return;

    const merchants = ['mch_stripe_01', 'mch_shopify_09', 'mch_amazon_44', 'mch_uber_12', 'mch_razor_05'];
    const countries = ['US', 'IN', 'GB', 'CA', 'DE', 'SG'];

    const interval = setInterval(() => {
      let addedTps = Math.floor(Math.random() * 6) + 16;
      let addedAmount = parseFloat((Math.random() * 150 + 35).toFixed(2));
      let isFraudTick = Math.random() < 0.05;
      let fraudType = 'LEGITIMATE';
      let status = 'APPROVED';

      if (scenario === 'card_testing') {
        addedTps = Math.floor(Math.random() * 12) + 42;
        addedAmount = parseFloat((Math.random() * 4 + 1).toFixed(2));
        isFraudTick = Math.random() < 0.85;
        fraudType = 'CARD_TESTING_BOTNET';
        status = isFraudTick ? 'DECLINED' : 'APPROVED';
      } else if (scenario === 'account_farm') {
        addedTps = Math.floor(Math.random() * 10) + 30;
        addedAmount = parseFloat((Math.random() * 15).toFixed(2));
        isFraudTick = Math.random() < 0.40;
        fraudType = 'SYBIL_ACCOUNT_FARM';
        status = isFraudTick ? 'DECLINED' : 'APPROVED';
      } else if (scenario === 'fraud_ring') {
        addedTps = Math.floor(Math.random() * 8) + 22;
        addedAmount = parseFloat((Math.random() * 3500 + 1200).toFixed(2));
        isFraudTick = Math.random() < 0.60;
        fraudType = 'FRAUD_RING_C91';
        status = isFraudTick ? 'DECLINED' : 'APPROVED';
      } else if (scenario === 'account_takeover') {
        addedTps = Math.floor(Math.random() * 6) + 18;
        addedAmount = parseFloat((Math.random() * 2500 + 800).toFixed(2));
        isFraudTick = Math.random() < 0.50;
        fraudType = 'ACCOUNT_TAKEOVER';
        status = isFraudTick ? 'DECLINED' : 'APPROVED';
      }

      setStats((prev) => ({
        ...prev,
        is_running: true,
        tps: addedTps,
        live_tx_count: prev.live_tx_count + addedTps,
        total_amount: parseFloat((prev.total_amount + addedAmount).toFixed(2)),
        fraud_count: isFraudTick ? prev.fraud_count + 1 : prev.fraud_count
      }));

      const newTx: PaymentEvent = {
        id: `tx_${Math.floor(Math.random() * 899999 + 100000)}`,
        merchant_id: merchants[Math.floor(Math.random() * merchants.length)],
        customer_id: `cust_${Math.floor(Math.random() * 899 + 100)}`,
        device_id: `dev_${Math.floor(Math.random() * 8999 + 1000)}`,
        ip_id: `ip_${Math.floor(Math.random() * 8999 + 1000)}`,
        payment_method_id: `pm_${Math.floor(Math.random() * 899 + 100)}`,
        amount: addedAmount,
        currency: 'USD',
        timestamp: new Date().toLocaleTimeString(),
        status: status,
        country: countries[Math.floor(Math.random() * countries.length)],
        is_fraud: isFraudTick,
        fraud_type: fraudType
      };

      setRecentTransactions((prev) => [newTx, ...prev.slice(0, 19)]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, scenario]);

  useEffect(() => {
    if (lastMessage && lastMessage.event === 'payment_event') {
      const payment: PaymentEvent = lastMessage.data;
      const liveStats: SimulatorStatus = lastMessage.stats;

      if (liveStats && !userStopped) {
        setStats(liveStats);
        setIsRunning(liveStats.is_running);
        setScenario(liveStats.current_scenario);
      }

      setRecentTransactions((prev) => [payment, ...prev.slice(0, 19)]);
    }
  }, [lastMessage, userStopped]);

  const toggleSimulation = async () => {
    if (isRunning) {
      setUserStopped(true);
      setIsRunning(false);
      setStats((prev) => ({ ...prev, is_running: false, tps: 0 }));
      try {
        await fetchApi('/api/v1/simulation/stop', { method: 'POST' });
      } catch (e) {
        console.error('Error stopping simulation', e);
      }
    } else {
      setUserStopped(false);
      setIsRunning(true);
      setStats((prev) => ({ ...prev, is_running: true, tps: 18 }));
      try {
        await fetchApi('/api/v1/simulation/start', {
          method: 'POST',
          body: JSON.stringify({ scenario }),
        });
      } catch (e) {
        console.error('Error starting simulation', e);
      }
    }
  };

  const handleScenarioChange = async (newScenario: string) => {
    setScenario(newScenario);
    setUserStopped(false);
    setIsRunning(true);
    try {
      await fetchApi('/api/v1/simulation/scenario', {
        method: 'POST',
        body: JSON.stringify({ scenario: newScenario }),
      });
      await fetchApi('/api/v1/simulation/start', {
        method: 'POST',
        body: JSON.stringify({ scenario: newScenario }),
      });
    } catch (e) {
      console.error('Error setting scenario', e);
    }
  };

  const scenarios = [
    { id: 'normal', name: 'Normal Traffic' },
    { id: 'card_testing', name: 'Card Testing' },
    { id: 'account_farm', name: 'Account Farm' },
    { id: 'fraud_ring', name: 'Fraud Ring' },
    { id: 'account_takeover', name: 'Account Takeover' },
  ];

  const currentDetails = scenarioDetails[scenario] || scenarioDetails.normal;

  return (
    <div className="space-y-6">
      {/* Top Title & Operations Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">RISK OPERATIONS</h2>
            <span className="text-xs font-mono text-muted">/ Overview Center</span>
          </div>
          <p className="text-xs text-muted mt-0.5">Live transaction risk telemetry & autonomous fraud containment status</p>
        </div>

        {/* Simulation Stream Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono font-bold text-xs transition-all border shadow-sm ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 ring-2 ring-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Ingestion Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start Live Ingestion Stream
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Telemetry Metrics (5 Grid Column Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        <div className="bg-card border border-subtle p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted font-bold tracking-wider">TOTAL PAYMENTS</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-primary">
            {stats.live_tx_count.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted block">
            {isRunning ? 'Live stream count' : 'Stream paused'}
          </span>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted font-bold tracking-wider">STREAM THROUGHPUT</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-primary">
            {isRunning ? stats.tps : 0} <span className="text-xs text-muted font-normal">tps</span>
          </div>
          <span className="text-[10px] text-muted block">Ingestion velocity</span>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted font-bold tracking-wider">AMOUNT PROCESSED</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-primary">
            ${stats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted block">Gross transaction volume</span>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted font-bold tracking-wider">FLAGGED ANOMALIES</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-500">
            {stats.fraud_count}
          </div>
          <span className="text-[10px] text-muted block">Synthetic attack events</span>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted font-bold tracking-wider">PROTECTED SAVINGS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">
            ₹84K <span className="text-xs text-muted font-normal">($4,164)</span>
          </div>
          <span className="text-[10px] text-muted block">Choke point containment</span>
        </div>
      </div>

      {/* Traffic Scenario Selection Bar & Active Scenario Telemetry Banner */}
      <div className="bg-card border border-subtle p-4 rounded-xl space-y-3 font-mono shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted font-bold text-[10px] uppercase tracking-wider mr-2">TRAFFIC SCENARIO:</span>
          {scenarios.map((sc) => {
            const isSelected = scenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioChange(sc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500 text-primary shadow-sm'
                    : 'bg-surface border-subtle text-muted hover:text-primary hover:border-border-strong'
                }`}
              >
                {sc.name}
              </button>
            );
          })}
        </div>

        {/* Active Scenario Context Banner */}
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono transition-all ${currentDetails.color}`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <div>
              <strong className="font-bold block">{currentDetails.title}</strong>
              <span className="text-[11px] opacity-90">{currentDetails.desc}</span>
            </div>
          </div>
          <Badge variant={scenario === 'normal' ? 'success' : 'danger'}>{currentDetails.badge}</Badge>
        </div>
      </div>

      {/* 3D Risk Field Operations Canvas & Attack Velocity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Relational Topology Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-bold font-mono text-muted uppercase tracking-wider">
              3D RISK FIELD OPERATIONS
            </span>
            <Badge variant="info">Relational Topology Stream</Badge>
          </div>

          <div className="flex-1 min-h-[300px] w-full rounded-lg overflow-hidden border border-subtle bg-surface relative">
            <RiskField3D className="w-full h-full min-h-[300px]" />
          </div>
        </div>

        {/* Attack Velocity & Volume Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm flex flex-col font-mono">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2 font-sans">
              <TrendingUp className="w-4 h-4 text-blue-500" /> ATTACK VELOCITY & VOLUME TREND
            </span>
            <Badge variant="success">Realtime Stream</Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="totalTxsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraudTxsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="totalTxs" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#totalTxsGrad)" name="Total Transactions" />
                <Area type="monotone" dataKey="fraudTxs" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#fraudTxsGrad)" name="Flagged Fraud" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Risk Score Distribution & Recent Transactions Buffer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
        {/* Risk Score Distribution Histogram (4 cols) */}
        <div className="lg:col-span-4 bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">RISK SCORE DISTRIBUTION</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistData}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Live Transactions Buffer Table (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-bold text-muted uppercase tracking-wider font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> RECENT INGESTED TRANSACTIONS STREAM
            </span>
            <span className="text-xs text-muted font-mono">{recentTransactions.length} Buffered Events</span>
          </div>

          <div className="overflow-x-auto max-h-64 flex-1">
            <table className="w-full text-left text-xs font-mono text-primary divide-y divide-subtle">
              <thead>
                <tr className="text-muted uppercase">
                  <th className="px-4 py-2.5">Tx ID</th>
                  <th className="px-4 py-2.5">Merchant</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Device / IP</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pattern Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted italic font-sans">
                      Stream paused. Click <strong>&quot;Start Live Ingestion Stream&quot;</strong> above to initiate payment stream telemetry.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-2.5 font-bold text-blue-500">{tx.id}</td>
                      <td className="px-4 py-2.5 text-primary">{tx.merchant_id}</td>
                      <td className="px-4 py-2.5 text-muted">{tx.customer_id}</td>
                      <td className="px-4 py-2.5 text-muted">{tx.device_id} / {tx.ip_id}</td>
                      <td className="px-4 py-2.5 font-bold text-primary">${((tx?.amount ?? 0)).toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={tx.status === 'APPROVED' ? 'success' : 'danger'}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={tx.is_fraud ? 'danger' : 'info'}>
                          {tx.fraud_type}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
