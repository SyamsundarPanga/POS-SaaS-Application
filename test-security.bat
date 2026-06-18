@echo off
REM Security Testing Script for Windows
REM This script tests all security endpoints

echo ==================================
echo Security Implementation Test Suite
echo ==================================
echo.

set BASE_URL=http://localhost:8080
set PASSED=0
set FAILED=0

echo Starting tests...
echo.

REM Test 1: Register Tenant
echo === Test 1: Register New Tenant ===
curl -X POST %BASE_URL%/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"storeName\":\"Test Store\",\"adminUsername\":\"admin\",\"adminEmail\":\"admin@teststore.com\",\"adminPassword\":\"SecurePass123!\",\"plan\":\"BASIC\"}"
echo.
echo.

REM Test 2: Login with Valid Credentials
echo === Test 2: Login with Valid Credentials ===
curl -X POST %BASE_URL%/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@teststore.com\",\"password\":\"SecurePass123!\"}"
echo.
echo.

REM Test 3: Login with Invalid Credentials
echo === Test 3: Login with Invalid Credentials ===
curl -X POST %BASE_URL%/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@teststore.com\",\"password\":\"WrongPassword\"}"
echo.
echo.

REM Test 4: Access Protected Endpoint Without Token
echo === Test 4: Access Protected Endpoint Without Token ===
curl -X GET %BASE_URL%/api/products
echo.
echo.

echo ==================================
echo Manual Testing Required
echo ==================================
echo.
echo Please copy the token from Test 2 response and run these commands manually:
echo.
echo 1. Access with token:
echo    curl -X GET %BASE_URL%/api/products -H "Authorization: Bearer YOUR_TOKEN"
echo.
echo 2. Refresh token:
echo    curl -X POST %BASE_URL%/api/auth/refresh-token -H "Content-Type: application/json" -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
echo.
echo 3. Validate token:
echo    curl -X GET %BASE_URL%/api/auth/validate -H "Authorization: Bearer YOUR_TOKEN"
echo.
echo 4. Logout:
echo    curl -X POST %BASE_URL%/api/auth/logout -H "Content-Type: application/json" -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
echo.

pause
