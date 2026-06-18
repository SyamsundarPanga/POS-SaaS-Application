-- V14__create_super_admins_table.sql
-- SuperAdmin table - Platform owners (NOT tenant-scoped)

CREATE TABLE IF NOT EXISTS super_admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_superadmin_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

-- Create indexes for performance
CREATE INDEX idx_super_admins_email ON super_admins(email);
CREATE INDEX idx_super_admins_username ON super_admins(username);
CREATE INDEX idx_super_admins_status ON super_admins(status);

COMMENT ON TABLE super_admins IS 'Platform owners who can view all tenants and subscriptions';
COMMENT ON COLUMN super_admins.status IS 'SuperAdmin account status: ACTIVE, INACTIVE, SUSPENDED';
