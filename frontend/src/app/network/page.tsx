'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';
import { ReactFlowGraphCanvas, GraphNodeData, GraphEdgeData, NetworkSignalsData } from '@/components/graph/ReactFlowGraphCanvas';
import { Network, Search, Activity, RefreshCw } from 'lucide-react';

export default function NetworkPage() {
  const [searchEntity, setSearchEntity] = useState<string>('tx_stealth_01');
  const [activeEntity, setActiveEntity] = useState<string>('tx_stealth_01');
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [networkSignals, setNetworkSignals] = useState<NetworkSignalsData | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadGraph(entityId: string) {
    setLoading(true);
    setActiveEntity(entityId);
    try {
      let endpoint = `/api/v1/graph/subgraph/${entityId}?depth=1`;
      if (entityId.startsWith && entityId.startsWith('tx_')) {
        endpoint = `/api/v1/graph/transaction/${entityId}`;
      } else if (entityId.startsWith && entityId.startsWith('dev_')) {
        endpoint = `/api/v1/graph/device/${entityId}?depth=1`;
      } else if (entityId.startsWith && entityId.startsWith('cust_')) {
        endpoint = `/api/v1/graph/customer/${entityId}?depth=1`;
      }

      const res = await fetchApi<any>(endpoint);
      
      let graphObj = res;
      if (res.graph_data) {
        graphObj = res.graph_data;
        setRiskScore(res.network_risk_score || 0);
        setReasons(res.network_reasons || []);
      } else {
        setRiskScore(res.network_risk_score || 0);
        setReasons(res.reasons || []);
      }

      setNodes(graphObj.nodes || []);
      setEdges(graphObj.edges || []);
      setNetworkSignals(graphObj.network_signals);
    } catch (e) {
      console.error('Error fetching graph network data:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGraph('tx_stealth_01');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEntity.trim()) {
      loadGraph(searchEntity.trim());
    }
  };

  return (
    <main className="space-y-4 font-sans min-w-0">
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
      <div className="bg-card border border-subtle p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm font-mono">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              placeholder="Search by Transaction (tx_stealth_01), Device (dev_stealth_c91_primary)..."
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
          <button onClick={() => { setSearchEntity('tx_stealth_01'); loadGraph('tx_stealth_01'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-blue-500 font-bold">tx_stealth_01</button>
          <button onClick={() => { setSearchEntity('dev_stealth_c91_primary'); loadGraph('dev_stealth_c91_primary'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-amber-500 font-bold">dev_stealth_c91_primary</button>
          <button onClick={() => { setSearchEntity('ip_stealth_c91_proxy'); loadGraph('ip_stealth_c91_proxy'); }} className="px-2.5 py-1 bg-surface-secondary border border-subtle hover:border-border-strong rounded text-emerald-500 font-bold">ip_stealth_c91_proxy</button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {loading ? (
        <div className="bg-card border border-subtle rounded-xl p-16 text-center font-mono text-muted flex flex-col items-center justify-center space-y-3 shadow-sm">
          <Activity className="w-8 h-8 text-blue-500 animate-spin" />
          <span>Traversing relationship graph topology for <strong className="text-primary">{activeEntity}</strong>...</span>
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
