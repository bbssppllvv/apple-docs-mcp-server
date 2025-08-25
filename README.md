# Apple Docs MCP Server

Semantic search server for Apple developer documentation with MCP protocol support.

## What this provides

This server gives your AI coding assistant access to Apple's complete developer documentation through semantic search. Instead of browsing developer.apple.com or searching through WWDC transcripts manually, your AI can query the documentation directly and provide accurate, sourced answers.

**Coverage**: Complete Apple developer documentation including:
- All current iOS, macOS, watchOS, tvOS, and visionOS documentation
- WWDC session transcripts (2019-2024)
- API references for all frameworks
- Code examples and implementation guides
- Latest APIs including iOS 18 and macOS Sequoia features

**Search type**: Semantic/vector search using OpenAI embeddings. This means you can search by concept and context, not just keywords. Ask about "memory management in SwiftUI" and it will find relevant documents even if they don't contain those exact words.

**Database size**: 16,253+ documents with full content, regularly updated.

## Installation

```bash
npm install -g apple-docs-mcp-server
```

The vector database (~260MB) downloads automatically during installation.

## Setup with Cursor IDE

1. **Add to MCP configuration**  
   Create or edit `.cursor/mcp.json` in your project root:
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

2. **Set up environment**  
   Create `.env` file with your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   EMBEDDINGS_DB_PATH=./embeddings.db
   EMBEDDING_MODEL=text-embedding-3-large
   EMBEDDING_DIMENSIONS=3072
   ```

3. **Find correct path**  
   ```bash
   npm list -g apple-docs-mcp-server | head -1
   # Use the path shown + /node_modules/apple-docs-mcp-server/run-mcp-safe.sh
   ```

4. **Restart Cursor completely**

## How to use

Once connected, your AI assistant can search Apple documentation:

- "Show me Core Data CloudKit synchronization documentation"
- "Find SwiftUI @Observable property wrapper examples"
- "What's new in UIKit for iOS 18?"
- "Get RealityKit entity component system documentation"

The AI will search through the documentation, find relevant sections, and provide answers with direct links to Apple's documentation.

## Technical details

**Semantic search**: Uses OpenAI's text-embedding-3-large model for vector similarity search. This enables conceptual queries beyond keyword matching.

**Document processing**: All documents are preprocessed and embedded for fast retrieval. No API calls during search operations.

**Content coverage**:
- Complete developer.apple.com documentation
- WWDC session transcripts with timing information  
- Sample code and implementation examples
- API reference documentation for all frameworks
- Migration guides and release notes

**Performance**: Typical search response time under 1 second for semantic queries.

## Troubleshooting

**"No tools" error in Cursor**:
- Verify the path in `.cursor/mcp.json` is absolute and correct
- Ensure `run-mcp-safe.sh` is executable: `chmod +x run-mcp-safe.sh`
- Restart Cursor completely (not just refresh)

**Search returns no results**:
- Check OpenAI API key in `.env` file
- Verify `embeddings.db` file exists and is ~260MB
- Check logs: `tail -f /tmp/apple-docs-mcp.err`

**Path contains spaces**:
```bash
# Create symlink without spaces
ln -sf "/path/with spaces" /path/without/spaces
# Use symlink path in .cursor/mcp.json
```

## Development

**Requirements**:
- Node.js 18+
- OpenAI API key with embeddings access

**Local setup**:
```bash
git clone https://github.com/bbssppllvv/apple-docs-mcp-server.git
cd apple-docs-mcp-server
npm install
cp .env.example .env
# Add your OpenAI API key to .env
```

**Test server**:
```bash
echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | ./run-mcp-safe.sh
```

## MCP Tools

The server provides three tools for AI agents:

- `search_docs`: Semantic search through documentation
- `get_doc`: Retrieve complete document content by ID  
- `get_stats`: Get database statistics and sample titles

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

This is an unofficial tool for accessing Apple developer documentation. No affiliation with Apple Inc.