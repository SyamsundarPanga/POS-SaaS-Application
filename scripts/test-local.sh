#!/bin/bash

# ============================================================================
# Local Test Execution Script with Testcontainers
# ============================================================================
# This script runs backend tests locally using Testcontainers
# Ensures Docker is running and provides helpful error messages
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  POS SaaS Platform - Local Test Execution                 ║${NC}"
echo -e "${BLUE}║  Using Testcontainers with PostgreSQL                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Check Docker
# ============================================================================
echo -e "${YELLOW}[1/4] Checking Docker...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo -e "${YELLOW}Please install Docker Desktop:${NC}"
    echo "  - Windows/Mac: https://www.docker.com/products/docker-desktop"
    echo "  - Linux: sudo apt-get install docker.io"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo -e "${YELLOW}Please start Docker Desktop and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
docker --version
echo ""

# ============================================================================
# Step 2: Check Java
# ============================================================================
echo -e "${YELLOW}[2/4] Checking Java...${NC}"

if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java is not installed!${NC}"
    echo -e "${YELLOW}Please install Java 21 (Temurin recommended)${NC}"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo -e "${RED}❌ Java 21 or higher is required (found: $JAVA_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Java version is compatible${NC}"
java -version
echo ""

# ============================================================================
# Step 3: Clean and Build
# ============================================================================
echo -e "${YELLOW}[3/4] Building project...${NC}"

cd backend

if [ "$1" == "--skip-build" ]; then
    echo -e "${BLUE}Skipping build (--skip-build flag)${NC}"
else
    mvn clean compile -DskipTests
    echo -e "${GREEN}✅ Build successful${NC}"
fi
echo ""

# ============================================================================
# Step 4: Run Tests
# ============================================================================
echo -e "${YELLOW}[4/4] Running tests with Testcontainers...${NC}"
echo -e "${BLUE}This may take 10-15 seconds on first run (downloading PostgreSQL image)${NC}"
echo -e "${BLUE}Subsequent runs will be much faster (~2 seconds)${NC}"
echo ""

# Set environment variables for Testcontainers
export TESTCONTAINERS_REUSE_ENABLE=true

# Run tests based on argument
case "$1" in
    --unit)
        echo -e "${BLUE}Running unit tests only...${NC}"
        mvn test -Dtest="!*IntegrationTest"
        ;;
    --integration)
        echo -e "${BLUE}Running integration tests only...${NC}"
        mvn test -Dtest="*IntegrationTest"
        ;;
    --coverage)
        echo -e "${BLUE}Running tests with coverage...${NC}"
        mvn clean test jacoco:report
        echo -e "${GREEN}Coverage report: backend/target/site/jacoco/index.html${NC}"
        ;;
    --verbose)
        echo -e "${BLUE}Running tests with verbose output...${NC}"
        mvn test -X
        ;;
    *)
        echo -e "${BLUE}Running all tests...${NC}"
        mvn test
        ;;
esac

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Tests completed successfully!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Test reports:${NC} backend/target/surefire-reports/"
echo -e "${BLUE}Container logs:${NC} docker logs \$(docker ps -q --filter 'label=org.testcontainers')"
echo ""
echo -e "${YELLOW}Tip: Container is reused for faster subsequent runs${NC}"
echo -e "${YELLOW}To clean up: docker stop \$(docker ps -q --filter 'label=org.testcontainers')${NC}"
echo ""
