#!/bin/bash

# PageTurners Development Script
# Starts Backend (Background) and Frontend (Foreground)

set -m  # Enable job control

echo "🚀 Starting PageTurners Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on Ctrl+C
cleanup() {
    echo ""
    echo -e "${RED}Stopping all services...${NC}"
    # Kill the background backend process
    kill %1 2>/dev/null
    echo -e "${RED}Backend stopped. Cleaning up...${NC}"
    exit 0
}

trap cleanup SIGINT

# 1. Start Backend in background
echo -e "${BLUE}Starting Backend (Flask)...${NC}"
cd pageturners-backend


# Ensure venv is activated
source venv/bin/activate
# Run Flask in background
python3 app.py &

# FOR LINUX: skip 'source' and call the venv python directly for Arch/Fish compatibility
# ./venv/bin/python app.py &

BACKEND_PID=$!
cd ..

# Give the backend a moment to connect to MongoDB
sleep 3

# 2. Start Frontend in foreground
echo -e "${BLUE}Starting Frontend (Vite)...${NC}"
cd pageturners-frontend
# This stays in the foreground so you can see Vite logs
npm run dev