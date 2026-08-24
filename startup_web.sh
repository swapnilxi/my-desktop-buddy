#!/usr/bin/env bash

# ══════════════════════════════════════════════════════════════════
# 🐹 HamsterDesk — Web Startup Script
# Kills existing processes on ports 8000 & 3000, then starts BE & Web FE
# ══════════════════════════════════════════════════════════════════

set -e

# Resolve script root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

BACKEND_PORT=8000
FRONTEND_PORT=3000

# Add user-installed Node and Python binaries to PATH if present
export PATH="$HOME/.local/node/bin:$HOME/Library/Python/3.9/bin:$HOME/Library/Python/3.10/bin:$HOME/Library/Python/3.11/bin:$HOME/Library/Python/3.12/bin:$PATH"

# Color helpers
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}🐹 Starting HamsterDesk (Web Version)...${NC}"

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

# 1. Clean up existing ports
echo -e "\n${BOLD}[1/4] Checking and clearing ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# 2. Check dependencies
echo -e "\n${BOLD}[2/4] Verifying runtimes...${NC}"
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
echo -e "\n${BOLD}[3/4] Launching FastAPI Backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!

# Trap Ctrl+C (SIGINT) and SIGTERM to kill background children cleanly
cleanup() {
  echo -e "\n\n${YELLOW}🐹 Shutting down HamsterDesk Web services...${NC}"
  if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  echo -e "${GREEN}✓ All HamsterDesk processes stopped. Bye! 🐹👋${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to boot
sleep 2

# 4. Start Frontend (Next.js)
echo -e "\n${BOLD}[4/4] Launching Next.js Web Frontend on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"

echo -e "\n${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}✨ HamsterDesk Web is live!${NC}"
echo -e "  🌐 Web App:  ${CYAN}http://localhost:3000${NC}"
echo -e "  🧠 Backend:  ${CYAN}http://localhost:8000${NC}"
echo -e "  📖 API Docs: ${CYAN}http://localhost:8000/docs${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}\n"
echo -e "${YELLOW}Press Ctrl+C anytime to stop both servers.${NC}\n"

# Run frontend in foreground
npm run dev -- -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for background processes
wait
