'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { ReactFlowGraphCanvas, GraphNodeData, GraphEdgeData, NetworkSignalsData } from '@/components/graph/ReactFlowGraphCanvas';
import { Network, Search, Activity, RefreshCw, AlertTriangle } from 'lucide-react';

export default function NetworkPage() {
  const [searchEntity, setSearchEntity] = useState<string>('tx_1');
  const [activeEntity, setActiveEntity] = useState<string>('tx_1');
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [networkSignals, setNetworkSignals] = useState<NetworkSignalsData | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  async function loadGraph(entityId: string) {
    const cleanId = entityId.trim() || 'tx_1';
    setLoading(true);
    setError('');
    setActiveEntity(cleanId);
    try {
      const endpoint = `/api/v1/graph/subgraph/${cleanId}?depth=2`;
      const res = await fetchApi<any>(endpoint);
      
      let graphObj = res;
      if (res.graph_data) {
        graphObj = res.graph_data;
        setRiskScore(res.network_risk_score || res.individual_risk_score || 0);
        setReasons(res.network_reasons || res.individual_reasons || []);
      } else {
        setRiskScore(res.network_risk_score || 0);
        setReasons(res.reasons || []);
      }

      setNodes(graphObj.nodes || []);
      setEdges(graphObj.edges || []);
      setNetworkSignals(graphObj.network_signals);
    } catch (e) {
      console.error('Error fetching graph network data:', e);
      setError('Network data unavailable. Ensure the backend is running.');
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGraph('tx_1');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEntity.trim()) {
      loadGraph(searchEntity.trim());
    }
  };

  return (
    <main className="space-y-3 font-sans min-w-0">
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-muted">
          <span className="text-primary">Case workspace</span><span>/</span><span>Network intelligence</span><span>/</span><span className="text-blue-500">{activeEntity}</span>
        </div>
        <span className="hidden sm:inline text-[10px] font-mono text-muted">GRAPH ENGINE / ONLINE</span>
      </div>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">FRAUD RELATIONSHIP GRAPH ENGINE</h2>
            <span className="text-xs font-mono text-muted">/ Multi-Hop Topology</span>
          </div>
          <p className="text-xs text-muted mt-0.5 font-sans">
            Interactive graph investigation workspace connecting Customers, Devices, IPs, Cards, and Merchants
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <Badge variant="info">Focused Subgraph View</Badge>
          <Badge variant="success">Progressive Expansion</Badge>
        </div>
      </div>

      {/* Entity Search Bar */}
      <div className="bg-card border border-subtle p-3 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm font-mono">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              placeholder="Search by Transaction (tx_1), Device (dev_1), IP (ip_1)..."
              className="w-full bg-surface-secondary border border-subtle text-xs rounded-lg pl-9 pr-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" /> Inspect Graph
          </button>
        </form>

        {/* Preset Quick Entity Buttons */}
        <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
          <span className="text-[10px] text-muted uppercase font-bold">Quick Presets:</span>
          <button onClick={() => { setSearchEntity('tx_1'); loadGraph('tx_1'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-blue-500 font-bold">tx_1</button>
          <button onClick={() => { setSearchEntity('dev_1'); loadGraph('dev_1'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-amber-500 font-bold">dev_1</button>
          <button onClick={() => { setSearchEntity('ip_1'); loadGraph('ip_1'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-emerald-500 font-bold">ip_1</button>
          <button onClick={() => { setSearchEntity('cust_1'); loadGraph('cust_1'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-purple-500 font-bold">cust_1</button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {loading ? (
        <div className="bg-card border border-subtle rounded-xl p-16 text-center font-mono text-muted flex flex-col items-center justify-center space-y-3 shadow-sm">
          <Activity className="w-8 h-8 text-blue-500 animate-spin" />
          <span>Traversing relationship graph topology for <strong className="text-primary">{activeEntity}</strong>...</span>
        </div>
      ) : error ? (
        <div className="bg-card border border-subtle rounded-xl p-16 text-center font-mono text-rose-500 flex flex-col items-center justify-center space-y-3 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
          <span>{error}</span>
        </div>
      ) : (
        <ReactFlowGraphCanvas
          nodes={nodes}
          edges={edges}
          networkRiskScore={riskScore}
          reasons={reasons}
          networkSignals={networkSignals}
          title={`Graph Topology for ${activeEntity}`}
          height="620px"
        />
      )}
    </main>
  );
}
