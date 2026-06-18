@echo off
REM ============================================================================
REM Local Test Execution Script with Testcontainers (Windows)
REM ============================================================================
REM This script runs backend tests locally using Testcontainers
REM Ensures Docker is running and provides helpful error messages
REM ============================================================================

setlocal enabledelayedexpansion

echo ================================================================
echo   POS SaaS Platform - Local Test Execution
echo   Using Testcontainers with PostgreSQL
echo ================================================================
echo.

REM ============================================================================
REM Step 1: Check Docker
REM ============================================================================
echo [1/4] Checking Docker...

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    exit /b 1
)

docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo [OK] Docker is running
docker --version
echo.

REM ============================================================================
REM Step 2: Check Java
REM ============================================================================
echo [2/4] Checking Java...

java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed!
    echo Please install Java 21 (Temurin recommended)
    exit /b 1
)

echo [OK] Java is installed
java -version
echo.

REM ============================================================================
REM Step 3: Navigate to backend
REM ============================================================================
echo [3/4] Navigating to backend directory...
cd backend
if errorlevel 1 (
    echo [ERROR] Backend directory not found!
    exit /b 1
)
echo.

REM ============================================================================
REM Step 4: Run Tests
REM ============================================================================
echo [4/4] Running tests with Testcontainers...
echo This may take 10-15 seconds on first run (downloading PostgreSQL image)
echo Subsequent runs will be much faster (~2 seconds)
echo.

REM Set environment variables for Testcontainers
set TESTCONTAINERS_REUSE_ENABLE=true

REM Run tests based on argument
if "%1"=="--unit" (
    echo Running unit tests only...
    mvn test -Dtest="!*IntegrationTest"
) else if "%1"=="--integration" (
    echo Running integration tests only...
    mvn test -Dtest="*IntegrationTest"
) else if "%1"=="--coverage" (
    echo Running tests with coverage...
    mvn clean test jacoco:report
    echo Coverage report: backend\target\site\jacoco\index.html
) else if "%1"=="--verbose" (
    echo Running tests with verbose output...
    mvn test -X
) else (
    echo Running all tests...
    mvn test
)

if errorlevel 1 (
    echo.
    echo [ERROR] Tests failed!
    exit /b 1
)

REM ============================================================================
REM Summary
REM ============================================================================
echo.
echo ================================================================
echo   Tests completed successfully!
echo ================================================================
echo.
echo Test reports: backend\target\surefire-reports\
echo.
echo Tip: Container is reused for faster subsequent runs
echo To clean up: docker stop $(docker ps -q --filter "label=org.testcontainers")
echo.

endlocal
