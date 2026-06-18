-- SQL Script to Verify Tenant Counts
-- Run this to see what the SuperAdmin dashboard should display

-- ============================================
-- Platform-Wide Statistics
-- ============================================

SELECT 'PLATFORM STATISTICS' as section;

SELECT 
    'Total Tenants' as metric,
    COUNT(*) as value
FROM tenants;

SELECT 
    'Active Tenants' as metric,
    COUNT(*) as value
FROM tenants 
WHERE active = true;

SELECT 
    'Total Users' as metric,
    COUNT(*) as value
FROM users;

SELECT 
    'Total Branches' as metric,
    COUNT(*) as value
FROM branches;

SELECT 
    'Total Products' as metric,
    COUNT(*) as value
FROM products;

SELECT 
    'Total Orders' as metric,
    COUNT(*) as value
FROM orders;

-- ============================================
-- Subscription Distribution
-- ============================================

SELECT 'SUBSCRIPTION DISTRIBUTION' as section;

SELECT 
    sp.plan_type,
    COUNT(*) as count
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'ACTIVE'
GROUP BY sp.plan_type;

-- ============================================
-- Revenue Calculation
-- ============================================

SELECT 'REVENUE METRICS' as section;

SELECT 
    'Monthly Revenue' as metric,
    SUM(sp.monthly_price) as value
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'ACTIVE';

-- ============================================
-- Per-Tenant Breakdown
-- ============================================

SELECT 'PER-TENANT METRICS' as section;

SELECT 
    t.name as tenant_name,
    t.id as tenant_id,
    sp.plan_type,
    s.status as subscription_status,
    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users,
    (SELECT COUNT(*) FROM branches WHERE tenant_id = t.id) as branches,
    (SELECT COUNT(*) FROM products WHERE tenant_id = t.id) as products,
    (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id) as orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = t.id) as total_revenue,
    sp.monthly_price,
    sp.max_users,
    sp.max_branches,
    sp.max_products
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status = 'ACTIVE'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
ORDER BY t.name;

-- ============================================
-- Verification Queries
-- ============================================

SELECT 'VERIFICATION' as section;

-- Check if any tenant has data
SELECT 
    'Tenants with Users' as check_name,
    COUNT(DISTINCT tenant_id) as count
FROM users;

SELECT 
    'Tenants with Branches' as check_name,
    COUNT(DISTINCT tenant_id) as count
FROM branches;

SELECT 
    'Tenants with Products' as check_name,
    COUNT(DISTINCT tenant_id) as count
FROM products;

SELECT 
    'Tenants with Orders' as check_name,
    COUNT(DISTINCT tenant_id) as count
FROM orders;

-- ============================================
-- Expected vs Actual Check
-- ============================================

SELECT 'EXPECTED VS ACTUAL' as section;

-- This should match what SuperAdmin dashboard displays
SELECT 
    'Dashboard Should Show' as info,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM tenants WHERE active = true) as active_tenants,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM branches) as total_branches,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM orders) as total_orders;
