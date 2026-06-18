-- =====================================================
-- Migration: V21__create_blacklisted_tokens_table.sql
-- Description: Create blacklist table for invalidated JWT access tokens
-- Author: Development Team
-- Date: 2026-03-11
-- =====================================================

CREATE TABLE blacklisted_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(1000) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blacklisted_tokens_token ON blacklisted_tokens(token);
CREATE INDEX idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);

COMMENT ON TABLE blacklisted_tokens IS 'Access tokens invalidated at logout until original expiry time';
