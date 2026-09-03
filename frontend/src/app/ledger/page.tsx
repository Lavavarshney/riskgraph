'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { History, ShieldCheck, FileText, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface LedgerRecord {
  id: string;
  timestamp: string;
  cluster_id: string;
  action: string;
  target: string;
  reason: string;
  policy_id: string;
  result: string;
}

export default function ActionLedgerPage() {
  const [logs, setLogs] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial sample logs + fetch from backend
    const sampleLogs: LedgerRecord[] = [
      {
        id: 'log_90123',
        timestamp: '12:42:11 UTC',
        cluster_id: 'cls_c91_stealth_ring',
        action: 'QUARANTINE_DEVICE',
        target: 'dev_stealth_c91_primary',
        reason: 'Disrupted network choke point (31 affected transactions, 87% coverage)',
        policy_id: 'POL_CONTAIN_AUTO_v1',
        result: 'SUCCESS',
      },
      {
        id: 'log_90122',
        timestamp: '12:42:04 UTC',
        cluster_id: 'cls_c91_stealth_ring',
        action: 'EVALUATE_POLICY',
        target: 'Merchant Policy #POL_CONTAIN_AUTO_v1',
        reason: 'Automated threshold check passed (14 accounts >= 8 threshold)',
        policy_id: 'POL_CONTAIN_AUTO_v1',
        result: 'PASSED',
      },
      {
        id: 'log_90121',
        timestamp: '12:42:03 UTC',
        cluster_id: 'cls_c91_stealth_ring',
        action: 'CLUSTER_DETECTED',
        target: 'cls_c91_stealth_ring',
        reason: 'Network risk escalated to 94.0 due to 14 shared device accounts',
        policy_id: 'SYSTEM',
        result: 'CONFIRMED',
      },
    ];
    setLogs(sampleLogs);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary tracking-tight">ACTION LEDGER</h2>
            <span className="text-xs font-mono text-muted">/ Audit Log Timeline</span>
          </div>
          <p className="text-xs text-muted mt-0.5">Immutable PostgreSQL ledger tracking all automated & manual containment decisions</p>
        </div>
        <Badge variant="info">Immutable Audit Trail</Badge>
      </div>

      {/* Vertical Timeline */}
      <div className="bg-card border border-subtle rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2 font-sans">
            <History className="w-4 h-4 text-blue-500" /> Containment Execution Audit Trail
          </span>
          <span className="text-xs text-muted">{logs.length} Recorded Entries</span>
        </div>

        <div className="relative pl-6 space-y-6 border-l-2 border-subtle">
          {logs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Timeline Bullet */}
              <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-card ring-2 ring-blue-500/20"></div>

              <div className="p-4 rounded-xl bg-surface-secondary border border-subtle space-y-2 hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-500">{log.action}</span>
                    <span className="text-muted">• Target: <strong className="text-primary">{log.target}</strong></span>
                  </div>
                  <span className="text-muted text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted" /> {log.timestamp}
                  </span>
                </div>

                <p className="text-xs text-primary font-sans leading-relaxed">
                  {log.reason}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-subtle">
                  <span>Cluster: <strong className="text-primary">{log.cluster_id}</strong></span>
                  <span>Policy ID: <strong className="text-primary">{log.policy_id}</strong></span>
                  <Badge variant={log.result === 'SUCCESS' || log.result === 'PASSED' ? 'success' : 'neutral'}>
                    {log.result}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
