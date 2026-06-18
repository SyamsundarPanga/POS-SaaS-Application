UPDATE subscription_plan
SET
    max_branches = 10,
    max_users = 50,
    max_products = 1000,
    monthly_price = 1299.00
WHERE id = 'BASIC';

UPDATE subscription_plan
SET
    max_branches = 100,
    max_users = 500,
    max_products = 9000,
    monthly_price = 2999.00
WHERE id = 'PRO';

UPDATE subscription_plan
SET
    max_branches = 400,
    max_users = 5000,
    max_products = 50000,
    monthly_price = 4999.00
WHERE id = 'ADVANCE';
