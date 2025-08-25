#!/bin/sh
set -e

# Fixed PATH for stability
PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

# Change to script directory
cd "$(dirname "$0")"

# Check Node.js availability
if ! command -v node >/dev/null 2>&1; then
    echo '{"error": "Node.js not found in PATH"}' >&2
    exit 1
fi

# Check server.js availability
if [ ! -f "server.js" ]; then
    echo '{"error": "server.js not found"}' >&2
    exit 1
fi

# Start MCP server with log redirection
exec node server.js 2>>"${TMPDIR:-/tmp}/apple-docs-mcp.err"

