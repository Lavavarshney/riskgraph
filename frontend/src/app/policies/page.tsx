'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, ShieldAlert, CheckCircle, Save, Sliders, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { fetchApi } from '@/lib/api';

interface MerchantPolicy {
  id: string;
  name: string;
  individual_risk_threshold: number;
  network_risk_threshold: number;
  auto_block_enabled: boolean;
  auto_challenge_enabled: boolean;
  device_quarantine_threshold: number;
  ip_quarantine_threshold: number;
  minimum_account_age_for_auto_block: number;
  maximum_transaction_amount_for_auto_block: number;
}

const DEFAULT_POLICY: MerchantPolicy = {
  id: 'pol_merchant_global_v1',
  name: 'Global Default Containment Policy',
  individual_risk_threshold: 70.0,
  network_risk_threshold: 70.0,
  auto_block_enabled: true,
  auto_challenge_enabled: true,
  device_quarantine_threshold: 5,
  ip_quarantine_threshold: 8,
  minimum_account_age_for_auto_block: 1440,
  maximum_transaction_amount_for_auto_block: 2500.0,
};

export default function PoliciesPage() {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const data = await fetchApi<any>('/policies');
      if (Array.isArray(data) && data.length > 0) {
        setPolicy({ ...DEFAULT_POLICY, ...data[0] });
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        setPolicy({ ...DEFAULT_POLICY, ...data });
      } else {
        setPolicy(DEFAULT_POLICY);
      }
    } catch (e) {
      console.error('Failed to fetch policy:', e);
      setPolicy(DEFAULT_POLICY);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await fetchApi<MerchantPolicy>(`/policies/${policy.id}`, {
        method: 'PUT',
        body: JSON.stringify(policy),
      });
      setSavedMessage('Policy successfully updated & enforced globally.');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (e) {
      console.error('Failed to save policy:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof MerchantPolicy, value: any) => {
    setPolicy(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading || !policy) {
    return (
      <div className="p-12 text-center text-muted font-mono bg-card border border-subtle rounded-xl">
        <Settings className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        Loading merchant risk policies...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-sans text-primary tracking-tight">CONTAINMENT POLICIES</h2>
            <Badge variant="success">POLICY ENGINE ACTIVE</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5 font-sans">
            Configure guardrails for automated fraud containment and set manual approval thresholds.
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2 text-xs font-mono font-bold">
          <CheckCircle className="w-4 h-4" /> {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
        {/* Global Overrides */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-xs pb-2 border-b border-subtle uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-blue-500" /> Global AI Authority
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer p-3 bg-surface-secondary rounded-lg border border-subtle hover:border-border-strong transition-colors">
              <div>
                <span className="text-primary font-bold block text-xs">Allow Auto-Block Execution</span>
                <span className="text-[11px] text-muted">Permit AI to block transactions automatically.</span>
              </div>
              <input 
                type="checkbox" 
                checked={policy.auto_block_enabled}
                onChange={(e) => handleChange('auto_block_enabled', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded bg-surface border-subtle" 
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 bg-surface-secondary rounded-lg border border-subtle hover:border-border-strong transition-colors">
              <div>
                <span className="text-primary font-bold block text-xs">Allow Auto-Challenge Execution</span>
                <span className="text-[11px] text-muted">Permit AI to enforce step-up authentication.</span>
              </div>
              <input 
                type="checkbox" 
                checked={policy.auto_challenge_enabled}
                onChange={(e) => handleChange('auto_challenge_enabled', e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded bg-surface border-subtle" 
              />
            </label>
          </div>
        </div>

        {/* Infrastructure Quarantine Rules */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-xs pb-2 border-b border-subtle uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-500" /> Infrastructure Quarantine
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block text-xs">Device Quarantine Threshold</label>
              <span className="text-[10px] text-muted block">Require manual approval if device is shared across fewer than X accounts.</span>
              <div className="flex items-center gap-3 pt-1">
                <input 
                  type="range" 
                  min="2" max="50" 
                  value={policy.device_quarantine_threshold}
                  onChange={(e) => handleChange('device_quarantine_threshold', parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-base font-bold text-rose-500 w-10 text-center">{policy.device_quarantine_threshold}</span>
              </div>
            </div>

            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block text-xs">IP Quarantine Threshold</label>
              <span className="text-[10px] text-muted block">Require manual approval if IP is shared across fewer than X accounts.</span>
              <div className="flex items-center gap-3 pt-1">
                <input 
                  type="range" 
                  min="2" max="50" 
                  value={policy.ip_quarantine_threshold}
                  onChange={(e) => handleChange('ip_quarantine_threshold', parseInt(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <span className="text-base font-bold text-rose-500 w-10 text-center">{policy.ip_quarantine_threshold}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Thresholds */}
        <div className="bg-card border border-subtle p-5 rounded-xl space-y-4 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs pb-2 border-b border-subtle uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-500" /> Scoring Thresholds & Financial Safeguards
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block">Individual ML Risk Threshold</label>
              <input 
                type="number" 
                value={policy.individual_risk_threshold}
                onChange={(e) => handleChange('individual_risk_threshold', parseFloat(e.target.value))}
                className="w-full bg-surface border border-subtle rounded px-3 py-1.5 text-primary font-bold text-xs"
              />
            </div>
            
            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block">Network Graph Risk Threshold</label>
              <input 
                type="number" 
                value={policy.network_risk_threshold}
                onChange={(e) => handleChange('network_risk_threshold', parseFloat(e.target.value))}
                className="w-full bg-surface border border-subtle rounded px-3 py-1.5 text-primary font-bold text-xs"
              />
            </div>

            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block">Min Account Age for Auto-Block (Mins)</label>
              <input 
                type="number" 
                value={policy.minimum_account_age_for_auto_block}
                onChange={(e) => handleChange('minimum_account_age_for_auto_block', parseInt(e.target.value))}
                className="w-full bg-surface border border-subtle rounded px-3 py-1.5 text-primary font-bold text-xs"
              />
            </div>

            <div className="p-3 bg-surface-secondary rounded-lg border border-subtle space-y-1.5">
              <label className="text-primary font-bold block">Max Tx Amount for Auto-Block ($)</label>
              <span className="text-[10px] text-muted block">Require approval for blocking amounts above this.</span>
              <input 
                type="number" 
                value={policy.maximum_transaction_amount_for_auto_block}
                onChange={(e) => handleChange('maximum_transaction_amount_for_auto_block', parseFloat(e.target.value))}
                className="w-full bg-surface border border-subtle rounded px-3 py-1.5 text-emerald-500 font-bold text-xs"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
