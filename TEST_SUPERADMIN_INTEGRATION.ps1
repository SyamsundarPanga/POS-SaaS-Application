# SuperAdmin Integration Test Script (PowerShell)
# This script tests the SuperAdmin endpoints with real data

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SuperAdmin Real Data Integration Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:8082/api"
$SUPERADMIN_EMAIL = "superadmin@possaas.com"
$SUPERADMIN_PASSWORD = "SuperAdmin@123"

Write-Host "Step 1: Testing SuperAdmin Login..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

# Login request
$loginBody = @{
    email = $SUPERADMIN_EMAIL
    password = $SUPERADMIN_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/superadmin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    Write-Host "✓ Login successful" -ForegroundColor Green
    $token = $loginResponse.accessToken
    Write-Host "Token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
    Write-Host ""
} catch {
    Write-Host "✗ Login failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Testing Dashboard Endpoint..." -ForegroundColor Yellow
Write-Host "--------------------------------------"

try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $dashboardResponse = Invoke-RestMethod -Uri "$API_URL/superadmin/dashboard" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Dashboard data retrieved" -ForegroundColor Green
    Write-Host ""
    Write-Host "Dashboard Statistics:" -ForegroundColor Cyan
    Write-Host "--------------------"
    Write-Host "Total Tenants: $($dashboardResponse.totalTenants)"
    Write-Host "Active Tenants: $($dashboardResponse.activeTenants)"
    Write-Host "Total Users: $($dashboardResponse.totalUsers)"
    Write-Host "Total Branches: $($dashboardResponse.totalBranches)"
    Write-Host "Total Products: $($dashboardResponse.totalProducts)"
    Write-Host "Total Orders: $($dashboardResponse.totalOrders)"
    Write-Host "Monthly Revenue: `$$($dashboardResponse.totalMonthlyRevenue)"
    Write-Host "Projected Annual Revenue: `$$($dashboardResponse.projectedAnnualRevenue)"
    Write-Host ""
    Write-Host "Subscription Distribution:" -ForegroundColor Cyan
    Write-Host "Basic Plan: $($dashboardResponse.basicPlanCount)"
    Write-Host "Pro Plan: $($dashboardResponse.proPlanCount)"
    Write-Host "Advance Plan: $($dashboardResponse.advancePlanCount)"
    Write-Host ""
} catch {
    Write-Host "✗ Failed to retrieve dashboard data" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 3: Testing Tenants List Endpoint..." -ForegroundColor Yellow
Write-Host "-----------------------------------------"

try {
    $tenantsResponse = Invoke-RestMethod -Uri "$API_URL/superadmin/tenants?page=0&size=5" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Tenants list retrieved" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tenants in response: $($tenantsResponse.content.Count)"
    Write-Host "Total tenants in database: $($tenantsResponse.totalElements)"
    Write-Host "Total pages: $($tenantsResponse.totalPages)"
    Write-Host ""
    
    if ($tenantsResponse.content.Count -gt 0) {
        Write-Host "Sample Tenant Data:" -ForegroundColor Cyan
        Write-Host "-------------------"
        $firstTenant = $tenantsResponse.content[0]
        Write-Host "Name: $($firstTenant.tenantName)"
        Write-Host "Plan: $($firstTenant.planType)"
        Write-Host "Status: $($firstTenant.subscriptionStatus)"
        Write-Host "Users: $($firstTenant.currentUsers)/$($firstTenant.maxUsers)"
        Write-Host "Branches: $($firstTenant.currentBranches)/$($firstTenant.maxBranches)"
        Write-Host "Products: $($firstTenant.currentProducts)/$($firstTenant.maxProducts)"
        Write-Host "Total Orders: $($firstTenant.totalOrders)"
        Write-Host "Total Revenue: `$$($firstTenant.totalRevenue)"
        Write-Host ""
    }
} catch {
    Write-Host "✗ Failed to retrieve tenants list" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "All Tests Passed! ✓" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "--------"
Write-Host "✓ SuperAdmin authentication working" -ForegroundColor Green
Write-Host "✓ Dashboard endpoint returning real data" -ForegroundColor Green
Write-Host "✓ Tenants list endpoint returning real data" -ForegroundColor Green
Write-Host "✓ JWT token generation and validation working" -ForegroundColor Green
Write-Host ""
Write-Host "Your SuperAdmin integration is complete and functional!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000/superadmin/login"
Write-Host "2. Login with: $SUPERADMIN_EMAIL"
Write-Host "3. View real-time platform statistics"
Write-Host ""
