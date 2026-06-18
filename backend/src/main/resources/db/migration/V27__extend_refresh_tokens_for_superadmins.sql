ALTER TABLE refresh_tokens
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE refresh_tokens
    ADD COLUMN super_admin_id BIGINT UNIQUE;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_token_super_admin
        FOREIGN KEY (super_admin_id)
        REFERENCES super_admins(id)
        ON DELETE CASCADE;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT chk_refresh_token_owner
        CHECK (
            (user_id IS NOT NULL AND super_admin_id IS NULL)
            OR
            (user_id IS NULL AND super_admin_id IS NOT NULL)
        );

CREATE INDEX idx_refresh_tokens_super_admin ON refresh_tokens(super_admin_id);
