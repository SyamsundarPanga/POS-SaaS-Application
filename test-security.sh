#!/bin/bash

# Security Testing Script
# This script tests all security endpoints

echo "=================================="
echo "Security Implementation Test Suite"
echo "=================================="
echo ""

BASE_URL="http://localhost:8080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local token=$6
    
    echo -n "Testing: $test_name... "
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        echo "$body"
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        echo "$body"
    fi
    echo ""
}

echo "Starting tests..."
echo ""

# Test 1: Register Tenant
echo "=== Test 1: Register New Tenant ==="
REGISTER_DATA='{
  "storeName": "Test Store",
  "adminUsername": "admin",
  "adminEmail": "admin@teststore.com",
  "adminPassword": "SecurePass123!",
  "plan": "BASIC"
}'

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA")

echo "$REGISTER_RESPONSE"

# Extract token from response
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    echo "Token: ${TOKEN:0:50}..."
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ Registration failed${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Login with Valid Credentials
echo "=== Test 2: Login with Valid Credentials ==="
LOGIN_DATA='{
  "email": "admin@teststore.com",
  "password": "SecurePass123!"
}'

test_endpoint "Valid Login" "POST" "/api/auth/login" "$LOGIN_DATA" 200
echo ""

# Test 3: Login with Invalid Credentials
echo "=== Test 3: Login with Invalid Credentials ==="
INVALID_LOGIN_DATA='{
  "email": "admin@teststore.com",
  "password": "WrongPassword"
}'

test_endpoint "Invalid Login" "POST" "/api/auth/login" "$INVALID_LOGIN_DATA" 401
echo ""

# Test 4: Access Protected Endpoint Without Token
echo "=== Test 4: Access Protected Endpoint Without Token ==="
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/products")
http_code=$(echo "$response" | tail -n1)

echo -n "Testing: Access without token... "
if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code - Correctly blocked)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Expected 401/403, got $http_code)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Access Protected Endpoint With Token
echo "=== Test 5: Access Protected Endpoint With Valid Token ==="
if [ -n "$TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/products" \
        -H "Authorization: Bearer $TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    echo -n "Testing: Access with token... "
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 404 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code - Access granted)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected 200/404, got $http_code)"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} (No token available)"
fi
echo ""

# Test 6: Refresh Token
echo "=== Test 6: Refresh Access Token ==="
if [ -n "$REFRESH_TOKEN" ]; then
    REFRESH_DATA="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    test_endpoint "Refresh Token" "POST" "/api/auth/refresh-token" "$REFRESH_DATA" 200
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} (No refresh token available)"
fi
echo ""

# Test 7: Validate Token
echo "=== Test 7: Validate Token ==="
if [ -n "$TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/auth/validate" \
        -H "Authorization: Bearer $TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    echo -n "Testing: Token validation... "
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected 200, got $http_code)"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} (No token available)"
fi
echo ""

# Test 8: Logout
echo "=== Test 8: Logout ==="
if [ -n "$REFRESH_TOKEN" ]; then
    LOGOUT_DATA="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
    test_endpoint "Logout" "POST" "/api/auth/logout" "$LOGOUT_DATA" 200
else
    echo -e "${YELLOW}⊘ SKIPPED${NC} (No refresh token available)"
fi
echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Security implementation is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please check the output above.${NC}"
    exit 1
fi
