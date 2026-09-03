'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { RiskCard, RiskCardData } from '@/components/ui/RiskCard';
import { fetchApi } from '@/lib/api';
import { CreditCard, ArrowRight, ShieldCheck, Zap, RefreshCw, Layers } from 'lucide-react';

interface TxItem {
  id: string;
  time: string;
  merchant_id: string;
  customer_id: string;
  device_id: string;
  ip_id: string;
  payment_method_id: string;
  amount: number;
  country: string;
  failed_attempts_recent: number;
  account_age_minutes: number;
  fraud_type: string;
  risk_score: number;
  decision: string;
  status: string;
}

const sampleTransactions: TxItem[] = [
  {
    id: 'tx_stealth_01',
    time: '12:42:01',
    merchant_id: 'merch_gaming_vault',
    customer_id: 'cust_stealth_01',
    device_id: 'dev_stealth_c91_primary',
    ip_id: 'ip_stealth_c91_proxy',
    payment_method_id: 'pm_4881',
    amount: 49.99,
    country: 'USA',
    failed_attempts_recent: 4,
    account_age_minutes: 45,
    fraud_type: 'COORDINATED_FRAUD_RING',
    risk_score: 84,
    decision: 'BLOCK_REVIEW',
    status: 'FLAGGED',
  },
  {
    id: 'tx_891024',
    time: '12:41:45',
    merchant_id: 'merch_tech_direct',
    customer_id: 'cust_901',
    device_id: 'dev_44',
    ip_id: 'ip_102',
    payment_method_id: 'pm_1029',
    amount: 42.50,
    country: 'USA',
    failed_attempts_recent: 0,
    account_age_minutes: 25000,
    fraud_type: 'NORMAL',
    risk_score: 18,
    decision: 'ALLOW',
    status: 'APPROVED',
  },
  {
    id: 'tx_891025',
    time: '12:40:12',
    merchant_id: 'merch_digital_goods',
    customer_id: 'cust_6420',
    device_id: 'dev_4890',
    ip_id: 'ip_3901',
    payment_method_id: 'pm_9012',
    amount: 720.00,
    country: 'NGA',
    failed_attempts_recent: 3,
    account_age_minutes: 45000,
    fraud_type: 'ACCOUNT_TAKEOVER',
    risk_score: 68,
    decision: 'STEP_UP',
    status: 'CHALLENGED',
  },
  {
    id: 'tx_891026',
    time: '12:38:50',
    merchant_id: 'merch_global_retail',
    customer_id: 'cust_882',
    device_id: 'dev_12',
    ip_id: 'ip_99',
    payment_method_id: 'pm_3341',
    amount: 1250.00,
    country: 'USA',
    failed_attempts_recent: 1,
    account_age_minutes: 120,
    fraud_type: 'CARD_TESTING',
    risk_score: 76,
    decision: 'BLOCK_REVIEW',
    status: 'FLAGGED',
  },
];

export default function TransactionsPage() {
  const [selectedTx, setSelectedTx] = useState<TxItem>(sampleTransactions[0]);
  const [riskCardData, setRiskCardData] = useState<RiskCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const scoreTransaction = async (tx: TxItem) => {
    setSelectedTx(tx);
    setLoading(true);
    try {
      const res = await fetchApi<RiskCardData>('/api/v1/risk/score', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
      setRiskCardData(res);
    } catch (e) {
      console.error('Error scoring transaction', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">LIVE TRANSACTIONS</h2>
            <span className="text-xs font-mono text-muted">/ Risk Stream</span>
          </div>
          <p className="text-xs text-muted mt-0.5">Dense transaction stream scored by XGBoost ML and graph intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Transaction Table (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-subtle rounded-xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-subtle bg-surface-secondary flex items-center justify-between font-mono">
            <span className="text-xs font-bold text-muted uppercase">TRANSACTION RISK STREAM</span>
            <span className="text-[11px] text-muted">Click row to inspect risk breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-secondary text-muted uppercase border-b border-subtle">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Transaction</th>
                  <th className="px-4 py-2.5">Merchant</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Risk Score</th>
                  <th className="px-4 py-2.5">Decision</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {sampleTransactions.map((tx) => {
                  const isSelected = selectedTx.id === tx.id;
                  const isHigh = tx.risk_score >= 70;
                  const isMed = tx.risk_score >= 35 && tx.risk_score < 70;
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => scoreTransaction(tx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500/10 text-primary border-l-2 border-blue-500' : 'hover:bg-surface-secondary'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-muted">{tx.time}</td>
                      <td className="px-4 py-2.5 font-bold text-blue-500">{tx.id}</td>
                      <td className="px-4 py-2.5 text-primary">{tx.merchant_id}</td>
                      <td className="px-4 py-2.5 text-muted">{tx.customer_id}</td>
                      <td className="px-4 py-2.5 font-bold text-primary">${tx.amount.toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={isHigh ? 'text-rose-500' : isMed ? 'text-amber-500' : 'text-emerald-500'}>
                            {tx.risk_score}
                          </span>
                          <span className="text-[10px] text-muted uppercase">
                            ({isHigh ? 'HIGH' : isMed ? 'MED' : 'LOW'})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={tx.decision === 'BLOCK_REVIEW' ? 'danger' : tx.decision === 'STEP_UP' ? 'warning' : 'success'}>
                          {tx.decision}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{tx.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Transaction Risk Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-muted uppercase">RISK ENGINE EVALUATOR</span>
            <button
              onClick={() => scoreTransaction(selectedTx)}
              className="p-1 rounded bg-surface-secondary border border-subtle text-muted hover:text-primary transition-colors"
              title="Re-run Risk Scoring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {riskCardData ? (
            <div className="space-y-3">
              <RiskCard data={riskCardData} />
              <Link
                href={`/transactions/${riskCardData.transaction_id}`}
                className="w-full py-2.5 px-4 bg-primary hover:bg-blue-600 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Inspect Full Transaction Details <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center bg-card border border-subtle rounded-xl space-y-3">
              <ShieldCheck className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="text-xs text-muted font-sans">Click any transaction in the table to evaluate with XGBoost & SHAP explainer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
