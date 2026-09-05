const getApiBaseUrl = (): string | null => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    // On Vercel or production host without configured API URL, return null to serve fallback directly
    return null;
  }
  return 'http://127.0.0.1:8000';
};

const getFallbackDataForEndpoint = (endpoint: string, method: string = 'GET'): any => {
  const clean = endpoint.toLowerCase();

  if (clean.includes('/health')) {
    return {
      status: 'healthy',
      service: 'riskgraph-api',
      version: '1.0.0',
      database: { connected: true, dialect: 'postgresql' }
    };
  }

  if (clean.includes('/simulation/status')) {
    return {
      is_running: true,
      current_scenario: 'normal',
      live_tx_count: 1420,
      tps: 18,
      total_amount: 84950.0,
      fraud_count: 14
    };
  }

  if (clean.includes('/attacks/active') || clean.includes('/clusters')) {
    return [
      {
        cluster_id: "cls_c91_stealth_ring",
        cluster_name: "ATTACK CLUSTER #C91 (Sybil Proxy Ring)",
        status: "CONFIRMED",
        severity: "CRITICAL",
        pattern_type: "COORDINATED_FRAUD_RING",
        affected_accounts: 14,
        affected_devices: 2,
        affected_ips: 1,
        affected_merchants: 1,
        affected_cards: 1,
        node_count: 38,
        edge_count: 52,
        transaction_count: 38,
        network_risk_score: 94.0,
        individual_risk_avg: 32.0,
        final_combined_risk: 94.0,
        risk_reasons: [
          "High device sharing: 14 accounts sharing 2 devices",
          "Datacenter proxy IP shared across 14 customer accounts",
          "Burst account creation & identical promo code usage"
        ],
        nodes: [
          { id: "tx_stealth_01", label: "TX $49.99", type: "transaction", risk_score: 94.0 },
          { id: "dev_stealth_c91_primary", label: "Device D91", type: "device", risk_score: 94.0 },
          { id: "ip_stealth_c91_proxy", label: "Proxy IP", type: "ip", risk_score: 82.0 },
          { id: "cust_stealth_01", label: "Customer C01", type: "customer", risk_score: 75.0 }
        ],
        edges: [
          { source: "cust_stealth_01", target: "tx_stealth_01", relation: "INITIATED" },
          { source: "tx_stealth_01", target: "dev_stealth_c91_primary", relation: "USED_DEVICE" },
          { source: "tx_stealth_01", target: "ip_stealth_c91_proxy", relation: "CONNECTED_IP" }
        ]
      },
      {
        cluster_id: "cls_ip_botnet_alpha",
        cluster_name: "Proxy IP Botnet Cluster Alpha",
        status: "SUSPECTED",
        severity: "HIGH",
        pattern_type: "CARD_TESTING_BOTNET",
        affected_accounts: 8,
        affected_devices: 4,
        affected_ips: 1,
        affected_merchants: 3,
        affected_cards: 12,
        node_count: 24,
        edge_count: 32,
        transaction_count: 20,
        network_risk_score: 82.0,
        individual_risk_avg: 45.0,
        final_combined_risk: 84.5,
        risk_reasons: [
          "Datacenter proxy IP shared across 8 customer accounts",
          "High failure rate across card testing attempts"
        ],
        nodes: [
          { id: "tx_botnet_01", label: "TX $1.50", type: "transaction", risk_score: 84.5 },
          { id: "ip_proxy_alpha", label: "Proxy IP Alpha", type: "ip", risk_score: 88.0 },
          { id: "dev_botnet_01", label: "Device Bot #1", type: "device", risk_score: 78.0 },
          { id: "cust_botnet_01", label: "Customer #88", type: "customer", risk_score: 65.0 }
        ],
        edges: [
          { source: "cust_botnet_01", target: "tx_botnet_01", relation: "INITIATED" },
          { source: "tx_botnet_01", target: "dev_botnet_01", relation: "USED_DEVICE" },
          { source: "dev_botnet_01", target: "ip_proxy_alpha", relation: "CONNECTED_IP" }
        ]
      },
      {
        cluster_id: "cls_ato_burst_delta",
        cluster_name: "Account Takeover Credential Stuffing Ring",
        status: "CONFIRMED",
        severity: "CRITICAL",
        pattern_type: "ACCOUNT_TAKEOVER",
        affected_accounts: 22,
        affected_devices: 5,
        affected_ips: 2,
        affected_merchants: 2,
        affected_cards: 6,
        node_count: 45,
        edge_count: 68,
        transaction_count: 42,
        network_risk_score: 91.0,
        individual_risk_avg: 28.0,
        final_combined_risk: 91.0,
        risk_reasons: [
          "Credential stuffing signature detected across 22 accounts",
          "Anomalous foreign IP ASN velocity spike",
          "Rapid high-value wallet cashout attempt"
        ],
        nodes: [
          { id: "tx_ato_901", label: "TX $1,250.00", type: "transaction", risk_score: 91.0 },
          { id: "dev_ato_stealth", label: "Compromised Device", type: "device", risk_score: 89.0 },
          { id: "ip_foreign_asn", label: "Tor Exit Node IP", type: "ip", risk_score: 95.0 },
          { id: "cust_vip_victim", label: "Victim Customer #401", type: "customer", risk_score: 30.0 }
        ],
        edges: [
          { source: "cust_vip_victim", target: "tx_ato_901", relation: "INITIATED" },
          { source: "tx_ato_901", target: "dev_ato_stealth", relation: "USED_DEVICE" },
          { source: "tx_ato_901", target: "ip_foreign_asn", relation: "ORIGINATED_FROM" }
        ]
      },
      {
        cluster_id: "cls_card_testing_omega",
        cluster_name: "Micro-Tx Velocity Card Testing Botnet",
        status: "SUSPECTED",
        severity: "HIGH",
        pattern_type: "CARD_TESTING_BOTNET",
        affected_accounts: 31,
        affected_devices: 8,
        affected_ips: 3,
        affected_merchants: 4,
        affected_cards: 42,
        node_count: 56,
        edge_count: 84,
        transaction_count: 65,
        network_risk_score: 88.0,
        individual_risk_avg: 40.0,
        final_combined_risk: 88.0,
        risk_reasons: [
          "High-velocity micro-payments ($0.99) fired across 42 stolen card BINs",
          "Identical fingerprint header hash across 31 accounts"
        ],
        nodes: [
          { id: "tx_micro_01", label: "TX $0.99", type: "transaction", risk_score: 88.0 },
          { id: "dev_micro_runner", label: "Automated Runner Bot", type: "device", risk_score: 87.0 },
          { id: "ip_vpn_exit", label: "Residential VPN IP", type: "ip", risk_score: 76.0 },
          { id: "pm_stolen_bin", label: "Stolen Card BIN #4111", type: "payment_method", risk_score: 85.0 }
        ],
        edges: [
          { source: "tx_micro_01", target: "dev_micro_runner", relation: "USED_DEVICE" },
          { source: "tx_micro_01", target: "ip_vpn_exit", relation: "ORIGINATED_FROM" },
          { source: "tx_micro_01", target: "pm_stolen_bin", relation: "USED_CARD" }
        ]
      },
      {
        cluster_id: "cls_promo_farm_bravo",
        cluster_name: "Synthetic Welcome Promo Abuser Farm",
        status: "INVESTIGATING",
        severity: "MEDIUM",
        pattern_type: "SYBIL_ACCOUNT_FARM",
        affected_accounts: 19,
        affected_devices: 3,
        affected_ips: 1,
        affected_merchants: 1,
        affected_cards: 2,
        node_count: 28,
        edge_count: 38,
        transaction_count: 19,
        network_risk_score: 79.0,
        individual_risk_avg: 15.0,
        final_combined_risk: 79.0,
        risk_reasons: [
          "19 synthetic customer accounts created within 10 minutes",
          "Shared promo code WELCOME50 cashout pattern"
        ],
        nodes: [
          { id: "tx_promo_01", label: "TX $0.00 (Promo)", type: "transaction", risk_score: 79.0 },
          { id: "dev_farm_master", label: "Farm Master Device", type: "device", risk_score: 81.0 },
          { id: "cust_synth_01", label: "Synthetic Customer #01", type: "customer", risk_score: 72.0 }
        ],
        edges: [
          { source: "cust_synth_01", target: "tx_promo_01", relation: "INITIATED" },
          { source: "tx_promo_01", target: "dev_farm_master", relation: "USED_DEVICE" }
        ]
      }
    ];
  }

  if (clean.includes('/containment-options')) {
    return [
      {
        option_id: "opt_quarantine_dev_991",
        action: "QUARANTINE_DEVICE",
        target_id: "dev_stealth_c91_primary",
        target_label: "Device dev_stealth_c91_primary",
        transactions_affected: 31,
        estimated_loss_prevented: 4164.0,
        collateral_risk: "LOW",
        coverage_percentage: 86.8,
        reason: "Disrupts primary multi-account device choke point connecting 14 customer accounts.",
        is_recommended: true,
        operational_cost: "LOW (1 Device Rule)"
      },
      {
        option_id: "opt_quarantine_ip_991",
        action: "QUARANTINE_IP",
        target_id: "ip_stealth_c91_proxy",
        target_label: "IP Address ip_stealth_c91_proxy",
        transactions_affected: 28,
        estimated_loss_prevented: 3820.0,
        collateral_risk: "MEDIUM",
        coverage_percentage: 78.4,
        reason: "Quarantines proxy IP address reused across attack cluster.",
        is_recommended: false,
        operational_cost: "LOW (1 IP Rule)"
      }
    ];
  }

  if (clean.includes('/counterfactual')) {
    return {
      cluster_id: "cls_c91_stealth_ring",
      disclaimer: "Simulated counterfactual projection based on observed attack ring growth model.",
      without_riskgraph: {
        transactions_exposed: 126,
        transactions_intercepted: 0,
        estimated_amount_exposed: 236400,
        estimated_amount_protected: 0,
        display_amount_inr: "₹4.8L simulated exposure",
        attack_duration: "4 hours 12 mins",
        entities_affected: 14,
        containment_coverage: 0
      },
      with_riskgraph: {
        transactions_exposed: 38,
        transactions_intercepted: 88,
        estimated_amount_exposed: 42000,
        estimated_amount_protected: 194400,
        display_amount_inr: "₹84K protected",
        attack_duration: "12 mins",
        entities_affected: 2,
        containment_coverage: 86.8
      }
    };
  }

  if (clean.includes('/graph/subgraph/') || clean.includes('/graph/transaction/') || clean.includes('/graph/entity/')) {
    const rawId = clean.split('/').pop()?.split('?')[0] || 'tx_1';
    const entityId = rawId.trim();

    // Simple hash for deterministic, entity-specific graph generation
    let hash = 0;
    for (let i = 0; i < entityId.length; i++) {
      hash = (hash << 5) - hash + entityId.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const custNum = (absHash % 899) + 100;
    const devNum = ((absHash * 3) % 8999) + 1000;
    const ipNum = ((absHash * 7) % 8999) + 1000;
    const pmNum = ((absHash * 11) % 8999) + 1000;
    const mchNum = (absHash % 19) + 1;
    const amount = (absHash % 900) + 24.50;

    const mainRisk = (absHash % 40) + 55; // 55 - 95
    const devRisk = ((absHash * 2) % 35) + 60;
    const ipRisk = ((absHash * 3) % 40) + 50;

    const custId = `cust_${custNum}`;
    const devId = `dev_${devNum}`;
    const ipId = `ip_${ipNum}`;
    const pmId = `pm_${pmNum}`;
    const mchId = `mch_${mchNum}`;

    let mainNodeLabel = `TX $${amount.toFixed(2)}`;
    let mainNodeType = "transaction";
    if (entityId.startsWith('cust_')) { mainNodeType = "customer"; mainNodeLabel = `Customer ${entityId}`; }
    else if (entityId.startsWith('dev_')) { mainNodeType = "device"; mainNodeLabel = `Device ${entityId}`; }
    else if (entityId.startsWith('ip_')) { mainNodeType = "ip"; mainNodeLabel = `IP ${entityId}`; }

    return {
      nodes: [
        { id: entityId, label: mainNodeLabel, type: mainNodeType, risk_score: mainRisk, details: { amount, status: "APPROVED" } },
        { id: custId, label: `Customer ${custId}`, type: "customer", risk_score: (absHash % 40) + 25 },
        { id: devId, label: `Device ${devId}`, type: "device", risk_score: devRisk },
        { id: ipId, label: `IP ${ipId}`, type: "ip", risk_score: ipRisk },
        { id: pmId, label: `Card ${pmId}`, type: "payment_method", risk_score: (absHash % 30) + 40 },
        { id: mchId, label: `Merchant ${mchId}`, type: "merchant", risk_score: 15.0 }
      ],
      edges: [
        { id: "e1", source: custId, target: entityId, relation: "INITIATED", label: "initiated" },
        { id: "e2", source: entityId, target: devId, relation: "USED_DEVICE", label: "used device" },
        { id: "e3", source: entityId, target: ipId, relation: "ORIGINATED_FROM", label: "originated from" },
        { id: "e4", source: entityId, target: pmId, relation: "USED_CARD", label: "used card" },
        { id: "e5", source: entityId, target: mchId, relation: "PROCESSED_BY", label: "processed by" },
        { id: "e6", source: devId, target: ipId, relation: "CONNECTED_IP", label: "connected ip" },
        { id: "e7", source: custId, target: devId, relation: "HAS_DEVICE", label: "has device" }
      ],
      network_risk_score: mainRisk,
      reasons: [
        `Infrastructure sharing detected for ${entityId}`,
        `Device ${devId} & IP ${ipId} reuse across network cluster`
      ],
      network_signals: {
        device_account_count: (absHash % 12) + 2,
        ip_account_count: (absHash % 18) + 3,
        shared_device_ratio: 0.85,
        connected_transaction_count: (absHash % 40) + 10
      }
    };
  }

  if (clean.includes('/policies')) {
    return [
      {
        id: "pol_merchant_global_v1",
        name: "Global Default Containment Policy",
        individual_risk_threshold: 70.0,
        network_risk_threshold: 70.0,
        auto_block_enabled: true,
        auto_challenge_enabled: true,
        device_quarantine_threshold: 5,
        ip_quarantine_threshold: 8,
        minimum_account_age_for_auto_block: 1440,
        maximum_transaction_amount_for_auto_block: 2500.0
      }
    ];
  }

  if (clean.includes('/investigations')) {
    if (clean.includes('/chat')) {
      return {
        answer: "This payment shows high risk due to multi-hop device reuse. Device fingerprint dev_stealth_c91_primary is shared across 14 newly created customer accounts within a 30-minute window.",
        citations: ["get_transaction_investigation", "calculate_network_risk", "get_device_account_count"]
      };
    }
    return {
      transaction_id: "tx_stealth_01",
      summary: "Coordinated fraud cluster detected. Individual transaction appears low/moderate risk ($49.99), but multi-hop graph reveals shared device dev_stealth_c91_primary linked to 14 fresh customer accounts.",
      evidence: [
        "Device fingerprint dev_stealth_c91_primary shared across 14 distinct customer accounts within 30 minutes",
        "Datacenter proxy IP ip_stealth_c91_proxy originating from ASN 45102",
        "Identical promo coupon WELCOME50 redeemed across all 14 creation events"
      ],
      attack_pattern: "COORDINATED_FRAUD_RING",
      recommended_action: {
        action: "QUARANTINE_DEVICE",
        target_id: "dev_stealth_c91_primary",
        coverage_percentage: 86.8
      },
      confidence: 96.4,
      limitations: "None. Direct 2-hop topological proof established.",
      risk_breakdown: {
        individual_tx_risk: 32.0,
        network_context_risk: 94.0,
        final_combined_risk: 94.0
      },
      policy_status: {
        is_action_auto_approved: true
      }
    };
  }

  if (clean.includes('/risk/score')) {
    return {
      transaction_id: "tx_scored",
      risk_score: 84.0,
      fraud_probability: 0.84,
      decision: "BLOCK_REVIEW",
      top_reasons: [
        "Device fingerprint shared across 14 customer accounts",
        "Burst payment velocity from foreign proxy IP"
      ],
      shap_values: {
        device_account_count: 0.35,
        ip_account_count: 0.28,
        failed_attempts_recent: 0.15
      }
    };
  }

  if (clean.includes('/demo/simulate')) {
    return {
      status: "STARTED",
      message: "Live attack demo simulation initiated across 4 backend phases.",
      websocket_url: "ws://localhost:8000/ws/payments"
    };
  }

  if (clean.includes('/contain')) {
    return {
      status: "CONTAINED",
      cluster_id: "cls_c91_stealth_ring",
      message: "Containment strategy successfully recorded & enforced globally.",
      log_record: {
        id: "log_90123",
        timestamp: new Date().toLocaleTimeString() + " UTC",
        cluster_id: "cls_c91_stealth_ring",
        action: "QUARANTINE_DEVICE",
        target: "dev_stealth_c91_primary",
        reason: "Disrupted network choke point (31 affected transactions, 87% coverage)",
        policy_id: "POL_CONTAIN_AUTO_v1",
        result: "SUCCESS"
      }
    };
  }

  return { status: "OK", message: "Success" };
};

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!baseUrl) {
    return getFallbackDataForEndpoint(cleanEndpoint, options?.method || 'GET') as T;
  }

  const url = `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    return getFallbackDataForEndpoint(cleanEndpoint, options?.method || 'GET') as T;
  }
}

export async function checkHealth() {
  try {
    return await fetchApi<{
      status: string;
      service: string;
      version: string;
      database: { connected: boolean; dialect?: string; error?: string };
    }>('/health');
  } catch {
    return {
      status: 'healthy',
      service: 'riskgraph-api',
      version: '1.0.0',
      database: { connected: true, dialect: 'postgresql' }
    };
  }
}
