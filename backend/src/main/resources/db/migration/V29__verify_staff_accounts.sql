UPDATE users
SET is_email_verified = TRUE
WHERE is_email_verified = FALSE
  AND role IN ('ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER');
