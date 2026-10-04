#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# 🐾 Desktop Buddy — First-Time Setup & Installation Script
# Installs all required Node.js and Python dependencies for Mac, Linux, and Windows.
# ══════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ELECTRON_DIR="$PROJECT_ROOT/electron-desktop"

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}🐾 Welcome to Desktop Buddy Setup!${NC}"
echo -e "This script will install all necessary dependencies for Mac, Linux, and Windows (via Git Bash/WSL).\n"

# 1. Check prerequisites
echo -e "${BOLD}[1/4] Checking prerequisites...${NC}"
if command -v python3 >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Python3 found: $(python3 --version)${NC}"
else
  echo -e "${RED}❌ python3 is required but not found in PATH.${NC}"
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  echo -e "${GREEN}✓ NPM found: $(npm --version)${NC}"
else
  echo -e "${RED}❌ npm is required but not found in PATH.${NC}"
  exit 1
fi

# 2. Install Backend Dependencies
echo -e "\n${BOLD}[2/4] Installing Backend Dependencies (FastAPI)...${NC}"
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
  echo "Creating virtual environment (venv)..."
  python3 -m venv venv
fi

# Activate venv based on OS
if [ -f "venv/Scripts/activate" ]; then
  source venv/Scripts/activate # Windows
else
  source venv/bin/activate # Mac/Linux
fi

pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed.${NC}"
deactivate

# 3. Install Frontend Dependencies
echo -e "\n${BOLD}[3/4] Installing Frontend Dependencies (Next.js)...${NC}"
cd "$FRONTEND_DIR"
npm install
echo -e "${GREEN}✓ Frontend dependencies installed.${NC}"

# 4. Install Electron Dependencies
echo -e "\n${BOLD}[4/4] Installing Desktop App Dependencies (Electron)...${NC}"
cd "$ELECTRON_DIR"
npm install
echo -e "${GREEN}✓ Electron dependencies installed.${NC}"

echo -e "\n${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}🎉 Setup Complete! You are ready to go.${NC}"
echo -e "To start your Desktop Buddy, simply run:"
echo -e "  ${CYAN}./startup_mac.sh${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}\n"
