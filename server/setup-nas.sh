#!/bin/sh
# PrintFlow NAS Setup Script
# Run this once on your NAS after copying the server folder
# Usage: chmod +x setup-nas.sh && ./setup-nas.sh

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo "${GREEN}║     PrintFlow NAS Setup Script        ║${NC}"
echo "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check Docker
if ! command -v docker > /dev/null 2>&1; then
  echo "${RED}Docker is not installed. Install Docker or Docker Package on your NAS first.${NC}"
  exit 1
fi

# Check .env
if [ ! -f ".env" ]; then
  echo "${YELLOW}No .env found — copying from .env.example${NC}"
  cp .env.example .env
  echo "${RED}IMPORTANT: Edit .env now and set JWT_SECRET and OWNER_PASSWORD before continuing.${NC}"
  echo "Press Enter when ready..."
  read -r _
fi

# Create data directories
mkdir -p /volume1/printflow/data /volume1/printflow/logs
echo "${GREEN}✓ Data directories created${NC}"

# Build and start
echo "Building PrintFlow server image..."
docker compose build

echo "Starting PrintFlow server..."
docker compose up -d

# Wait for health
echo "Waiting for server to be ready..."
sleep 5
MAX=20
COUNT=0
while [ $COUNT -lt $MAX ]; do
  if wget -qO- http://localhost:3001/health > /dev/null 2>&1; then
    echo "${GREEN}✓ Server is healthy${NC}"
    break
  fi
  COUNT=$((COUNT+1))
  sleep 2
done

if [ $COUNT -eq $MAX ]; then
  echo "${RED}Server did not become healthy. Check logs: docker compose logs${NC}"
  exit 1
fi

# Seed owner account
echo "Creating owner account..."
docker compose exec printflow-server node src/db/seed.js

echo ""
echo "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║           PrintFlow is running!                   ║${NC}"
echo "${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
echo "${GREEN}║  Server:  http://$(hostname -I | awk '{print $1}'):3001          ║${NC}"
echo "${GREEN}║  Health:  http://$(hostname -I | awk '{print $1}'):3001/health   ║${NC}"
echo "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo "${YELLOW}Next steps:${NC}"
echo "  1. Note the server IP above — you'll enter it in the desktop app"
echo "  2. Open the PrintFlow desktop app and enter that IP to connect"
echo "  3. Log in with the owner credentials from your .env file"
echo "  4. Change your password immediately after first login"
echo ""
