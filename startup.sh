#!/usr/bin/env bash

# ══════════════════════════════════════════════════════════════════
# 🐹 HamsterDesk — Desktop App Startup Script
# Finds free ports (base + up to 2 fallbacks), starts BE & FE,
# and launches the Electron Desktop Widget.
# ══════════════════════════════════════════════════════════════════

set -e

# Resolve script root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ELECTRON_DIR="$PROJECT_ROOT/electron-desktop"

BASE_BACKEND_PORT=8000
BASE_FRONTEND_PORT=3000
PORT_ATTEMPTS=3   # try base port + 2 fallbacks

# Add user-installed Node and Python binaries to PATH if present
export PATH="$HOME/.local/node/bin:$HOME/Library/Python/3.9/bin:$HOME/Library/Python/3.10/bin:$HOME/Library/Python/3.11/bin:$HOME/Library/Python/3.12/bin:$PATH"
export PYTHONWARNINGS="ignore"

# Color helpers
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}🐹 Starting HamsterDesk Desktop App...${NC}"

# Function to kill any process listening on a given port
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}⚠️  Port $port is in use by PID(s): $pids. Stopping existing process...${NC}"
    kill -9 $pids 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Port $port cleared.${NC}"
  else
    echo -e "${GREEN}✓ Port $port is free.${NC}"
  fi
}

# Find the first free port starting at $1, trying up to $PORT_ATTEMPTS ports
find_free_port() {
  local base=$1
  local port=$base
  local attempt=1
  while [ $attempt -le $PORT_ATTEMPTS ]; do
    if [ -z "$(lsof -ti :$port 2>/dev/null)" ]; then
      echo "$port"
      return 0
    fi
    echo -e "${YELLOW}⚠️  Port $port is busy, trying next...${NC}" >&2
    port=$((port + 1))
    attempt=$((attempt + 1))
  done
  # All candidate ports busy — fall back to clearing the base port
  echo -e "${RED}❌ All ports ${base}-$((base + PORT_ATTEMPTS - 1)) busy. Clearing port ${base}...${NC}" >&2
  kill_port $base >&2
  echo "$base"
}

# 1. Pick free ports
echo -e "\n${BOLD}[1/5] Checking ports...${NC}"
BACKEND_PORT=$(find_free_port $BASE_BACKEND_PORT)
FRONTEND_PORT=$(find_free_port $BASE_FRONTEND_PORT)
echo -e "${GREEN}✓ Backend port:  $BACKEND_PORT${NC}"
echo -e "${GREEN}✓ Frontend port: $FRONTEND_PORT${NC}"

# Make sure the frontend talks to whichever backend port was picked
export NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT"
export BACKEND_PORT
export FRONTEND_PORT

# 2. Check dependencies
echo -e "\n${BOLD}[2/5] Verifying runtimes...${NC}"
if command -v python3 >/dev/null 2>&1; then
  echo -e "  • Python: $(python3 --version)"
else
  echo -e "${RED}❌ python3 is required but not found in PATH.${NC}"
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  echo -e "  • Node: $(node --version)"
  echo -e "  • NPM: $(npm --version)"
else
  echo -e "${RED}❌ node/npm is required but not found in PATH.${NC}"
  exit 1
fi

# 3. Start Backend (FastAPI)
echo -e "\n${BOLD}[3/5] Launching FastAPI Backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!

# Trap Ctrl+C (SIGINT) and SIGTERM to kill background children cleanly
cleanup() {
  echo -e "\n\n${YELLOW}🐹 Shutting down HamsterDesk services...${NC}"
  if [ -n "$ELECTRON_PID" ]; then
    kill $ELECTRON_PID 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  echo -e "${GREEN}✓ All HamsterDesk processes stopped. Bye! 🐹👋${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Start Frontend (Next.js)
echo -e "\n${BOLD}[4/5] Launching Next.js UI on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"
npm run dev -- -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for frontend server to become responsive
echo -e "  • Waiting for UI to become ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  sleep 1
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo -e "${RED}❌ Frontend timed out starting up.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend is ready!${NC}"

# 5. Start Electron Desktop App
echo -e "\n${BOLD}[5/5] Launching Electron Desktop Pet Widget...${NC}"
cd "$ELECTRON_DIR"

echo -e "\n${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}✨ HamsterDesk Desktop App is running!${NC}"
echo -e "  🖥️  Desktop:   Floating right-edge widget + Menu Bar Tray"
echo -e "  🌐 Web Mirror: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  🧠 Backend:    ${CYAN}http://localhost:$BACKEND_PORT${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}\n"
echo -e "${YELLOW}Closing the Electron window or pressing Ctrl+C will exit.${NC}\n"

ELECTRON_DEV=true npx electron .
