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

BASE_BACKEND_PORT=8009
BASE_FRONTEND_PORT=3009
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
echo -e "\n${BOLD}[1/6] Checking ports...${NC}"
BACKEND_PORT=$(find_free_port $BASE_BACKEND_PORT)
FRONTEND_PORT=$(find_free_port $BASE_FRONTEND_PORT)
echo -e "${GREEN}✓ Backend port:  $BACKEND_PORT${NC}"
echo -e "${GREEN}✓ Frontend port: $FRONTEND_PORT${NC}"

# Make sure the frontend talks to whichever backend port was picked
export NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT"
export BACKEND_PORT
export FRONTEND_PORT

# 2. Check dependencies
echo -e "\n${BOLD}[2/6] Verifying runtimes...${NC}"
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

# 3. Scan and install missing modules
echo -e "\n${BOLD}[3/6] Scanning project modules...${NC}"

PYTHON_BIN="python3"
if [ -x "$BACKEND_DIR/.venv/bin/python3" ]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python3"
fi

ensure_python_deps() {
  local req_file="$BACKEND_DIR/requirements.txt"
  if [ ! -f "$req_file" ]; then
    echo -e "${YELLOW}⚠️  No requirements.txt found in $BACKEND_DIR. Skipping.${NC}"
    return 0
  fi

  local missing
  missing=$("$PYTHON_BIN" - "$req_file" <<'PYEOF'
import importlib.metadata as meta
import re
import sys

def norm(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()

installed = {norm(d.metadata["Name"]) for d in meta.distributions() if d.metadata.get("Name")}
missing = []

with open(sys.argv[1], "r", encoding="utf-8") as f:
    for raw in f:
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        pkg = re.split(r"[<>=!~;\[]", line, maxsplit=1)[0].strip()
        if pkg and norm(pkg) not in installed:
            missing.append(pkg)

print(" ".join(missing))
PYEOF
)

  if [ -z "$missing" ]; then
    echo -e "${GREEN}✓ Backend Python modules already installed. Skipping pip install.${NC}"
  else
    echo -e "${YELLOW}⚠️  Missing backend Python modules: $missing${NC}"
    if [ "$PYTHON_BIN" = "python3" ] && [ ! -x "$BACKEND_DIR/.venv/bin/python3" ]; then
      echo -e "  • Creating virtual environment at $BACKEND_DIR/.venv..."
      python3 -m venv "$BACKEND_DIR/.venv"
      PYTHON_BIN="$BACKEND_DIR/.venv/bin/python3"
    fi
    echo -e "  • Installing backend dependencies..."
    "$PYTHON_BIN" -m pip install -r "$req_file"
    echo -e "${GREEN}✓ Backend Python modules installed.${NC}"
  fi
}

ensure_node_deps() {
  local target_dir="$1"
  local label="$2"

  if [ ! -f "$target_dir/package.json" ]; then
    echo -e "${YELLOW}⚠️  No package.json found in $target_dir. Skipping.${NC}"
    return 0
  fi

  local scan_result
  scan_result=$(node -e '
const fs = require("fs");
const path = require("path");
const dir = process.argv[1];
const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const names = Object.keys(deps);
const missing = names.filter((name) => {
  return !fs.existsSync(path.join(dir, "node_modules", ...name.split("/"), "package.json"));
});
console.log(JSON.stringify({ total: names.length, missing }));
' "$target_dir")

  local missing_count
  missing_count=$(node -e 'const r = JSON.parse(process.argv[1]); console.log(r.missing.length);' "$scan_result")

  if [ "$missing_count" -eq 0 ]; then
    local total_count
    total_count=$(node -e 'const r = JSON.parse(process.argv[1]); console.log(r.total);' "$scan_result")
    echo -e "${GREEN}✓ $label modules already installed ($total_count scanned). Skipping npm install.${NC}"
  else
    local missing_list
    missing_list=$(node -e 'const r = JSON.parse(process.argv[1]); console.log(r.missing.join(", "));' "$scan_result")
    echo -e "${YELLOW}⚠️  Missing $label modules: $missing_list${NC}"
    echo -e "  • Installing $label dependencies..."
    (cd "$target_dir" && npm install)
    echo -e "${GREEN}✓ $label modules installed.${NC}"
  fi
}

ensure_electron_binary() {
  if (cd "$ELECTRON_DIR" && node -e "const fs=require('fs'); const p=require('./node_modules/electron'); if(!fs.existsSync(p)) process.exit(1);" >/dev/null 2>&1); then
    echo -e "${GREEN}✓ Electron binary verified.${NC}"
    return 0
  fi

  echo -e "${YELLOW}⚠️  Electron binary missing or incomplete. Repairing Electron installation...${NC}"
  (cd "$ELECTRON_DIR" && node node_modules/electron/install.js >/dev/null 2>&1 || true)

  if ! (cd "$ELECTRON_DIR" && node -e "const fs=require('fs'); const p=require('./node_modules/electron'); if(!fs.existsSync(p)) process.exit(1);" >/dev/null 2>&1); then
    local zip_path
    zip_path=$(cd "$ELECTRON_DIR" && node -e "
      const { downloadArtifact } = require('./node_modules/@electron/get');
      const { version } = require('./node_modules/electron/package.json');
      downloadArtifact({ version, artifactName: 'electron', platform: process.platform, arch: process.arch })
        .then(p => console.log(p));
    ")
    if [ -n "$zip_path" ] && [ -f "$zip_path" ]; then
      unzip -q -o "$zip_path" -d "$ELECTRON_DIR/node_modules/electron/dist"
      if [ "$(uname -s)" = "Darwin" ]; then
        printf "Electron.app/Contents/MacOS/Electron" > "$ELECTRON_DIR/node_modules/electron/path.txt"
      else
        printf "electron" > "$ELECTRON_DIR/node_modules/electron/path.txt"
      fi
    fi
  fi

  if (cd "$ELECTRON_DIR" && node -e "const fs=require('fs'); const p=require('./node_modules/electron'); if(!fs.existsSync(p)) process.exit(1);" >/dev/null 2>&1); then
    echo -e "${GREEN}✓ Electron binary repaired.${NC}"
  else
    echo -e "${RED}❌ Failed to install Electron binary. Try deleting $ELECTRON_DIR/node_modules/electron and re-running.${NC}"
    exit 1
  fi
}

ensure_python_deps
ensure_node_deps "$FRONTEND_DIR" "Frontend"
ensure_node_deps "$ELECTRON_DIR" "Electron"
ensure_electron_binary

# 4. Start Backend (FastAPI)
echo -e "\n${BOLD}[4/6] Launching FastAPI Backend on port $BACKEND_PORT...${NC}"
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

# 5. Start Frontend (Next.js)
echo -e "\n${BOLD}[5/6] Launching Next.js UI on port $FRONTEND_PORT...${NC}"
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

# 6. Start Electron Desktop App
echo -e "\n${BOLD}[6/6] Launching Electron Desktop Pet Widget...${NC}"
cd "$ELECTRON_DIR"

echo -e "\n${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}✨ HamsterDesk Desktop App is running!${NC}"
echo -e "  🖥️  Desktop:   Floating right-edge widget + Menu Bar Tray"
echo -e "  🌐 Web Mirror: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  🧠 Backend:    ${CYAN}http://localhost:$BACKEND_PORT${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}\n"
echo -e "${YELLOW}Closing the Electron window or pressing Ctrl+C will exit.${NC}\n"

ELECTRON_DEV=true npx electron .
