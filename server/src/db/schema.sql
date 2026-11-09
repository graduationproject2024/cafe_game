-- ==============================================================================
-- the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
-- Phase 2 Production Database Schema (Compatible with SQLite & PostgreSQL/Supabase)
-- ==============================================================================

-- 1. Customers Table (Frictionless identity via validated Saudi phone)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    nickname TEXT DEFAULT 'ضيف the A&A',
    welcome_promo_status TEXT DEFAULT 'ELIGIBLE', -- ELIGIBLE | QUALIFIED | CLAIMED | INELIGIBLE
    first_promo_awarded INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 1,
    best_score INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 2. Sessions Table (Client session binding & abandoned score reset)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    started_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);

-- 3. Game Runs Table (Auditable gameplay runs & server validation)
CREATE TABLE IF NOT EXISTS game_runs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    raw_score INTEGER NOT NULL,
    verified_score INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    status TEXT DEFAULT 'VERIFIED', -- VERIFIED | REJECTED_BOUNDS | TAMPERED
    rejection_reason TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_game_runs_customer ON game_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_game_runs_game ON game_runs(game_id);

-- 4. Staff Accounts Table (Server-side PBKDF2 authentication & RBAC)
CREATE TABLE IF NOT EXISTS staff_accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL, -- cashier | manager | owner
    full_name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff_accounts(username);

-- 5. Vouchers Table (Central server-authoritative voucher register)
CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL, -- T (5%) | S (7%) | G (Free Drink Upgrade)
    tier INTEGER NOT NULL, -- 1, 2, 3
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE | REDEEMED | REVOKED | EXPIRED
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    previous_code TEXT, -- Tracks revoked code in upgrade scenario
    server_signature TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON vouchers(customer_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- 6. Redemptions Table (Atomic Cashier Redemptions)
CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY,
    voucher_id TEXT NOT NULL UNIQUE, -- Strictly UNIQUE: ensures 1:1 redemption
    voucher_code TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    redeemed_at INTEGER NOT NULL,
    order_ref TEXT,
    notes TEXT,
    FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE RESTRICT,
    FOREIGN KEY(staff_id) REFERENCES staff_accounts(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_redemptions_code ON redemptions(voucher_code);
CREATE INDEX IF NOT EXISTS idx_redemptions_staff ON redemptions(staff_id);

-- 7. Audit Logs Table (Tamper-evident security audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL, -- STAFF_LOGIN | CLAIM_VOUCHER | REDEEM_VOUCHER | REDEEM_RACE_BLOCKED | SECURITY_ALERT
    actor_id TEXT NOT NULL,
    actor_type TEXT NOT NULL, -- STAFF | CUSTOMER | SYSTEM
    details TEXT,
    ip_address TEXT,
    timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
