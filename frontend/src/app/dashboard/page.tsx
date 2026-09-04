'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useWebSocket } from '@/lib/websocket';
import { fetchApi } from '@/lib/api';
import { Play, Square, Activity, DollarSign, ShieldAlert, Layers, ShieldCheck, TrendingUp, Cpu } from 'lucide-react';
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
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [userStopped, setUserStopped] = useState<boolean>(false);
  const [scenario, setScenario] = useState<string>('normal');
  const [stats, setStats] = useState<SimulatorStatus>({
    is_running: true,
    current_scenario: 'normal',
    live_tx_count: 1420,
    tps: 18,
    total_amount: 84950.0,
    fraud_count: 14,
  });
  const [recentTransactions, setRecentTransactions] = useState<PaymentEvent[]>(INITIAL_TRANSACTIONS);

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
      if (data) {
        setStats((prev) => ({
          ...data,
          is_running: userStopped ? false : (data.is_running ?? true),
          live_tx_count: Math.max(prev.live_tx_count, data.live_tx_count || 1420),
          total_amount: Math.max(prev.total_amount, data.total_amount || 84950.0),
          tps: userStopped ? 0 : (prev.tps || data.tps || 18)
        }));
        if (!userStopped) {
          setIsRunning(data.is_running ?? true);
        }
        setScenario(data.current_scenario || 'normal');
      }
    } catch (e) {
      console.error('Failed to fetch simulator status', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Live Stream Ticker Effect when Ingestion Stream is Active
  useEffect(() => {
    if (!isRunning) return;

    const merchants = ['mch_stripe_01', 'mch_shopify_09', 'mch_amazon_44', 'mch_uber_12', 'mch_razor_05'];
    const countries = ['US', 'IN', 'GB', 'CA', 'DE', 'SG'];
    const fraudTypes = ['SYBIL_RING', 'CARD_TESTING', 'ACCOUNT_TAKEOVER', 'PROXY_BURST'];

    const interval = setInterval(() => {
      const addedTps = Math.floor(Math.random() * 8) + 14;
      const addedAmount = parseFloat((Math.random() * 180 + 25).toFixed(2));
      const isFraudTick = Math.random() < 0.08;

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
        status: isFraudTick ? 'DECLINED' : 'APPROVED',
        country: countries[Math.floor(Math.random() * countries.length)],
        is_fraud: isFraudTick,
        fraud_type: isFraudTick ? fraudTypes[Math.floor(Math.random() * fraudTypes.length)] : 'LEGITIMATE'
      };

      setRecentTransactions((prev) => [newTx, ...prev.slice(0, 19)]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

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

        {/* Simulation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono font-bold text-xs transition-all border shadow-sm ${
              isRunning
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
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

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-subtle p-4 rounded-xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono font-bold">
            <span>TOTAL PAYMENTS</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-primary">{stats.live_tx_count.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted flex items-center gap-1">
            <span className="text-emerald-500">Live</span> stream count
          </div>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono font-bold">
            <span>STREAM THROUGHPUT</span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">{stats.tps} <span className="text-xs text-muted font-normal">tps</span></div>
          <div className="text-[10px] font-mono text-muted">Ingestion velocity</div>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono font-bold">
            <span>AMOUNT PROCESSED</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-primary">${stats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] font-mono text-muted">Gross transaction volume</div>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono font-bold">
            <span>FLAGGED ANOMALIES</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">{stats.fraud_count.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted">Synthetic attack events</div>
        </div>

        <div className="bg-card border border-subtle p-4 rounded-xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono font-bold">
            <span>PROTECTED SAVINGS</span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-500">₹84K <span className="text-xs text-muted font-normal">($4,164)</span></div>
          <div className="text-[10px] font-mono text-muted">Choke point containment</div>
        </div>
      </div>

      {/* Traffic Scenario Selector */}
      <div className="bg-card border border-subtle p-3 rounded-xl flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] font-mono font-bold uppercase text-muted whitespace-nowrap">TRAFFIC SCENARIO:</span>
        <div className="flex items-center gap-2">
          {scenarios.map((sc) => {
            const isActive = scenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioChange(sc.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30 font-bold'
                    : 'bg-surface-secondary text-muted border border-subtle hover:text-primary'
                }`}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle Grid: 3D Risk Field & Realtime Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 3D Risk Field Canvas (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <RiskField3D height="220px" />

          {/* Risk Distribution Chart */}
          <div className="bg-card border border-subtle p-4 rounded-xl space-y-3">
            <span className="text-xs font-mono font-bold text-muted uppercase block">Risk Score Distribution</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistData}>
                  <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-primary)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Attack Activity Timeline Chart & Active Clusters (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card border border-subtle p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-muted uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Attack Velocity & Volume Trend
              </span>
              <Badge variant="info">Realtime Stream</Badge>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-primary)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="totalTxs" stroke="var(--accent-blue)" fill="var(--accent-blue-tint)" strokeWidth={2} />
                  <Area type="monotone" dataKey="fraudTxs" stroke="var(--danger)" fill="var(--danger-tint)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Attack Ring Overview */}
          <div className="bg-card border border-subtle p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-mono border-b border-subtle pb-2">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" /> ATTACK CLUSTER #C91 (Sybil Proxy Ring)
              </span>
              <Badge variant="danger">CONFIRMED</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
              <div className="p-2 rounded bg-surface-secondary border border-subtle">
                <span className="text-[9px] text-muted block">ACCOUNTS</span>
                <strong className="text-primary">14</strong>
              </div>
              <div className="p-2 rounded bg-surface-secondary border border-subtle">
                <span className="text-[9px] text-muted block">DEVICES</span>
                <strong className="text-primary">2</strong>
              </div>
              <div className="p-2 rounded bg-surface-secondary border border-subtle">
                <span className="text-[9px] text-muted block">RISK SCORE</span>
                <strong className="text-rose-500">94.0</strong>
              </div>
              <div className="p-2 rounded bg-surface-secondary border border-subtle">
                <span className="text-[9px] text-muted block">CHOKE POINT</span>
                <strong className="text-blue-500">Device D91</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Payment Event Feed Table */}
      <div className="bg-card border border-subtle rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-subtle flex items-center justify-between bg-surface-secondary">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-muted uppercase">REALTIME PAYMENT STREAM FEED</span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
          </div>
          <Badge variant={isRunning ? 'success' : 'neutral'}>
            {isRunning ? `Streaming (${scenario})` : 'Stream Idle'}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-secondary text-muted uppercase border-b border-subtle">
              <tr>
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
                    No live transactions in buffer. Click <strong>&quot;Start Live Ingestion Stream&quot;</strong> above to stream payment events.
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
  );
}
