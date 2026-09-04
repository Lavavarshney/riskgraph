'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { RiskCardData } from '@/components/ui/RiskCard';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, ShieldAlert, FileText, Cpu, Activity, Network, X, CornerDownRight } from 'lucide-react';
import { ReactFlowGraphCanvas } from '@/components/graph/ReactFlowGraphCanvas';

interface ExtendedRiskData extends RiskCardData {
  features?: Record<string, number>;
  shap_contributions?: Record<string, number>;
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const txId = (params?.id as string) || 'tx_stealth_01';

  const [data, setData] = useState<ExtendedRiskData | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);
  const [showNetwork, setShowNetwork] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadScoring() {
      setLoading(true);
      try {
        const payload = {
          id: txId,
          amount: 1450.0,
          account_age_minutes: 45,
          failed_attempts_recent: 4,
          transactions_last_10m: 8,
          device_account_count: 14,
          ip_account_count: 18,
          country: 'USA',
          fraud_type: 'COORDINATED_FRAUD_RING',
        };
        const res = await fetchApi<ExtendedRiskData>('/api/v1/risk/score', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(res);

        // Fetch Graph Relationship Investigation
        try {
          const invRes = await fetchApi<any>(`/api/v1/graph/transaction/${txId}`);
          if (invRes && invRes.graph_data) {
            setGraphData(invRes);
          }
        } catch (e) {
          console.warn('Graph investigation fetch fallback:', e);
        }
      } catch (e) {
        console.error('Error fetching transaction risk details', e);
      } finally {
        setLoading(false);
      }
    }
    loadScoring();
  }, [txId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted font-mono">
        <Activity className="w-6 h-6 text-blue-500 mx-auto animate-spin mb-2" />
        Loading Transaction Risk & Network Graph Details...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-muted">
        <p>Transaction details unavailable.</p>
        <Link href="/transactions" className="text-blue-500 underline mt-2 inline-block font-mono text-xs">
          Back to Transactions List
        </Link>
      </div>
    );
  }

  const featuresList = data.features ? Object.entries(data.features) : [];
  const shapList = data.shap_contributions
    ? Object.entries(data.shap_contributions).sort((a, b) => b[1] - a[1])
    : [];

  const individualScore = Math.round(graphData?.individual_risk_score || data.risk_score);
  const networkScore = Math.round(graphData?.network_risk_score || 91);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-3">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Transactions Stream
        </Link>

        <button
          onClick={() => setShowNetwork(!showNetwork)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
        >
          <Network className="w-3.5 h-3.5" />
          {showNetwork ? 'HIDE NETWORK GRAPH' : 'INVESTIGATE NETWORK'}
        </button>
      </div>

      {/* Main Header & Transaction Summary Card */}
      <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black font-mono text-primary tracking-tight">{txId}</h2>
              <Badge variant={data.decision === 'BLOCK_REVIEW' ? 'danger' : data.decision === 'STEP_UP' ? 'warning' : 'success'}>
                {data.decision}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-1 font-mono">
              Amount: <strong className="text-primary">$1,450.00 USD</strong> • Timestamp: <strong>12:42:01 UTC</strong> • Status: <strong className="text-rose-500">FLAGGED</strong>
            </p>
          </div>
        </div>

        {/* TWO-COLUMN RISK SECTION (Per User Prompt Specifications) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {/* INDIVIDUAL TRANSACTION RISK */}
          <div className="p-4 rounded-xl bg-surface-secondary border border-subtle space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              INDIVIDUAL TRANSACTION RISK
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">{individualScore} <span className="text-xs text-muted font-normal">/ 100</span></span>
              <span className={`text-xs font-bold ${individualScore >= 70 ? 'text-rose-500' : individualScore >= 35 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {individualScore >= 70 ? 'HIGH' : individualScore >= 35 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>
            <p className="text-[11px] text-muted leading-tight">
              Single-transaction XGBoost probability score based on isolated telemetry.
            </p>
          </div>

          {/* NETWORK RISK */}
          <div className="p-4 rounded-xl bg-surface-secondary border border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                NETWORK GRAPH RISK
              </span>
              <Badge variant="danger">ESCALATED</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-500">{networkScore} <span className="text-xs text-muted font-normal">/ 100</span></span>
              <span className="text-xs font-bold text-rose-500">HIGH (CRITICAL)</span>
            </div>
            <p className="text-[11px] text-muted leading-tight">
              Escalated graph risk calculated across shared devices, datacenter IPs, and promo ring edges.
            </p>
          </div>
        </div>

        {/* NETWORK CONTEXT SUMMARY PANEL */}
        <div className="p-4 rounded-xl bg-surface-secondary border border-subtle space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
              <Network className="w-4 h-4 text-blue-500" /> NETWORK INFRASTRUCTURE CONTEXT
            </span>
            <Link
              href="/network"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Investigate Full Graph <CornerDownRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-surface border border-subtle space-y-1">
              <span className="text-blue-500 font-bold block">Device dev_stealth_c91_primary</span>
              <span className="text-muted block">14 connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">38 connected suspicious transactions</span>
            </div>

            <div className="p-3 rounded bg-surface border border-subtle space-y-1">
              <span className="text-emerald-500 font-bold block">IP ip_stealth_c91_proxy (US Datacenter)</span>
              <span className="text-muted block">14 connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">14 fraud-linked payment attempts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render Subgraph Canvas if Toggled */}
      {showNetwork && graphData?.graph_data && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-surface-secondary p-3 rounded-xl border border-subtle text-xs font-mono">
            <span className="text-primary font-bold">Connected Infrastructure Subgraph for {txId}</span>
            <button onClick={() => setShowNetwork(false)} className="text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ReactFlowGraphCanvas
            nodes={graphData.graph_data.nodes || []}
            edges={graphData.graph_data.edges || []}
            networkRiskScore={networkScore}
            reasons={graphData.network_reasons || []}
            networkSignals={graphData.graph_data.network_signals}
            title={`Infrastructure Graph for ${txId}`}
            height="500px"
          />
        </div>
      )}

      {/* SHAP Contributions & Feature Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SHAP Feature Contributions (Horizontal Bars) */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm">
          <h3 className="text-sm font-bold font-sans text-primary flex items-center gap-2 border-b border-subtle pb-2">
            <Cpu className="w-4 h-4 text-blue-500" /> SHAP Feature Attribution Breakdown
          </h3>
          <div className="space-y-2.5 text-xs font-mono">
            {shapList.slice(0, 7).map(([name, val]) => {
              const maxVal = Math.max(...shapList.map(([, v]) => Math.abs(v)), 0.1);
              const widthPct = Math.min(100, Math.max(5, (Math.abs(val) / maxVal) * 100));
              const isPositive = val > 0;
              return (
                <div key={name}>
                  <div className="flex justify-between text-primary mb-1">
                    <span>{name}</span>
                    <span className={isPositive ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                      {isPositive ? `+${(val ?? 0).toFixed(4)}` : (val ?? 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden border border-subtle">
                    <div
                      className={`h-full rounded-full ${isPositive ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 15 Feature Inspection Matrix */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm">
          <h3 className="text-sm font-bold font-sans text-primary flex items-center gap-2 border-b border-subtle pb-2">
            <FileText className="w-4 h-4 text-emerald-500" /> Feature Inspection Matrix
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs font-mono text-primary divide-y divide-subtle">
              <thead>
                <tr className="text-muted uppercase">
                  <th className="pb-2">Feature Name</th>
                  <th className="pb-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {featuresList.map(([key, val]) => (
                  <tr key={key} className="hover:bg-surface-secondary transition-colors">
                    <td className="py-1.5 text-muted">{key}</td>
                    <td className="py-1.5 text-right font-bold text-primary">
                      {typeof val === 'number' ? (val % 1 !== 0 ? (val ?? 0).toFixed(2) : val) : (val ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
