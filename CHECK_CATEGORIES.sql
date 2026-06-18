-- Check all categories in your system
SELECT id, name, description, tenant_id 
FROM categories 
WHERE is_deleted = false
ORDER BY name;

-- Check products and their categories
SELECT 
    p.id,
    p.name as product_name,
    p.sku,
    c.name as category_name,
    p.tenant_id
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_deleted = false
ORDER BY c.name, p.name;

-- Check category distribution (what the API returns)
SELECT 
    c.name as category_name,
    COUNT(p.id) as product_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_deleted = false
GROUP BY c.name
ORDER BY product_count DESC;
