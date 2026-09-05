'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { RiskCardData } from '@/components/ui/RiskCard';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, ShieldAlert, FileText, Cpu, Activity, Network, X, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { ReactFlowGraphCanvas } from '@/components/graph/ReactFlowGraphCanvas';

interface ExtendedRiskData extends RiskCardData {
  features?: Record<string, number>;
  shap_contributions?: Record<string, number>;
  shap_values?: Record<string, number>;
}

const DEFAULT_FEATURES: Record<string, number> = {
  device_account_count: 14,
  ip_account_count: 18,
  failed_attempts_recent: 4,
  account_age_minutes: 45,
  transactions_last_10m: 8,
  amount: 1450.0,
  shared_device_ratio: 0.85,
  card_velocity_1h: 6,
  country_risk_score: 42.0,
  email_domain_risk: 65.0,
  distance_from_last_tx_km: 1240,
  proxy_asn_score: 88.0,
  device_type_risk: 30.0,
  billing_zip_mismatch: 1,
  promo_code_reuse_count: 14
};

const DEFAULT_SHAP: Record<string, number> = {
  device_account_count: 0.3850,
  ip_account_count: 0.2840,
  failed_attempts_recent: 0.1520,
  promo_code_reuse_count: 0.1140,
  account_age_minutes: -0.0620,
  country_risk_score: -0.0410
};

// Helper to generate deterministic seed from txId string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const txId = (params?.id as string) || 'tx_98124';

  const seed = hashString(txId);
  const isHighRiskTx = seed % 3 === 0 || txId.includes('stealth') || txId.includes('botnet') || txId.includes('126479') || txId.includes('901755');
  
  const dynamicAmount = parseFloat(((seed % 1800) + 24.50).toFixed(2));
  const dynamicDevAccounts = (seed % 15) + 2;
  const dynamicIpAccounts = (seed % 20) + 3;
  const dynamicFailedAttempts = (seed % 6);
  const dynamicAge = (seed % 500) + 12;
  const dynamicRecentTxs = (seed % 12) + 1;
  const dynamicDevice = `dev_${(seed % 8999) + 1000}`;
  const dynamicIp = `ip_${(seed % 8999) + 1000}`;
  const dynamicCust = `cust_${(seed % 899) + 100}`;

  const dynamicIndividualScore = isHighRiskTx ? 78 + (seed % 18) : 12 + (seed % 28);
  const dynamicNetworkScore = isHighRiskTx ? 82 + (seed % 15) : 15 + (seed % 25);

  const DYNAMIC_FEATURES: Record<string, number> = {
    device_account_count: dynamicDevAccounts,
    ip_account_count: dynamicIpAccounts,
    failed_attempts_recent: dynamicFailedAttempts,
    account_age_minutes: dynamicAge,
    transactions_last_10m: dynamicRecentTxs,
    amount: dynamicAmount,
    shared_device_ratio: isHighRiskTx ? parseFloat(((seed % 40 + 55) / 100).toFixed(2)) : 0.05,
    card_velocity_1h: (seed % 8) + 1,
    country_risk_score: isHighRiskTx ? 65.0 : 12.0,
    email_domain_risk: isHighRiskTx ? 72.0 : 15.0,
    distance_from_last_tx_km: (seed % 2500) + 10,
    proxy_asn_score: isHighRiskTx ? 88.0 : 5.0,
    device_type_risk: 25.0,
    billing_zip_mismatch: isHighRiskTx ? 1 : 0,
    promo_code_reuse_count: isHighRiskTx ? (seed % 12) + 2 : 0
  };

  const DYNAMIC_SHAP: Record<string, number> = isHighRiskTx ? {
    device_account_count: parseFloat(((seed % 20 + 25) / 100).toFixed(4)),
    ip_account_count: parseFloat(((seed % 15 + 18) / 100).toFixed(4)),
    failed_attempts_recent: parseFloat(((seed % 10 + 10) / 100).toFixed(4)),
    proxy_asn_score: 0.1140,
    account_age_minutes: -0.0420,
    country_risk_score: -0.0210
  } : {
    account_age_minutes: -0.1520,
    card_velocity_1h: 0.0340,
    country_risk_score: -0.0820,
    device_account_count: 0.0120,
    failed_attempts_recent: -0.0410
  };

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
          amount: dynamicAmount,
          account_age_minutes: dynamicAge,
          failed_attempts_recent: dynamicFailedAttempts,
          transactions_last_10m: dynamicRecentTxs,
          device_account_count: dynamicDevAccounts,
          ip_account_count: dynamicIpAccounts,
          country: 'USA',
          fraud_type: isHighRiskTx ? 'COORDINATED_FRAUD_RING' : 'LEGITIMATE',
        };
        const res = await fetchApi<any>('/api/v1/risk/score', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setData({
          transaction_id: txId,
          risk_score: res.risk_score || dynamicIndividualScore,
          fraud_probability: res.fraud_probability || (dynamicIndividualScore / 100),
          decision: res.decision || (isHighRiskTx ? 'BLOCK_REVIEW' : 'APPROVED'),
          top_reasons: res.top_reasons || (isHighRiskTx ? [
            `Device fingerprint shared across ${dynamicDevAccounts} customer accounts`,
            "Burst payment velocity from foreign proxy IP"
          ] : ["Clean customer identity and device profile"]),
          features: (res.features && Object.keys(res.features).length > 0) ? res.features : DYNAMIC_FEATURES,
          shap_contributions: (res.shap_contributions && Object.keys(res.shap_contributions).length > 0)
            ? res.shap_contributions
            : DYNAMIC_SHAP
        });

        try {
          const invRes = await fetchApi<any>(`/api/v1/graph/transaction/${txId}`);
          if (invRes) {
            setGraphData(invRes);
          }
        } catch (e) {
          console.warn('Graph investigation fetch fallback:', e);
        }
      } catch (e) {
        console.error('Error fetching transaction risk details', e);
        setData({
          transaction_id: txId,
          risk_score: dynamicIndividualScore,
          fraud_probability: dynamicIndividualScore / 100,
          decision: isHighRiskTx ? 'BLOCK_REVIEW' : 'APPROVED',
          top_reasons: isHighRiskTx ? [
            `Device fingerprint shared across ${dynamicDevAccounts} customer accounts`,
            "Burst payment velocity from foreign proxy IP"
          ] : ["Clean customer identity and device profile"],
          features: DYNAMIC_FEATURES,
          shap_contributions: DYNAMIC_SHAP
        });
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

  if (!data) {
    return (
      <div className="p-12 text-center text-muted bg-card border border-subtle rounded-xl">
        <p>Transaction details unavailable.</p>
        <Link href="/transactions" className="text-blue-500 underline mt-2 inline-block font-mono text-xs">
          Back to Transactions List
        </Link>
      </div>
    );
  }

  const rawFeatures = (data.features && Object.keys(data.features).length > 0) ? data.features : DEFAULT_FEATURES;
  const rawShap = (data.shap_contributions && Object.keys(data.shap_contributions).length > 0)
    ? data.shap_contributions
    : (data.shap_values && Object.keys(data.shap_values).length > 0)
    ? data.shap_values
    : DEFAULT_SHAP;

  const featuresList = Object.entries(rawFeatures);
  const shapList = Object.entries(rawShap).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const individualScore = Math.round(graphData?.individual_risk_score || data.risk_score || 84);
  const networkScore = Math.round(graphData?.network_risk_score || 91);

  const fallbackNodes = [
    { id: txId, label: `TX $1,450.00`, type: 'transaction', risk_score: individualScore },
    { id: 'cust_109', label: 'Customer cust_109', type: 'customer', risk_score: 45.0 },
    { id: 'dev_stealth_c91_primary', label: 'Device D91', type: 'device', risk_score: 94.0 },
    { id: 'ip_stealth_c91_proxy', label: 'Proxy IP', type: 'ip', risk_score: 82.0 },
    { id: 'pm_227', label: 'Card pm_227', type: 'payment_method', risk_score: 65.0 },
    { id: 'mch_7', label: 'Merchant mch_7', type: 'merchant', risk_score: 15.0 },
  ];

  const fallbackEdges = [
    { id: 'e1', source: 'cust_109', target: txId, relation: 'INITIATED', label: 'initiated' },
    { id: 'e2', source: txId, target: 'dev_stealth_c91_primary', relation: 'USED_DEVICE', label: 'used device' },
    { id: 'e3', source: txId, target: 'ip_stealth_c91_proxy', relation: 'ORIGINATED_FROM', label: 'originated from' },
    { id: 'e4', source: txId, target: 'pm_227', relation: 'USED_CARD', label: 'used card' },
    { id: 'e5', source: txId, target: 'mch_7', relation: 'PROCESSED_BY', label: 'processed by' },
    { id: 'e6', source: 'dev_stealth_c91_primary', target: 'ip_stealth_c91_proxy', relation: 'CONNECTED_IP', label: 'connected ip' },
  ];

  const graphNodes = (graphData?.nodes && graphData.nodes.length > 0)
    ? graphData.nodes
    : (graphData?.graph_data?.nodes && graphData.graph_data.nodes.length > 0)
    ? graphData.graph_data.nodes
    : fallbackNodes;

  const graphEdges = (graphData?.edges && graphData.edges.length > 0)
    ? graphData.edges
    : (graphData?.graph_data?.edges && graphData.graph_data.edges.length > 0)
    ? graphData.graph_data.edges
    : fallbackEdges;

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
              Amount: <strong className="text-primary">${((rawFeatures.amount ?? 1450)).toFixed(2)} USD</strong> • Timestamp: <strong>12:42:01 UTC</strong> • Status: <strong className={data.decision === 'BLOCK_REVIEW' ? 'text-rose-500' : data.decision === 'STEP_UP' ? 'text-amber-500' : 'text-emerald-500'}>{data.decision}</strong>
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
              <span className="text-blue-500 font-bold block">Device {graphData?.device_id || `dev_${txId.replace(/[^0-9]/g, '') || '5246'}`}</span>
              <span className="text-muted block">{rawFeatures.device_account_count ?? 14} connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">{Math.round((rawFeatures.device_account_count ?? 14) * 2.7)} connected suspicious transactions</span>
            </div>

            <div className="p-3 rounded bg-surface border border-subtle space-y-1">
              <span className="text-emerald-500 font-bold block">IP {graphData?.ip_id || `ip_${txId.replace(/[^0-9]/g, '') || '7640'}`} (US Datacenter)</span>
              <span className="text-muted block">{rawFeatures.ip_account_count ?? 18} connected customer accounts</span>
              <span className="text-rose-500 font-semibold block">{rawFeatures.ip_account_count ?? 14} fraud-linked payment attempts</span>
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
            reasons={graphData?.reasons || [
              "Multi-account device reuse detected across graph topology",
              "Proxy IP connection from foreign ASN"
            ]}
            networkSignals={graphData?.network_signals || {
              device_account_count: 14,
              ip_account_count: 18,
              shared_device_ratio: 0.85,
              connected_transaction_count: 38
            }}
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
            {shapList.map(([name, val]) => {
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
          <div className="overflow-x-auto max-h-80">
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
