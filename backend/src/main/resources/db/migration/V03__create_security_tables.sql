-- =====================================================
-- Migration: V03__create_security_tables.sql
-- Description: Create security-related tables (refresh tokens, login attempts, password reset)
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1. REFRESH TOKENS TABLE
-- =====================================================
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE, -- OneToOne relationship
    token VARCHAR(500) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_refresh_tokens_tenant ON refresh_tokens(tenant_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens(expiry_date);

-- =====================================================
-- 2. LOGIN ATTEMPTS TABLE
-- =====================================================
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    attempt_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    successful BOOLEAN NOT NULL,
    failure_reason VARCHAR(500),
    tenant_id VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_tenant ON login_attempts(tenant_id);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_time DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);

-- =====================================================
-- 3. PASSWORD RESET OTPS TABLE
-- =====================================================
CREATE TABLE password_reset_otps (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verification_attempts INTEGER NOT NULL DEFAULT 0,
    verified_at TIMESTAMP,
    reset_token_hash VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_password_reset_email ON password_reset_otps(email);
CREATE INDEX idx_password_reset_tenant ON password_reset_otps(tenant_id);
CREATE INDEX idx_password_reset_expires ON password_reset_otps(expires_at);

-- Comments
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for authentication';
COMMENT ON TABLE login_attempts IS 'Login attempt tracking for security monitoring';
COMMENT ON TABLE password_reset_otps IS 'OTP-based password reset tokens';
