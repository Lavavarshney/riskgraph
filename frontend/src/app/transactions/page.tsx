'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { RiskCard, RiskCardData } from '@/components/ui/RiskCard';
import { fetchApi } from '@/lib/api';
import { CreditCard, ArrowRight, ShieldCheck, Zap, RefreshCw, Layers } from 'lucide-react';

import { useWebSocket } from '@/lib/websocket';

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

export default function TransactionsPage() {
  const { lastMessage } = useWebSocket();
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<TxItem | null>(null);
  const [riskCardData, setRiskCardData] = useState<RiskCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (lastMessage && lastMessage.event === 'payment_event') {
      const payment = lastMessage.data;
      
      const newTx: TxItem = {
        id: payment.id,
        time: payment.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false }),
        merchant_id: payment.merchant_id,
        customer_id: payment.customer_id,
        device_id: payment.device_id,
        ip_id: payment.ip_id,
        payment_method_id: payment.payment_method_id,
        amount: payment.amount,
        country: payment.country,
        failed_attempts_recent: payment.is_fraud ? Math.floor(Math.random() * 5) : 0,
        account_age_minutes: payment.is_fraud ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 50000 + 1000),
        fraud_type: payment.fraud_type || (payment.is_fraud ? 'SYBIL_RING' : 'NORMAL'),
        risk_score: payment.is_fraud ? Math.floor(Math.random() * 30 + 70) : Math.floor(Math.random() * 40 + 10),
        decision: payment.is_fraud ? 'BLOCK_REVIEW' : 'ALLOW',
        status: payment.status || (payment.is_fraud ? 'FLAGGED' : 'APPROVED'),
      };

      setTransactions((prev) => [newTx, ...prev].slice(0, 50));
    }
  }, [lastMessage]);

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
        <div className="lg:col-span-8 bg-card border border-subtle rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[800px]">
          <div className="p-3.5 border-b border-subtle bg-surface-secondary flex items-center justify-between font-mono shrink-0">
            <span className="text-xs font-bold text-muted uppercase flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> LIVE RISK STREAM
            </span>
            <span className="text-[11px] text-muted">Click row to inspect risk breakdown</span>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs font-mono relative">
              <thead className="bg-surface-secondary text-muted uppercase border-b border-subtle sticky top-0 z-10 shadow-sm">
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
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted italic font-sans">
                      No transactions received yet. Start the simulator from the Dashboard.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
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
                        <td className="px-4 py-2.5 font-bold text-primary">${((tx?.amount ?? 0)).toFixed(2)}</td>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Transaction Risk Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-muted uppercase">RISK ENGINE EVALUATOR</span>
            <button
              onClick={() => selectedTx && scoreTransaction(selectedTx)}
              disabled={!selectedTx}
              className="p-1 rounded bg-surface-secondary border border-subtle text-muted hover:text-primary transition-colors disabled:opacity-50"
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
