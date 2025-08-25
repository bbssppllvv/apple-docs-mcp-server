# Apple Docs MCP Server

Semantic search through Apple's complete developer documentation for your AI coding assistant.

## What this does

This MCP server connects your AI assistant (like Cursor) to Apple's entire developer documentation library. Instead of manually searching developer.apple.com or digging through WWDC videos, your AI can search through all of Apple's docs and give you precise answers with source links.

**What's included**: The most complete collection of Apple developer documentation available:
- All iOS, macOS, watchOS, tvOS, and visionOS documentation
- WWDC session transcripts (2019-2024) 
- Complete API references for all frameworks
- Code examples and implementation guides
- Latest APIs including iOS 18 and macOS Sequoia

**How it searches**: Uses semantic/vector search with OpenAI embeddings. This means you can ask conceptual questions like "memory management in SwiftUI" and it will find relevant docs even if they don't contain those exact words.

**Database**: 16,253+ documents with full content - this is the most comprehensive Apple docs collection you can get.

## Installation

```bash
npm install -g apple-docs-mcp-server
```

The vector database (~260MB) downloads automatically during installation.

## Setup with Cursor

1. **Add MCP configuration**  
   Create `.cursor/mcp.json` in your project root:
   ```json
   {
     "schemaVersion": 1,
     "mcpServers": {
       "apple_docs": {
         "command": "/usr/local/bin/apple-docs-mcp-server/run-mcp-safe.sh",
         "autoStart": true,
         "alwaysAllow": ["search_docs", "get_doc", "get_stats"]
       }
     }
   }
   ```

2. **Set up your environment**  
   Create `.env` file with your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   EMBEDDINGS_DB_PATH=./embeddings.db
   EMBEDDING_MODEL=text-embedding-3-large
   EMBEDDING_DIMENSIONS=3072
   ```

3. **Find the correct path**  
   ```bash
   npm list -g apple-docs-mcp-server | head -1
   # Use the shown path + /node_modules/apple-docs-mcp-server/run-mcp-safe.sh
   ```

4. **Restart Cursor completely**

## How to use

Ask your AI assistant questions about Apple development and it will search through the documentation:

- "Show me Core Data CloudKit synchronization examples"
- "How do I use SwiftUI @Observable property wrapper?"
- "What's new in UIKit for iOS 18?"
- "Find RealityKit documentation about entity components"

Your AI will find relevant documentation sections and provide answers with direct links to Apple's official docs.

## Why this works well

**Complete coverage**: This contains everything that's on developer.apple.com plus WWDC transcripts. If Apple documented it, it's probably in here.

**Smart search**: Vector search means you can ask about concepts, not just keywords. Ask about "view lifecycle" and it finds relevant docs across UIKit, SwiftUI, and AppKit.

**Fast responses**: All documents are preprocessed and embedded locally. Search takes under a second, no waiting for API calls.

**Current information**: Includes the latest APIs and frameworks up to iOS 18/macOS Sequoia.

## Troubleshooting

**Cursor shows "No tools"**:
- Make sure the path in `.cursor/mcp.json` is absolute and correct
- Check that `run-mcp-safe.sh` is executable: `chmod +x run-mcp-safe.sh`  
- Restart Cursor completely (not just the window)

**Search not working**:
- Verify your OpenAI API key in the `.env` file
- Check that `embeddings.db` exists and is ~260MB
- Look at logs: `tail -f /tmp/apple-docs-mcp.err`

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
echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | ./run-mcp-safe.sh
```

## Technical details

**MCP Tools**:
- `search_docs`: Semantic search through all documentation
- `get_doc`: Get complete document content by ID
- `get_stats`: Database statistics and sample titles

**Search performance**: Typical response time under 1 second for semantic queries

**Database info**: Uses text-embedding-3-large model with 3072 dimensions for vector similarity search

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

This is an unofficial tool for accessing Apple developer documentation. No affiliation with Apple Inc.