#!/bin/bash
echo "Setting up development environment..."
docker-compose up -d postgres
cd backend && mvn clean install -DskipTests
cd ../frontend && npm install
echo "Seeding database..."
./scripts/seed-data.sh
echo "Setup complete!"
