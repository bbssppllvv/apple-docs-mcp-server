# Apple Docs MCP Server

[![NPM Version](https://img.shields.io/npm/v/apple-docs-mcp-server)](https://www.npmjs.com/package/apple-docs-mcp-server)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/docs-16%2C253%2B-orange.svg)](https://github.com/bbssppllvv/apple-docs-mcp-server)

Semantic search through Apple's complete developer documentation for your AI coding assistant.

## What this does

This MCP server connects your AI assistant (like Cursor) to Apple's entire developer documentation library. Instead of manually searching developer.apple.com or digging through WWDC videos, your AI can search through all of Apple's docs and give you precise answers with source links.

**What's included**: The most complete collection of Apple developer documentation available:
- All iOS, macOS, watchOS, tvOS, and visionOS documentation
- WWDC session transcripts (2019-2025) 
- Complete API references for all frameworks
- Code examples and implementation guides
- Latest APIs including iOS 26, macOS 26, watchOS 26, tvOS 26, and visionOS 26

**How it searches**: Uses semantic/vector search with OpenAI embeddings. This means you can ask conceptual questions like "memory management in SwiftUI" and it will find relevant docs even if they don't contain those exact words.

**Database**: 16,253+ documents with full content - this is the most comprehensive Apple docs collection you can get.

## Installation

**Local installation (recommended):**
```bash
npm install apple-docs-mcp-server
```

**For existing projects, add to package.json:**
```bash
npm install --save apple-docs-mcp-server
```

The documentation database (~260MB) downloads automatically during installation.

## Setup with Cursor - Zero Confirmations

**🚀 Seamless Experience**: This configuration eliminates all manual confirmations for smooth workflow.

1. **Create `.cursor/mcp.json`** in your project root:
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
   
   **Key settings for automation**:
   - `autoStart: true` - Server starts automatically, no manual activation
   - `alwaysAllow: [...]` - All tools pre-approved, zero confirmation dialogs  
   - `timeout: 30000` - Sufficient timeout for database operations



2. **Alternative: .env file method**
   If you prefer separate .env files, create `.env` in your project root:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   EMBEDDINGS_DB_PATH=/absolute/path/to/embeddings.db
   ```
   
   Then use simpler mcp.json:
   ```json
   {
     "schemaVersion": 1,
     "mcpServers": {
       "apple_docs": {
         "command": "/absolute/path/to/node_modules/apple-docs-mcp-server/run-mcp-safe.sh",
         "autoStart": true,
         "alwaysAllow": ["search_docs", "get_doc", "get_code_examples", "get_stats"],
         "timeout": 30000
       }
     }
   }
   ```

3. **Find the correct path**  
   ```bash
   # If installed locally in your project:
   pwd
   # Use: /your/project/path/node_modules/apple-docs-mcp-server/run-mcp-safe.sh
   
   # If you need global install (not recommended):
   npm config get prefix
   # Use: /prefix/path/lib/node_modules/apple-docs-mcp-server/run-mcp-safe.sh
   ```

4. **Restart Cursor completely**

## How to use

Ask your AI assistant questions about Apple development:

- "Show me Core Data CloudKit synchronization examples"
- "How do I use SwiftUI @Observable property wrapper?"
- "What's new in UIKit for iOS 26?"
- "Find RealityKit documentation about entity components"

Your AI will search through Apple's documentation and provide answers with source links. When documents contain code examples, your AI can also extract those examples with helpful context and explanations.

## Pro tip: Skip confirmation dialogs

Getting tired of clicking "Allow" every time? In Cursor Settings → Chat, turn off "MCP Tools Protection". Much smoother workflow.

## Why this works well

**Complete coverage**: This contains everything that's on developer.apple.com plus WWDC transcripts. If Apple documented it, it's probably in here.

**Smart search**: Vector search means you can ask about concepts, not just keywords. Ask about "view lifecycle" and it finds relevant docs across UIKit, SwiftUI, and AppKit.

**Fast responses**: All documents are preprocessed and embedded locally. Search takes under a second, no waiting for API calls.

**Current information**: Includes the latest APIs and frameworks for all Apple platforms (iOS 26, macOS 26, watchOS 26, tvOS 26, visionOS 26) with complete WWDC 2026 content.

## Troubleshooting

**Cursor shows "No tools"**:
- Use absolute paths in `.cursor/mcp.json`
- Check that `run-mcp-safe.sh` is executable: `chmod +x run-mcp-safe.sh`  
- Restart Cursor completely (not just reload window)
- Verify the path exists: `ls -la /your/absolute/path/run-mcp-safe.sh`

**Still getting confirmation prompts**:
- Turn off "MCP Tools Protection" in Cursor Settings → Chat  
- Restart Cursor after changes

**"OpenAI not initialized" or API key errors**:
- **Recommended**: Put API key in `mcp.json` env section (see Option A above)
- Alternative: Ensure `.env` file is in the correct location (project root)
- Check API key format: starts with `sk-proj-` or `sk-`
- View logs: `tail -f /tmp/apple-docs-mcp.err`

**"Cannot open database" errors**:  
- Database auto-downloads to package location during install
- If missing, reinstall: `npm uninstall apple-docs-mcp-server && npm install apple-docs-mcp-server`
- For manual path: use absolute path in EMBEDDINGS_DB_PATH
- Check database exists and is ~260MB: `ls -lh node_modules/apple-docs-mcp-server/embeddings.db`

**"Method not found" errors**:
- Use correct MCP call format: `{"method":"tools/call","params":{"name":"search_docs","arguments":{...}}}`
- Available tools: `search_docs`, `get_doc`, `get_code_examples`, `get_stats`

**Path has spaces**:
```bash
# Create a symlink without spaces
ln -sf "/path/with spaces" /path/without/spaces
# Use the symlink path in your config
```

## Development

**Requirements**: Node.js 18+ and OpenAI API key

**Local setup**:
```bash
git clone https://github.com/bbssppllvv/apple-docs-mcp-server.git
cd apple-docs-mcp-server
npm install
cp .env.example .env
# Add your OpenAI API key to .env
```

**Test the server**:
```bash
# List available tools
echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | ./run-mcp-safe.sh

# Test search functionality  
echo '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"search_docs","arguments":{"query":"SwiftUI animation","limit":3}}}' | ./run-mcp-safe.sh
```

## Example Cursor Configuration

For a typical project setup where you installed the package locally:

```json
{
  "schemaVersion": 1,
  "mcpServers": {
    "apple_docs": {
      "command": "/absolute/path/to/your-project/node_modules/apple-docs-mcp-server/run-mcp-safe.sh",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your_key_here"
      },
      "autoStart": true,
      "alwaysAllow": ["search_docs", "get_doc", "get_code_examples", "get_stats"],
      "timeout": 30000
    }
  }
}
```

**🎯 Zero-confirmation workflow**: With this setup, your AI can search Apple docs and fetch detailed documentation without any manual approvals. Just ask questions and get instant answers!

**Find your exact path:**
```bash
# In your project directory:
echo "$(pwd)/node_modules/apple-docs-mcp-server/run-mcp-safe.sh"
```

## Technical details

**MCP Tools**:
- `search_docs`: Semantic search through all documentation
- `get_doc`: Get complete document content by ID
- `get_code_examples`: Extract code examples with context from documents (when available)
- `get_stats`: Database statistics and sample titles

**Search performance**: Typical response time under 1 second for semantic queries

**Database info**: Uses text-embedding-3-large model with 3072 dimensions for vector similarity search

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

This is an unofficial tool for accessing Apple developer documentation. No affiliation with Apple Inc.