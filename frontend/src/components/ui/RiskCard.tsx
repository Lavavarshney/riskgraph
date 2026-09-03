import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface RiskCardData {
  transaction_id: string;
  risk_score: number;
  fraud_probability: number;
  decision: 'ALLOW' | 'STEP_UP' | 'BLOCK_REVIEW' | string;
  top_reasons: string[];
}

export const RiskCard: React.FC<{ data: RiskCardData; className?: string }> = ({ data, className }) => {
  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return <Badge variant="success">ALLOW</Badge>;
      case 'STEP_UP':
        return <Badge variant="warning">STEP_UP</Badge>;
      case 'BLOCK_REVIEW':
        return <Badge variant="danger">BLOCK_REVIEW</Badge>;
      default:
        return <Badge variant="neutral">{decision}</Badge>;
    }
  };

  const isHighRisk = data.risk_score >= 70;
  const isMedRisk = data.risk_score >= 35 && data.risk_score < 70;

  return (
    <div className={`bg-card border border-subtle rounded-xl p-4 space-y-3.5 shadow-sm ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-mono font-bold text-primary">{data.transaction_id}</span>
        </div>
        {getDecisionBadge(data.decision)}
      </div>

      {/* Main Score Metrics */}
      <div className="grid grid-cols-2 gap-2 text-center font-mono">
        <div className="p-3 rounded-lg bg-surface-secondary border border-subtle flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase text-muted font-bold">RISK SCORE</span>
          <div className="text-2xl font-black text-primary mt-0.5">
            <span className={isHighRisk ? 'text-rose-500' : isMedRisk ? 'text-amber-500' : 'text-emerald-500'}>
              {Math.round(data.risk_score)}
            </span>
            <span className="text-xs text-muted font-normal"> / 100</span>
          </div>
          <span className="text-[9px] text-muted capitalize mt-0.5">
            {isHighRisk ? 'High Risk' : isMedRisk ? 'Medium Risk' : 'Low Risk'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-surface-secondary border border-subtle flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase text-muted font-bold">FRAUD PROBABILITY</span>
          <div className="text-2xl font-black text-primary mt-0.5">
            {(data.fraud_probability * 100).toFixed(1)}%
          </div>
          <div className="w-full bg-border border-subtle h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full ${isHighRisk ? 'bg-rose-500' : isMedRisk ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(5, data.fraud_probability * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Dynamic SHAP Signals */}
      {data.top_reasons && data.top_reasons.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider block">
            TOP CONTRIBUTING SIGNALS
          </span>
          <div className="space-y-1">
            {data.top_reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-surface-secondary border border-subtle text-xs text-primary leading-tight">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
