'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, ShieldAlert, User, Monitor, Globe, CreditCard, Ticket, FileText, Layers, PlusCircle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';

export interface GraphNodeData {
  id: string;
  label: string;
  type: string; // customer, device, ip, payment_method, merchant, transaction, coupon
  risk_score?: number;
  details?: Record<string, any>;
}

export interface GraphEdgeData {
  id?: string;
  source: string;
  target: string;
  relation: string;
  label?: string;
}

export interface NetworkSignalsData {
  device_account_count?: number;
  ip_account_count?: number;
  payment_method_account_count?: number;
  shared_device_ratio?: number;
  shared_ip_ratio?: number;
  connected_transaction_count?: number;
  flagged_connected_transaction_count?: number;
  new_account_cluster_size?: number;
}

export interface ReactFlowGraphProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  networkRiskScore?: number;
  reasons?: string[];
  networkSignals?: NetworkSignalsData;
  title?: string;
  height?: string;
}

const NODE_COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: any; colorHex: string }> = {
  customer: { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-500', icon: User, colorHex: '#a855f7' },
  device: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-500', icon: Monitor, colorHex: '#f59e0b' },
  ip: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-500', icon: Globe, colorHex: '#10b981' },
  payment_method: { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-500', icon: CreditCard, colorHex: '#ec4899' },
  transaction: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-500', icon: FileText, colorHex: '#3b82f6' },
  transaction_flagged: { bg: 'bg-rose-500/15', border: 'border-rose-500/60', text: 'text-rose-500', icon: ShieldAlert, colorHex: '#f43f5e' },
  coupon: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-500', icon: Ticket, colorHex: '#06b6d4' },
  merchant: { bg: 'bg-surface-secondary', border: 'border-subtle', text: 'text-muted', icon: Layers, colorHex: '#64748b' }
};

const CustomNode = ({ data }: { data: any }) => {
  const nodeType = data.type || 'transaction';
  const isFlagged = (data.risk_score || 0) >= 70 || data.details?.is_fraud;
  const configKey = (nodeType === 'transaction' && isFlagged) ? 'transaction_flagged' : nodeType;
  const style = NODE_COLOR_MAP[configKey] || NODE_COLOR_MAP.merchant;
  const IconComponent = style.icon;

  return (
    <div className={`px-3 py-2 rounded-lg border-2 shadow-sm flex items-center gap-2 max-w-[190px] cursor-pointer transition-all hover:scale-105 bg-card ${style.border}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      <div className={`p-1.2 rounded ${style.bg} ${style.text}`}>
        <IconComponent className="w-3.5 h-3.5" />
      </div>
      <div className="overflow-hidden text-left font-mono">
        <div className="text-[11px] font-bold text-primary truncate">{data.label}</div>
        <div className="text-[9px] text-muted capitalize">{nodeType.replace('_', ' ')}</div>
      </div>
      {(data.risk_score || 0) > 0 && (
        <span className={`ml-auto text-[9px] font-mono font-bold px-1 py-0.5 rounded ${isFlagged ? 'bg-rose-500 text-white' : 'bg-surface-secondary text-muted'}`}>
          {Math.round(data.risk_score)}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export function ReactFlowGraphCanvas({
  nodes: rawNodes,
  edges: rawEdges,
  networkRiskScore = 0,
  reasons = [],
  networkSignals,
  title = "Focused Investigation Subgraph",
  height = "600px"
}: ReactFlowGraphProps) {
  // Ensure we display a focused initial set of max 8 nodes if rawNodes is large
  const initialFocusedNodes = useMemo(() => {
    if (rawNodes.length <= 10) return rawNodes;
    // Prioritize target transaction and immediate connected infrastructure
    const centerTx = rawNodes.find(n => n.type === 'transaction') || rawNodes[0];
    const centerId = centerTx?.id;
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(centerId);

    rawEdges.forEach(e => {
      if (e.source === centerId) connectedNodeIds.add(e.target);
      if (e.target === centerId) connectedNodeIds.add(e.source);
    });

    return rawNodes.filter(n => connectedNodeIds.has(n.id)).slice(0, 10);
  }, [rawNodes, rawEdges]);

  const [nodesState, setNodesState] = useState<GraphNodeData[]>(initialFocusedNodes);
  const [edgesState, setEdgesState] = useState<GraphEdgeData[]>(rawEdges);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [nodeSummary, setNodeSummary] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [expanding, setExpanding] = useState<boolean>(false);

  useEffect(() => {
    setNodesState(initialFocusedNodes);
    setEdgesState(rawEdges);
  }, [initialFocusedNodes, rawEdges]);

  useEffect(() => {
    if (!selectedNode) {
      setNodeSummary(null);
      return;
    }

    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const res = await fetchApi<any>(`/api/v1/graph/summary/${selectedNode!.type}/${selectedNode!.id}`);
        setNodeSummary(res);
      } catch (e) {
        console.warn('Node summary fetch error:', e);
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, [selectedNode]);

  // Progressive Expansion Handler
  const handleExpandConnections = async () => {
    if (!selectedNode || expanding) return;

    setExpanding(true);
    try {
      const res = await fetchApi<any>(`/api/v1/graph/expand/${selectedNode.type}/${selectedNode.id}?limit=8`);
      if (res && res.nodes && res.nodes.length > 0) {
        const existingNodeIds = new Set(nodesState.map(n => n.id));
        const newNodes: GraphNodeData[] = res.nodes.filter((n: GraphNodeData) => !existingNodeIds.has(n.id));

        const existingEdgeIds = new Set(edgesState.map(e => e.id));
        const newEdges: GraphEdgeData[] = res.edges.filter((e: GraphEdgeData) => !existingEdgeIds.has(e.id));

        setNodesState(prev => [...prev, ...newNodes]);
        setEdgesState(prev => [...prev, ...newEdges]);
      }
    } catch (e) {
      console.error('Failed to expand connections:', e);
    } finally {
      setExpanding(false);
    }
  };

  // Radial positioning layout around main center node
  const rfNodes: Node[] = useMemo(() => {
    const total = nodesState.length;
    const center = { x: 380, y: 260 };

    return nodesState.map((n, idx) => {
      let x = center.x;
      let y = center.y;

      if (idx > 0) {
        const angle = ((idx - 1) / Math.max(1, total - 1)) * 2 * Math.PI;
        const radius = 170 + (idx % 2) * 40;
        x = center.x + radius * Math.cos(angle);
        y = center.y + radius * Math.sin(angle);
      }

      return {
        id: n.id,
        type: 'custom',
        position: { x, y },
        data: { ...n }
      };
    });
  }, [nodesState]);

  const rfEdges: Edge[] = useMemo(() => {
    const validNodeIds = new Set(nodesState.map(n => n.id));
    return edgesState
      .filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target))
      .map((e, idx) => ({
        id: e.id || `e-${idx}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label || e.relation,
        labelStyle: { fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' },
        labelBgStyle: { fill: 'var(--surface-primary)', fillOpacity: 0.9 },
        style: { stroke: 'var(--border-strong)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)', width: 10, height: 10 }
      }));
  }, [nodesState, edgesState]);

  return (
    <div className="bg-card border border-subtle rounded-xl flex flex-col overflow-hidden relative shadow-sm" style={{ height }}>
      {/* Top Bar Header */}
      <div className="p-3 border-b border-subtle bg-surface-secondary flex flex-wrap items-center justify-between gap-2 z-10 font-mono">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold text-primary">{title}</h3>
          <Badge variant={networkRiskScore >= 70 ? 'danger' : networkRiskScore >= 35 ? 'warning' : 'success'}>
            Network Risk: {Math.round(networkRiskScore)}/100
          </Badge>
          <span className="text-[11px] text-muted">({nodesState.length} Visible Nodes)</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted flex-wrap">
          {Object.entries(NODE_COLOR_MAP).map(([key, cfg]) => (
            key !== 'transaction_flagged' && (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.colorHex }}></div>
                <span className="capitalize">{key.replace('_', ' ')}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Investigation Path Indicator Strip */}
      <div className="px-3 py-1.5 bg-surface border-b border-subtle text-[10px] font-mono text-muted flex items-center gap-1">
        <span className="font-bold text-primary">INVESTIGATION PATH:</span>
        <span>Transaction</span>
        <span>→</span>
        <span className="text-amber-500 font-semibold">Device</span>
        <span>→</span>
        <span className="text-purple-500 font-semibold">Customers</span>
        <span>→</span>
        <span className="text-emerald-500 font-semibold">IP Address</span>
        <span>→</span>
        <span className="text-rose-500 font-bold">Fraud Cluster</span>
      </div>

      {/* Main Graph Viewport */}
      <div className="flex-1 w-full h-full relative bg-app">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node.data as unknown as GraphNodeData)}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="var(--border-subtle)" gap={20} size={1} />
          <Controls className="!bg-surface-secondary !border-subtle !text-primary" />
          <MiniMap
            nodeColor={(node) => {
              const type = node.data?.type || 'transaction';
              return NODE_COLOR_MAP[type as string]?.colorHex || '#3b82f6';
            }}
            className="!bg-surface-secondary !border-subtle"
          />
        </ReactFlow>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-10 bg-card border border-subtle p-4 rounded-xl shadow-xl w-72 text-xs font-mono space-y-3">
            <div className="flex justify-between items-center border-b border-subtle pb-2">
              <span className="text-muted uppercase text-[10px] font-bold">ENTITY INSPECTION PANEL</span>
              <button onClick={() => setSelectedNode(null)} className="text-muted hover:text-primary font-bold">✕</button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-primary truncate">{selectedNode.label}</h4>
              <p className="text-[10px] text-muted capitalize mt-0.5">Type: <strong className="text-primary">{selectedNode.type}</strong></p>
              <p className="text-[10px] text-muted">ID: <strong className="text-primary">{selectedNode.id}</strong></p>
            </div>

            {/* Real Network Intelligence Summaries */}
            {summaryLoading ? (
              <div className="p-3 bg-surface-secondary rounded border border-subtle text-center text-muted">
                <Activity className="w-4 h-4 text-blue-500 animate-spin mx-auto mb-1" />
                Querying graph database...
              </div>
            ) : nodeSummary ? (
              <div className="p-3 bg-surface-secondary rounded border border-subtle space-y-2 text-[11px]">
                <div className="flex justify-between items-center pb-1 border-b border-subtle">
                  <span className="text-muted uppercase text-[9px] font-bold">RELATIONSHIP SUMMARY</span>
                  <Badge variant={nodeSummary.network_risk_level === 'HIGH' ? 'danger' : 'warning'}>
                    {nodeSummary.network_risk_level}
                  </Badge>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Connected Accounts:</span>
                  <strong className="text-purple-500 font-bold">{nodeSummary.connected_customers}</strong>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Connected Transactions:</span>
                  <strong className="text-blue-500 font-bold">{nodeSummary.connected_transactions}</strong>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Fraud-Linked Txs:</span>
                  <strong className="text-rose-500 font-bold">{nodeSummary.fraud_transactions}</strong>
                </div>
              </div>
            ) : null}

            {/* Progressive Expansion Button */}
            <button
              onClick={handleExpandConnections}
              disabled={expanding}
              className="w-full py-2 px-3 bg-primary hover:bg-blue-600 disabled:bg-surface-secondary text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm"
            >
              {expanding ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" /> Expanding...
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" /> Expand Top 8 Connections
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
