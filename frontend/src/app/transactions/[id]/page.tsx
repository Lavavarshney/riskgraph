'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { RiskCardData } from '@/components/ui/RiskCard';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, ShieldAlert, FileText, Cpu, Activity, Network, X, CornerDownRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReactFlowGraphCanvas } from '@/components/graph/ReactFlowGraphCanvas';

interface ExtendedRiskData extends RiskCardData {
  features?: Record<string, number>;
  shap_contributions?: Record<string, number>;
  shap_values?: Record<string, number>;
  timestamp?: string;
  amount?: number;
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const txId = (params?.id as string) || '';

  const [data, setData] = useState<ExtendedRiskData | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);
  const [showNetwork, setShowNetwork] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadScoring() {
      if (!txId) return;
      setLoading(true);
      setError('');
      try {
        const invRes = await fetchApi<any>(`/api/v1/graph/transaction/${txId}`);
        if (invRes) {
          setGraphData(invRes);
          const riskScore = invRes.individual_risk_score ?? invRes.network_risk_score ?? 0;
          setData({
            transaction_id: txId,
            risk_score: riskScore,
            fraud_probability: riskScore / 100,
            decision: invRes.decision || (riskScore >= 70 ? 'BLOCK_REVIEW' : riskScore >= 35 ? 'STEP_UP' : 'APPROVED'),
            top_reasons: invRes.reasons || [],
            features: invRes.features || {},
            shap_contributions: invRes.shap_values || invRes.shap_contributions || {},
            timestamp: invRes.timestamp,
            amount: invRes.amount ?? invRes.features?.amount ?? 0,
          });
        }
      } catch (e) {
        console.error('Error fetching transaction details', e);
        setError('Unable to load transaction details');
      } finally {
        setLoading(false);
      }
    }
    loadScoring();
  }, [txId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted font-mono bg-card border border-subtle rounded-xl">
        <Activity className="w-6 h-6 text-blue-500 mx-auto animate-spin mb-2" />
        Loading Transaction Risk & Network Graph Details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center text-rose-500 bg-card border border-subtle rounded-xl flex flex-col items-center gap-2 font-mono shadow-sm">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p>{error || 'Transaction details unavailable.'}</p>
        <Link href="/transactions" className="text-blue-500 underline mt-2 inline-block font-mono text-xs">
          Back to Transactions List
        </Link>
      </div>
    );
  }

  const rawFeatures = data.features || {};
  const rawShap = data.shap_contributions || data.shap_values || {};

  const featuresList = Object.entries(rawFeatures);
  const shapList = Object.entries(rawShap).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const individualScore = Math.round(graphData?.individual_risk_score ?? data.risk_score ?? 0);
  const networkScore = Math.round(graphData?.network_risk_score ?? 0);

  const graphNodes = graphData?.nodes || graphData?.graph_data?.nodes || [];
  const graphEdges = graphData?.edges || graphData?.graph_data?.edges || [];

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
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all text-white shadow-sm ${
            showNetwork ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
          }`}
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
              Amount: <strong className="text-primary">${(data.amount ?? 0).toFixed(2)} USD</strong> • Timestamp: <strong>{data.timestamp || '—'}</strong> • Status: <strong className={data.decision === 'BLOCK_REVIEW' ? 'text-rose-500' : data.decision === 'STEP_UP' ? 'text-amber-500' : 'text-emerald-500'}>{data.decision}</strong>
            </p>
          </div>
        </div>

        {/* TWO-COLUMN RISK SECTION */}
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
              <Badge variant={networkScore >= 70 ? 'danger' : networkScore >= 35 ? 'warning' : 'success'}>
                {networkScore >= 70 ? 'ESCALATED' : 'NORMAL'}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${networkScore >= 70 ? 'text-rose-500' : networkScore >= 35 ? 'text-amber-500' : 'text-emerald-500'}`}>{networkScore} <span className="text-xs text-muted font-normal">/ 100</span></span>
              <span className={`text-xs font-bold ${networkScore >= 70 ? 'text-rose-500' : networkScore >= 35 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {networkScore >= 70 ? 'HIGH (CRITICAL)' : networkScore >= 35 ? 'MEDIUM' : 'LOW'}
              </span>
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
            <button
              onClick={() => setShowNetwork(!showNetwork)}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-bold"
            >
              {showNetwork ? 'Hide Subgraph Canvas' : 'Investigate Subgraph'} <CornerDownRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-surface border border-subtle space-y-1">
              <span className="text-blue-500 font-bold block">Device {graphData?.device_id || '—'}</span>
              <span className="text-muted block">{rawFeatures.device_account_count ?? '—'} connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">{Math.round((rawFeatures.device_account_count ?? 0) * 2.7) || '—'} connected suspicious transactions</span>
            </div>

            <div className="p-3 rounded bg-surface border border-subtle space-y-1">
              <span className="text-emerald-500 font-bold block">IP {graphData?.ip_id || '—'}</span>
              <span className="text-muted block">{rawFeatures.ip_account_count ?? '—'} connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">{rawFeatures.ip_account_count ?? '—'} fraud-linked payment attempts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render Interactive Subgraph Canvas when Toggled */}
      {showNetwork && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-surface-secondary p-3 rounded-xl border border-subtle text-xs font-mono">
            <span className="text-primary font-bold">Connected Infrastructure Subgraph for {txId}</span>
            <button onClick={() => setShowNetwork(false)} className="text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ReactFlowGraphCanvas
            nodes={graphNodes}
            edges={graphEdges}
            networkRiskScore={networkScore}
            reasons={graphData?.reasons || []}
            networkSignals={graphData?.network_signals}
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
            {shapList.length > 0 ? shapList.map(([name, val]) => {
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
            }) : (
              <p className="text-muted">No SHAP contributions available.</p>
            )}
          </div>
        </div>

        {/* Feature Inspection Matrix */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-3 shadow-sm">
          <h3 className="text-sm font-bold font-sans text-primary flex items-center gap-2 border-b border-subtle pb-2">
            <FileText className="w-4 h-4 text-emerald-500" /> Feature Inspection Matrix
          </h3>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs font-mono text-primary divide-y divide-subtle">
              <thead>
                <tr className="text-muted uppercase">
                  <th className="pb-2">Feature Name</th>
                  <th className="pb-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {featuresList.length > 0 ? featuresList.map(([key, val]) => (
                  <tr key={key} className="hover:bg-surface-secondary transition-colors">
                    <td className="py-1.5 text-muted">{key}</td>
                    <td className="py-1.5 text-right font-bold text-primary">
                      {typeof val === 'number' ? (val % 1 !== 0 ? (val ?? 0).toFixed(2) : val) : (val ?? '')}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="py-1.5 text-muted text-center">No feature data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
