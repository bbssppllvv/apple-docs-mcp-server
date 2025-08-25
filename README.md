# Apple Docs MCP Server

🍎 Semantic search through Apple's entire developer documentation - right inside your AI coding assistant.

## What is this?

Ever wished you could just ask your AI assistant about SwiftUI animations or Core Data best practices and get answers from Apple's actual documentation? That's exactly what this does.

This MCP server connects Cursor IDE (and other AI tools) to a searchable database of **16,253+ Apple developer documents**, including:
- All iOS, macOS, watchOS, tvOS, and visionOS docs
- WWDC session transcripts  
- Code examples and API references
- Migration guides and best practices

Instead of googling and copy-pasting, your AI can search and reference Apple's official docs directly.

## Quick Start

### Install
```bash
npm install -g apple-docs-mcp-server
```
The 260MB database downloads automatically during installation.

### Connect to Cursor

1. **Create the config file**  
   Add this to `.cursor/mcp.json` in your project root:
   ```json
   {
     "schemaVersion": 1,
     "mcpServers": {
       "apple_docs": {
         "command": "/path/to/your/apple-docs-mcp-server/run-mcp-safe.sh",
         "autoStart": true,
         "alwaysAllow": ["search_docs", "get_doc", "get_stats"]
       }
     }
   }
   ```

2. **Find the path**  
   ```bash
   which apple-docs-mcp-server
   # Use that path + /run-mcp-safe.sh
   ```

3. **Add your OpenAI key**  
   Create `.env` file:
   ```bash
   OPENAI_API_KEY=your_key_here
   EMBEDDINGS_DB_PATH=./embeddings.db
   EMBEDDING_MODEL=text-embedding-3-large
   EMBEDDING_DIMENSIONS=3072
   ```

4. **Restart Cursor completely**

## How it works

Once connected, your AI assistant can:

- **Search Apple docs**: "Find SwiftUI animation examples"
- **Get specific info**: "Show me Core Data CloudKit sync documentation"  
- **Compare approaches**: "What's the difference between UIKit and SwiftUI navigation?"
- **Find related topics**: Automatically discovers connected APIs and alternatives

The search is semantic (understands meaning), not just keyword matching, so you can ask questions naturally.

## Example Usage

Ask your AI assistant:
- "How do I implement custom SwiftUI animations?"
- "Show me Core Data CloudKit integration examples"  
- "What's new in iOS 18 for app development?"
- "Find RealityKit documentation about anchors"

The AI will search through Apple's docs and give you accurate, up-to-date information with direct links to the official documentation.

## Features

- **16,253+ documents** from Apple Developer Documentation
- **Semantic search** - understands context, not just keywords
- **Related document discovery** - finds connected topics automatically
- **Full document access** - complete docs with code examples
- **Fast responses** - cached database, no API calls during search
- **Production ready** - error handling, timeouts, proper logging

## Troubleshooting

**Cursor shows "No tools"?**
- Check that the path in `.cursor/mcp.json` is correct and absolute
- Make sure you completely restarted Cursor (not just closed the window)
- Verify the script is executable: `chmod +x run-mcp-safe.sh`

**Search not working?**
- Check your OpenAI API key in the `.env` file
- Make sure the `embeddings.db` file downloaded (should be ~260MB)

**Path has spaces?**
```bash
# Create a symlink without spaces
ln -sf "My Folder" MyFolder
# Use the symlink path in .cursor/mcp.json
```

## Development

**Requirements:**
- Node.js 18+
- OpenAI API key

**Local testing:**
```bash
git clone https://github.com/bbssppllvv/apple-docs-mcp-server.git
cd apple-docs-mcp-server
npm install
cp .env.example .env
# Add your OpenAI key to .env
./run-mcp-safe.sh
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

This project is licensed under the MIT License, which means you can freely use, modify, and distribute this software for any purpose, including commercial use, as long as you include the original copyright notice.

---

**Built by developers, for developers.** No affiliation with Apple Inc.