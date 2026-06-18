CREATE TABLE IF NOT EXISTS subscription_payments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    store_admin_id BIGINT NOT NULL,
    subscription_plan VARCHAR(30) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    payment_status VARCHAR(20) NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subscription_payment_store_admin
        FOREIGN KEY (store_admin_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_tenant_id
    ON subscription_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_at
    ON subscription_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
    ON subscription_payments(payment_status);

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS next_plan_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS downgrade_effective_date TIMESTAMP;

ALTER TABLE subscriptions
    ADD CONSTRAINT fk_subscriptions_next_plan
    FOREIGN KEY (next_plan_id) REFERENCES subscription_plan(id)
    ON DELETE SET NULL;
