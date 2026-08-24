#!/usr/bin/env bash
# Forward to startup.sh
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$PROJECT_ROOT/startup.sh" "$@"
