#!/bin/bash

# PageTurners Development Script
# Starts Backend (Background) and Frontend (Foreground)

set -m  # Enable job control for better process management

echo -e "🚀 \033[0;32mStarting PageTurners Development Environment...\033[0m\n"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =====================================================================
# PRE-FLIGHT CHECK: Free up Port 5001 before starting
# =====================================================================
echo -e "${BLUE}Checking for stuck processes on Port 5001...${NC}"

# Find any process using Port 5001 and grab its ID (PID)
STALE_PIDS=$(lsof -t -i:5001 2>/dev/null)

if [ -n "$STALE_PIDS" ]; then
    echo -e "${RED}Found ghost processes blocking Port 5001. Clearing them out...${NC}"
    kill -9 $STALE_PIDS 2>/dev/null
    echo -e "${GREEN}Port 5001 is now free and ready!${NC}"
    sleep 1 # Give the OS a moment to reset the port
else
    echo -e "${GREEN}Port 5001 is already clear.${NC}"
fi
echo ""

# =====================================================================
# CLEANUP FUNCTION: Shut down all services on Ctrl+C
# =====================================================================
cleanup() {
    echo ""
    echo -e "${RED}Stopping all services cleanly...${NC}"
    
    # 1. Target the specific backend process
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${RED}Shutting down Flask backend (PID: $BACKEND_PID)...${NC}"
        
        # Kill child processes (like the Flask reloader) first
        pkill -P $BACKEND_PID 2>/dev/null
        # Kill the main backend process
        kill $BACKEND_PID 2>/dev/null
    fi

    # 2. Wait for jobs to finish their shutdown sequence
    wait 2>/dev/null

    echo -e "${GREEN}All connections closed and ports freed. Goodbye!${NC}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and termination (SIGTERM)
trap cleanup SIGINT SIGTERM

# =====================================================================
# 1. START BACKEND (Flask)
# =====================================================================
echo -e "${BLUE}Starting Backend (Flask)...${NC}"
cd pageturners-backend

# Define the direct path to the virtual environment's Python.
# This avoids 'ModuleNotFoundError' issues with 'source activate'.
VENV_PYTHON="./venv/bin/python3"

# Safety check: If venv is missing, alert the user.
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}Error: Virtual environment not found in pageturners-backend/venv/${NC}"
    echo -e "Please run 'python3 -m venv venv' and install requirements first."
    exit 1
fi

# Run Flask using the specific venv python in the background
$VENV_PYTHON backend_app.py &

# Capture the backend PID for our cleanup function
BACKEND_PID=$!
cd ..

# Wait for MongoDB connection and server startup
sleep 3

# =====================================================================
# 2. START FRONTEND (Vite)
# =====================================================================
echo -e "${BLUE}Starting Frontend (Vite)...${NC}"
cd pageturners-frontend

# Runs Vite in the foreground so you can see live logs
npm run dev