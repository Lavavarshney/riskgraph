-- SQL Schema for RISKGRAPH Fraud Containment Engine

CREATE TABLE IF NOT EXISTS system_status (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_status (component, status) 
VALUES ('database', 'healthy'), ('simulator', 'idle'), ('graph_engine', 'active')
ON CONFLICT DO NOTHING;

-- Relational Entities
CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    risk_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    email_domain VARCHAR(100) NOT NULL,
    account_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    risk_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    fingerprint_hash VARCHAR(64) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    os_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_addresses (
    id VARCHAR(64) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    is_proxy BOOLEAN DEFAULT FALSE,
    asn VARCHAR(50) DEFAULT 'AS15169',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(64) PRIMARY KEY,
    card_hash VARCHAR(64) NOT NULL,
    card_bin VARCHAR(8) NOT NULL,
    card_type VARCHAR(30) DEFAULT 'CREDIT',
    issuer_country VARCHAR(3) DEFAULT 'USA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent INT DEFAULT 15,
    max_uses INT DEFAULT 1000,
    current_uses INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_clusters (
    id VARCHAR(64) PRIMARY KEY,
    cluster_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    affected_merchants INT DEFAULT 0,
    affected_cards INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) REFERENCES merchants(id),
    customer_id VARCHAR(64) REFERENCES customers(id),
    device_id VARCHAR(64) REFERENCES devices(id),
    ip_id VARCHAR(64) REFERENCES ip_addresses(id),
    payment_method_id VARCHAR(64) REFERENCES payment_methods(id),
    coupon_id VARCHAR(64) REFERENCES coupons(id),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'APPROVED',
    payment_attempt_number INT DEFAULT 1,
    failed_attempts_recent INT DEFAULT 0,
    account_age_minutes INT DEFAULT 1440,
    country VARCHAR(3) DEFAULT 'USA',
    is_fraud BOOLEAN DEFAULT FALSE,
    fraud_type VARCHAR(50) DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(64) REFERENCES transactions(id),
    transaction_risk FLOAT NOT NULL,
    behavioral_anomaly FLOAT NOT NULL,
    network_risk FLOAT NOT NULL,
    final_score FLOAT NOT NULL,
    decision VARCHAR(30) NOT NULL,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS containment_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_rule JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
