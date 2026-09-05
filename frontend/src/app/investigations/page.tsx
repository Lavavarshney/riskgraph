'use client';

import React, { useState, useEffect } from 'react';
import { Search, Brain, ShieldAlert, Sparkles, Send, FileText, CheckCircle2, AlertTriangle, Layers, Target, ShieldCheck, ArrowRight, CornerDownRight, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';

interface InvestigationReport {
  transaction_id: string;
  summary: string;
  evidence: string[];
  attack_pattern: string;
  recommended_action: Record<string, any>;
  confidence: number;
  limitations: string;
  risk_breakdown: Record<string, any>;
  policy_status: Record<string, any>;
}

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  citations?: string[];
}

export default function InvestigationsPage() {
  const [txId, setTxId] = useState('');
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryTx = params.get('txId');
      if (queryTx) {
        setTxId(queryTx);
        handleInvestigate(queryTx);
      }
    }
  }, []);

  const handleInvestigate = async (idToInvestigate?: string) => {
    const targetId = idToInvestigate || txId;
    if (!targetId.trim()) return;
    
    setLoading(true);
    setReport(null);
    setChatMessages([]);
    setError('');
    
    try {
      const data = await fetchApi<InvestigationReport>(`/investigations/${targetId}`, {
        method: 'POST'
      });
      setReport(data);
      setChatMessages([
        {
          sender: 'agent',
          text: `Investigation complete for ${targetId}. I have compiled tool findings across 10 database & network graph inspectors. Ask me any follow-up question below!`
        }
      ]);
    } catch (e) {
      console.error('Failed to run investigation:', e);
      setError('Investigation failed. Please check the transaction ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (q?: string) => {
    const questionToAsk = q || inputQuestion;
    if (!questionToAsk.trim() || !report) return;

    const userMsg: ChatMessage = { sender: 'user', text: questionToAsk };
    setChatMessages(prev => [...prev, userMsg]);
    if (!q) setInputQuestion('');
    setAsking(true);

    try {
      const data = await fetchApi<any>(`/investigations/${report.transaction_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ question: questionToAsk })
      });
      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: data.answer,
        citations: data.citations
      };
      setChatMessages(prev => [...prev, agentMsg]);
    } catch (e) {
      console.error('Failed to ask question:', e);
      const agentMsg: ChatMessage = {
        sender: 'agent',
        text: 'Failed to process question. Please try again.'
      };
      setChatMessages(prev => [...prev, agentMsg]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">INVESTIGATION WORKSPACE</h2>
            <Badge variant="info">EVIDENCE GROUNDED</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5 font-sans">
            Deep-dive root cause analysis strictly backed by 10 backend graph and database inspection tools
          </p>
        </div>

        {/* Input & Action */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <div className="relative">
            <input
              type="text"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              placeholder="Enter Tx ID..."
              className="bg-surface border border-subtle text-primary text-xs rounded-lg px-3 py-1.5 font-mono w-64 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => handleInvestigate()}
            disabled={loading || !txId.trim()}
            className="px-3.5 py-1.5 bg-primary hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Brain className="w-3.5 h-3.5" />
            {loading ? 'Analyzing Tools...' : 'INVESTIGATE PAYMENT'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-muted font-mono bg-card border border-subtle rounded-xl">
          <Activity className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
          Executing 10 grounded inspection tools...
        </div>
      )}

      {error && !loading && (
        <div className="p-12 text-center text-rose-500 font-mono bg-card border border-subtle rounded-xl">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="p-12 text-center text-muted font-mono bg-card border border-subtle rounded-xl">
          Enter a transaction ID and click Investigate
        </div>
      )}

      {report && !loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Investigation Workspace (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header Status Card */}
            <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm font-mono">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-primary text-base">INVESTIGATION #INV-{report.transaction_id.toUpperCase()}</h3>
                </div>
                <Badge variant={report.policy_status?.is_action_auto_approved ? 'success' : 'warning'}>
                  STATUS: {report.policy_status?.is_action_auto_approved ? 'RESOLVED / CONTAINED' : 'OPEN (MANUAL APPROVAL)'}
                </Badge>
              </div>

              {/* STRUCTURED FINDINGS: OBSERVATION, ASSESSMENT, RECOMMENDATION */}
              <div className="space-y-3 pt-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  STRUCTURED RISK FINDINGS
                </span>

                <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1">
                  <span className="text-blue-500 font-bold text-xs block">OBSERVATION</span>
                  <p className="text-xs text-primary font-sans leading-relaxed">
                    {report.summary}
                  </p>
                </div>

                <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1">
                  <span className="text-amber-500 font-bold text-xs block">ASSESSMENT</span>
                  <p className="text-xs text-primary font-sans leading-relaxed">
                    Coordinated activity detected. Combined network risk escalated from individual baseline ({report.risk_breakdown?.individual_tx_risk ?? '—'}) to {report.risk_breakdown?.final_combined_risk ?? '—'} due to multi-hop device & proxy IP reuse.
                  </p>
                </div>

                <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1">
                  <span className="text-rose-500 font-bold text-xs block">RECOMMENDATION</span>
                  <p className="text-xs text-primary font-sans leading-relaxed">
                    Execute <strong className="font-mono text-rose-500">{report.recommended_action?.action ?? '—'}</strong> on target <strong className="font-mono text-blue-500">{report.recommended_action?.target_id ?? '—'}</strong> to stop {report.recommended_action?.coverage_percentage ?? '—'}% of attack volume.
                  </p>
                </div>
              </div>

              {/* Cited Empirical Evidence */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  CITED BACKEND EVIDENCE ({report.evidence?.length ?? 0})
                </span>
                <div className="space-y-1.5">
                  {(report.evidence || []).map((item, idx) => (
                    <div key={idx} className="p-2 bg-surface-secondary rounded border border-subtle text-xs text-primary flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Follow-Up Q&A Chat (5 cols) */}
          <div className="lg:col-span-5 bg-card border border-subtle p-4 rounded-xl flex flex-col h-[560px] shadow-sm font-mono">
            <div className="pb-2.5 border-b border-subtle flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-500" />
              <div>
                <h4 className="font-bold text-primary text-xs">INTERACTIVE AGENT Q&A</h4>
                <span className="text-[10px] text-muted block font-sans">Strictly backed by backend inspection tools</span>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="py-2 flex flex-wrap gap-1 border-b border-subtle">
              <button
                onClick={() => handleAskQuestion("Why is this transaction risky?")}
                className="px-2 py-0.5 bg-surface-secondary hover:bg-subtle text-blue-500 rounded text-[10px] font-semibold border border-subtle transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" /> Why is this risky?
              </button>
              <button
                onClick={() => handleAskQuestion("What entities are connected?")}
                className="px-2 py-0.5 bg-surface-secondary hover:bg-subtle text-blue-500 rounded text-[10px] font-semibold border border-subtle transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" /> What entities connect?
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-500 font-bold ml-6'
                      : 'bg-surface-secondary border border-subtle text-primary mr-2 space-y-2'
                  }`}
                >
                  <p className="font-sans">{msg.text}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-1.5 border-t border-subtle space-y-1 font-mono">
                      <span className="text-[9px] font-bold text-muted uppercase block">TOOL CITATIONS:</span>
                      {msg.citations.map((c, idx) => (
                        <div key={idx} className="text-[10px] text-emerald-500 bg-surface px-2 py-0.5 rounded border border-subtle">
                          ✓ {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {asking && (
                <div className="p-2.5 bg-surface-secondary rounded-lg text-xs text-muted animate-pulse flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  Querying backend tools...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="pt-2 border-t border-subtle flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask a follow-up question..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                className="flex-1 bg-surface border border-subtle rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-blue-500 font-sans"
              />
              <button
                onClick={() => handleAskQuestion()}
                disabled={asking || !inputQuestion.trim()}
                className="p-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
