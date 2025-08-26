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
- **Code examples** with context and explanations
- **Human Interface Guidelines** (HIG) - Apple's complete design guidelines
- **Latest WWDC 2025 APIs:** Liquid Glass API, Foundation Models Framework, and more
- Current platform versions: iOS 26, macOS 26, watchOS 26, tvOS 26, visionOS 26

**How it works:** Natural language search - ask questions in plain English. Type "how to animate a button press" or "best practices for iOS navigation" and get relevant answers. The search understands concepts and context, not just exact keyword matches.

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

**API & Code examples:**
- "Show me SwiftUI animation code examples"
- "How do I use Core Data with CloudKit synchronization?"
- "What's new in UIKit for iOS 26?"

**WWDC 2025 latest APIs:**
- "How to implement Liquid Glass effects in my app?"
- "Foundation Models Framework setup and usage examples"
- "What new capabilities does iOS 26 bring for AI?"

**Design & HIG questions:**
- "Apple's guidelines for button design in iOS apps"
- "Best practices for navigation patterns on iPad"
- "Accessibility requirements for app icons"

**Natural language queries:**
- "How to handle memory management in SwiftUI?"
- "Best way to implement dark mode support"

Your AI searches through Apple's complete documentation and provides answers with source links. When documents contain code examples, your AI can extract those examples with full context and explanations.

## Key benefits

**Complete library:** This is the most comprehensive Apple developer documentation collection available. Everything Apple has published - API docs, WWDC transcripts, Human Interface Guidelines, code examples - all in one searchable database.

**Natural language search:** Ask questions in plain English. No need to know exact API names or keywords. The search understands what you're trying to accomplish.

**Code examples included:** Not just documentation text, but actual working code with explanations and context.

**Fast and local:** All documents are processed on your machine. Search results appear instantly without API calls.

**Always current:** Includes the latest APIs and frameworks for all Apple platforms with complete WWDC 2025 content, including new technologies like Liquid Glass API and Foundation Models Framework.

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

- `search_docs`: Search through all Apple documentation and design guidelines
- `get_doc`: Get complete document content by ID
- `get_code_examples`: Extract working Swift code examples from documentation with explanations
- `get_stats`: Database statistics and information

## Requirements

- Node.js 18 or later
- OpenAI API key
- Cursor or compatible MCP client

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

This is an unofficial tool for accessing Apple developer documentation. No affiliation with Apple Inc.