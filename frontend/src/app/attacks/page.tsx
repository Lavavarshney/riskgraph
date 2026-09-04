'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { ShieldAlert, Target, Activity, CheckCircle, AlertTriangle, Layers, ArrowRight, ShieldCheck, CornerDownRight } from 'lucide-react';
import { ReactFlowGraphCanvas } from '@/components/graph/ReactFlowGraphCanvas';

interface ContainmentCandidate {
  option_id: string;
  action: string;
  target_id: string;
  target_label: string;
  transactions_affected: number;
  estimated_loss_prevented: number;
  collateral_risk: string;
  coverage_percentage: number;
  reason: string;
  is_recommended: boolean;
  operational_cost: string;
}

interface ActionLogRecord {
  id: string;
  timestamp: string;
  cluster_id: string;
  action: string;
  target: string;
  reason: string;
  policy_id: string;
  result: string;
}

export default function AttacksPage() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Containment Optimizer State
  const [containmentOptions, setContainmentOptions] = useState<ContainmentCandidate[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [actionLogRecord, setActionLogRecord] = useState<ActionLogRecord | null>(null);

  // Policy Block & Manual Approval Override State
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [blockedAction, setBlockedAction] = useState<ContainmentCandidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<ContainmentCandidate | null>(null);

  // Counterfactual Simulator State
  const [counterfactual, setCounterfactual] = useState<any | null>(null);
  const [loadingCounterfactual, setLoadingCounterfactual] = useState(false);
  const [viewMode, setViewMode] = useState<'BOTH' | 'WITHOUT' | 'WITH'>('BOTH');
  const [containing, setContaining] = useState<string | null>(null);

  const fetchClusters = async () => {
    try {
      const data = await fetchApi<any[]>('/attacks/active');
      setClusters(data);
      if (data.length > 0 && !selectedCluster) {
        setSelectedCluster(data[0]);
      }
    } catch (e) {
      console.error('Failed to fetch attack clusters:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchChokePoints = async (clusterId: string) => {
    setLoadingOptions(true);
    setActionLogRecord(null);
    setBlockedReason(null);
    setBlockedAction(null);
    try {
      const data = await fetchApi<ContainmentCandidate[]>(`/attacks/${clusterId}/containment-options`);
      setContainmentOptions(data);
    } catch (e) {
      console.error('Failed to fetch containment choke points:', e);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchCounterfactual = async (clusterId: string) => {
    setLoadingCounterfactual(true);
    try {
      const data = await fetchApi<any>(`/attacks/${clusterId}/counterfactual`);
      setCounterfactual(data);
    } catch (e) {
      console.error('Failed to fetch counterfactual simulation:', e);
    } finally {
      setLoadingCounterfactual(false);
    }
  };

  const requestExecuteContainment = (option: ContainmentCandidate) => {
    setPendingAction(option);
    setShowConfirmModal(true);
  };

  const executeContainmentStrategy = async (clusterId: string, option: ContainmentCandidate) => {
    setShowConfirmModal(false);
    setContaining(clusterId);
    setBlockedReason(null);
    setBlockedAction(null);

    try {
      const result = await fetchApi<any>(`/attacks/${clusterId}/contain`, {
        method: 'POST',
        body: JSON.stringify({
          action: option.action,
          target_id: option.target_id,
          reason: option.reason
        })
      });

      if (result.status === 'REQUIRES_MANUAL_APPROVAL') {
        setBlockedReason(result.reason);
        setBlockedAction(option);
      } else {
        setActionLogRecord(result.log_record || result);
        fetchClusters();
      }
    } catch (e) {
      console.error('Failed to execute containment:', e);
    } finally {
      setContaining(null);
    }
  };

  const overrideContainmentAction = async (clusterId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!blockedAction) return;
    setContaining(clusterId);
    try {
      const result = await fetchApi<any>(`/attacks/${clusterId}/contain/override`, {
        method: 'POST',
        body: JSON.stringify({
          action: blockedAction.action,
          target_id: blockedAction.target_id,
          decision: decision
        })
      });
      setBlockedReason(null);
      setBlockedAction(null);
      setActionLogRecord(result.log_record);
      fetchClusters();
    } catch (e) {
      console.error('Override error:', e);
    } finally {
      setContaining(null);
    }
  };

  const recommendedOption = containmentOptions.find(o => o.is_recommended) || containmentOptions[0];
  const alternativeOptions = containmentOptions.filter(o => o.option_id !== recommendedOption?.option_id);

  const attackLifecycleSteps = [
    { num: 1, label: 'ATTACK EMERGING' },
    { num: 2, label: 'RELATIONSHIP DETECTED' },
    { num: 3, label: 'CLUSTER CONFIRMED' },
    { num: 4, label: 'CONTAINMENT RECOMMENDED' },
    { num: 5, label: 'CONTAINED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">ACTIVE ATTACKS</h2>
            <span className="text-xs font-mono text-muted">/ Coordinated Fraud Clusters</span>
          </div>
          <p className="text-xs text-muted mt-0.5">Realtime attack detection, choke point containment analysis, and counterfactual simulation</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted font-mono">
          <Activity className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
          Loading Active Attack Clusters...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Active Cluster List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider block">
              DETECTED CLUSTERS ({clusters.length})
            </span>

            {clusters.length === 0 ? (
              <div className="p-6 bg-card border border-subtle rounded-xl text-center text-muted text-xs font-mono italic">
                No active attack clusters detected.
              </div>
            ) : (
              clusters.map((cluster) => {
                const isSelected = selectedCluster?.cluster_id === cluster.cluster_id;
                const isHigh = cluster.final_combined_risk >= 70;
                return (
                  <div
                    key={cluster.cluster_id}
                    onClick={() => {
                      setSelectedCluster(cluster);
                      setContainmentOptions([]);
                      setCounterfactual(null);
                      setActionLogRecord(null);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 font-mono ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500 text-primary shadow-sm'
                        : 'bg-card border-subtle hover:bg-surface-secondary text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-primary">{cluster.cluster_name}</span>
                      <Badge variant={cluster.status === 'CONTAINED' ? 'success' : isHigh ? 'danger' : 'warning'}>
                        {cluster.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-1.5 rounded bg-surface-secondary border border-subtle">
                        <span className="text-muted block">ACCOUNTS</span>
                        <strong className="text-primary">{cluster.affected_accounts}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-surface-secondary border border-subtle">
                        <span className="text-muted block">DEVICES</span>
                        <strong className="text-primary">{cluster.affected_devices}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-surface-secondary border border-subtle">
                        <span className="text-muted block">RISK</span>
                        <strong className={isHigh ? 'text-rose-500' : 'text-amber-500'}>{cluster.final_combined_risk}</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Cluster Investigation & Containment Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedCluster && (
              <>
                {/* Cluster Detail Header */}
                <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                        <h3 className="font-extrabold text-primary text-base font-sans">{selectedCluster.cluster_name}</h3>
                      </div>
                      <span className="text-xs font-mono text-muted">ID: {selectedCluster.cluster_id} • Pattern: {selectedCluster.pattern_type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchChokePoints(selectedCluster.cluster_id)}
                        disabled={loadingOptions}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Target className="w-3.5 h-3.5" />
                        {loadingOptions ? 'Calculating...' : 'FIND CHOKE POINT'}
                      </button>

                      <button
                        onClick={() => fetchCounterfactual(selectedCluster.cluster_id)}
                        disabled={loadingCounterfactual}
                        className="px-3 py-1.5 bg-surface-secondary hover:bg-subtle text-primary border border-subtle font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        {loadingCounterfactual ? 'Simulating...' : 'SIMULATE IMPACT'}
                      </button>
                    </div>
                  </div>

                  {/* Lifecycle Stepper Bar */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold text-muted uppercase block">ATTACK LIFECYCLE STEPPER</span>
                    <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                      {attackLifecycleSteps.map((s) => {
                        const isCurrent = selectedCluster.status === 'CONTAINED' ? s.num === 5 : s.num === 4;
                        return (
                          <div
                            key={s.num}
                            className={`p-2 rounded text-[10px] border transition-all ${
                              isCurrent
                                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold'
                                : s.num < 4
                                ? 'bg-surface-secondary border-subtle text-muted'
                                : 'bg-surface-secondary border-subtle text-muted opacity-50'
                            }`}
                          >
                            {s.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Relational Graph Viewport */}
                  <div className="pt-2">
                    <ReactFlowGraphCanvas
                      nodes={selectedCluster.nodes || []}
                      edges={selectedCluster.edges || []}
                      networkRiskScore={selectedCluster.final_combined_risk || 94}
                      reasons={selectedCluster.risk_reasons || []}
                      title={`Graph Topology for ${selectedCluster.cluster_id}`}
                      height="400px"
                    />
                  </div>
                </div>

                {/* CONTAINMENT ANALYSIS OPTIMIZER PANEL */}
                {containmentOptions.length > 0 && (
                  <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm font-mono">
                    <div className="flex items-center justify-between border-b border-subtle pb-2">
                      <span className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-blue-500" /> FRAUD CONTAINMENT OPTIMIZER (CHOKE POINT ANALYSIS)
                      </span>
                      <Badge variant="info">Ranked by Coverage</Badge>
                    </div>

                    {/* Recommended Strategy Card */}
                    {recommendedOption && (
                      <div className="p-4 rounded-xl bg-surface-secondary border border-blue-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-500 uppercase">RECOMMENDED CHOKE POINT</span>
                          <Badge variant="success">{recommendedOption.coverage_percentage}% ATTACK COVERAGE</Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-extrabold text-primary text-sm block">{recommendedOption.target_label}</span>
                            <span className="text-muted text-[11px]">Action: <strong className="text-blue-500">{recommendedOption.action}</strong></span>
                          </div>
                          <div className="text-right">
                            <span className="text-primary font-bold block">${recommendedOption.estimated_loss_prevented.toFixed(2)} Loss Prevented</span>
                            <span className="text-muted text-[10px]">{recommendedOption.transactions_affected} Txs Affected</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted leading-tight border-t border-subtle pt-2">
                          Reason: {recommendedOption.reason}
                        </p>

                        {/* Execute Action Button */}
                        <div className="pt-2">
                          <button
                            onClick={() => requestExecuteContainment(recommendedOption)}
                            disabled={containing === selectedCluster.cluster_id || selectedCluster.status === 'CONTAINED'}
                            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:bg-surface-secondary text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            {containing === selectedCluster.cluster_id ? 'Executing Containment...' : selectedCluster.status === 'CONTAINED' ? 'CLUSTER CONTAINED' : 'EXECUTE CONTAINMENT STRATEGY'}
                          </button>
                        </div>

                        {/* Blocked by Policy Alert */}
                        {blockedReason && blockedAction?.option_id === recommendedOption.option_id && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 text-rose-500 font-bold">
                              <AlertTriangle className="w-4 h-4" /> ACTION NOT EXECUTED: {blockedReason}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => overrideContainmentAction(selectedCluster.cluster_id, 'APPROVE')}
                                disabled={containing === selectedCluster.cluster_id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                              >
                                APPROVE
                              </button>
                              <button
                                onClick={() => overrideContainmentAction(selectedCluster.cluster_id, 'REJECT')}
                                disabled={containing === selectedCluster.cluster_id}
                                className="px-3 py-1 bg-surface-secondary text-primary border border-subtle text-xs font-bold rounded"
                              >
                                REJECT
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* COUNTERFACTUAL ATTACK SIMULATOR PANEL */}
                {counterfactual && (
                  <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm font-mono">
                    <div className="flex items-center justify-between border-b border-subtle pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase">COUNTERFACTUAL ATTACK SIMULATOR</span>
                        <Badge variant="neutral">Simulated Counterfactual</Badge>
                      </div>

                      <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded border border-subtle text-[11px]">
                        <button onClick={() => setViewMode('BOTH')} className={`px-2 py-0.5 rounded font-bold ${viewMode === 'BOTH' ? 'bg-primary text-white' : 'text-muted'}`}>COMPARISON</button>
                        <button onClick={() => setViewMode('WITHOUT')} className={`px-2 py-0.5 rounded font-bold ${viewMode === 'WITHOUT' ? 'bg-rose-600 text-white' : 'text-muted'}`}>WITHOUT CONTAINMENT</button>
                        <button onClick={() => setViewMode('WITH')} className={`px-2 py-0.5 rounded font-bold ${viewMode === 'WITH' ? 'bg-emerald-600 text-white' : 'text-muted'}`}>WITH CONTAINMENT</button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted italic">
                      {counterfactual.disclaimer}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(viewMode === 'BOTH' || viewMode === 'WITHOUT') && (
                        <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/20 space-y-2">
                          <span className="text-xs font-bold text-rose-500 uppercase">WITHOUT RISKGRAPH (SCENARIO A)</span>
                          <div className="grid grid-cols-2 gap-2 text-center pt-1">
                            <div className="p-2 rounded bg-surface border border-subtle">
                              <span className="text-[9px] text-muted block">PROJECTED TXS</span>
                              <span className="text-lg font-black text-rose-500">{counterfactual.without_riskgraph.transactions_exposed}</span>
                            </div>
                            <div className="p-2 rounded bg-surface border border-subtle">
                              <span className="text-[9px] text-muted block">EXPOSURE</span>
                              <span className="text-lg font-black text-rose-500">{counterfactual.without_riskgraph.display_amount_inr}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {(viewMode === 'BOTH' || viewMode === 'WITH') && (
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-2">
                          <span className="text-xs font-bold text-emerald-500 uppercase">WITH RISKGRAPH (SCENARIO B)</span>
                          <div className="grid grid-cols-2 gap-2 text-center pt-1">
                            <div className="p-2 rounded bg-surface border border-subtle">
                              <span className="text-[9px] text-muted block">INTERCEPTED TXS</span>
                              <span className="text-lg font-black text-emerald-500">{counterfactual.with_riskgraph.transactions_intercepted}</span>
                            </div>
                            <div className="p-2 rounded bg-surface border border-subtle">
                              <span className="text-[9px] text-muted block">PROTECTED</span>
                              <span className="text-lg font-black text-emerald-500">{counterfactual.with_riskgraph.display_amount_inr}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal before High Impact Action */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-subtle p-6 rounded-xl max-w-md w-full space-y-4 font-mono shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" /> CONFIRM SENSITIVE ACTION
            </div>
            <p className="text-xs text-primary leading-relaxed font-sans">
              You are about to execute <strong className="font-mono text-rose-500">{pendingAction.action}</strong> on target <strong className="font-mono">{pendingAction.target_label}</strong>.
            </p>
            <div className="p-3 bg-surface-secondary rounded text-xs space-y-1 text-muted">
              <div>Affected Transactions: <strong className="text-primary">{pendingAction.transactions_affected}</strong></div>
              <div>Estimated Loss Prevented: <strong className="text-emerald-500">${pendingAction.estimated_loss_prevented.toFixed(2)}</strong></div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-surface-secondary text-primary border border-subtle text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => executeContainmentStrategy(selectedCluster.cluster_id, pendingAction)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
