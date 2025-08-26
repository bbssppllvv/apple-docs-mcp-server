# Apple Docs MCP Server

[![NPM Version](https://img.shields.io/npm/v/apple-docs-mcp-server)](https://www.npmjs.com/package/apple-docs-mcp-server)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen.svg)](https://nodejs.org/)

Search through Apple's complete developer documentation using your AI coding assistant.

## What this does

This tool connects your AI assistant (like Cursor) to Apple's entire developer documentation. Instead of manually browsing developer.apple.com, your AI can search through Apple's docs and provide precise answers with source links.

**Documentation included:**
- All iOS, macOS, watchOS, tvOS, and visionOS documentation
- WWDC session transcripts (2019-2025)
- Complete API references for all frameworks
- Latest APIs: iOS 26, macOS 26, watchOS 26, tvOS 26, visionOS 26

**How it works:** Intelligent search that understands concepts, not just keywords. Ask about "memory management in SwiftUI" and it finds relevant documentation even if those exact words aren't used.

**Database:** 16,253+ documents with complete content coverage.

## Installation

```bash
npm install apple-docs-mcp-server
```

The documentation database (260MB) downloads automatically during installation.

## Setup with Cursor

**1. Create `.cursor/mcp.json` in your project root:**

```json
{
  "schemaVersion": 1,
  "mcpServers": {
    "apple_docs": {
      "command": "/absolute/path/to/node_modules/apple-docs-mcp-server/run-mcp-safe.sh",
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      },
      "autoStart": true,
      "alwaysAllow": ["search_docs", "get_doc", "get_code_examples", "get_stats"],
      "timeout": 30000
    }
  }
}
```


**2. Find your correct path:**
```bash
# In your project directory:
echo "$(pwd)/node_modules/apple-docs-mcp-server/run-mcp-safe.sh"
```

**3. Restart Cursor completely**

## How to use

Ask your AI assistant questions about Apple development:

- "Show me Core Data CloudKit synchronization examples"
- "How do I use SwiftUI @Observable property wrapper?"
- "What's new in UIKit for iOS 26?"
- "Find RealityKit documentation about entity components"

Your AI will search through Apple's documentation and provide answers with source links. For documents with code examples, your AI can extract those examples with explanations.

## Key benefits

**Complete coverage:** Contains everything from developer.apple.com plus WWDC transcripts.

**Smart search:** Understands concepts and context, not just keyword matching.

**Fast responses:** All documents are processed locally. Search results appear in under a second.

**Current information:** Includes the latest APIs and frameworks for all Apple platforms with complete WWDC 2025 content.

## Troubleshooting

**Cursor shows "No tools":**
- Use absolute paths in `.cursor/mcp.json`
- Make sure `run-mcp-safe.sh` is executable: `chmod +x run-mcp-safe.sh`
- Restart Cursor completely

**OpenAI API key errors:**
- Put your API key in the `env` section of `mcp.json` (recommended)
- Check API key format: should start with `sk-proj-` or `sk-`

**Database errors:**
- Reinstall if database is missing: `npm uninstall apple-docs-mcp-server && npm install apple-docs-mcp-server`
- Check database file exists: `ls -lh node_modules/apple-docs-mcp-server/embeddings.db`

## Available tools

- `search_docs`: Search through all Apple documentation  
- `get_doc`: Get complete document content by ID
- `get_code_examples`: Extract code examples with context from documents
- `get_stats`: Database statistics and information

## Requirements

- Node.js 18 or later
- OpenAI API key
- Cursor or compatible MCP client

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

This is an unofficial tool for accessing Apple developer documentation. No affiliation with Apple Inc.