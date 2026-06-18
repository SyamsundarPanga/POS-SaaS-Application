-- =====================================================
-- Migration: V02__create_users_table.sql
-- Description: Create users table for authentication and authorization
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- ROLE_SUPER_ADMIN, ROLE_STORE_ADMIN, ROLE_BRANCH_MANAGER, ROLE_CASHIER, ROLE_VIEWER
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    branch_id BIGINT, -- Nullable, FK added later after branches table created
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Unique constraints (tenant-scoped)
    CONSTRAINT uk_user_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT uk_user_tenant_username UNIQUE (tenant_id, username)
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tenant_active ON users(tenant_id, is_deleted);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Comments
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON COLUMN users.tenant_id IS 'Tenant isolation - all users belong to a tenant';
COMMENT ON COLUMN users.role IS 'User role: SUPER_ADMIN, STORE_ADMIN, BRANCH_MANAGER, CASHIER, VIEWER';
COMMENT ON COLUMN users.branch_id IS 'Assigned branch for branch-level users (nullable)';
