-- =====================================================
-- Migration: V09__create_shifts_table.sql
-- Description: Create shifts table for employee shift management
-- Author: Development Team
-- Date: 2026-02-27
-- =====================================================

CREATE TABLE shifts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    employee_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    shift_start TIMESTAMP NOT NULL,
    shift_end TIMESTAMP,
    starting_cash NUMERIC(10,2) NOT NULL,
    final_cash NUMERIC(10,2),
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, CLOSED
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_shift_employee FOREIGN KEY (employee_id) 
        REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_start ON shifts(shift_start DESC);

-- Comments
COMMENT ON TABLE shifts IS 'Employee shift tracking with cash reconciliation';
COMMENT ON COLUMN shifts.starting_cash IS 'Cash in register at shift start';
COMMENT ON COLUMN shifts.final_cash IS 'Cash in register at shift end';
