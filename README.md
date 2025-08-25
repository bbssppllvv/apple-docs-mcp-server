# Apple Docs MCP Server

🍎 MCP server for semantic search through Apple developer documentation, WWDC transcripts, and code examples. 16K+ documents indexed for AI agents.

## 🚀 Features

- **MCP Protocol** - Full compatibility with Cursor IDE  
- **Vector Search** - Semantic search through 16,253 Apple documents  
- **🔗 Related Documents** - Automatically discover connected topics and APIs
- **3 Tools**: search_docs, get_doc, get_stats
- **JSON Format** - Structured responses for AI agents
- **Production Ready** - Error handling, timeouts, connection pools
- **No Size Limits** - Complete documents up to 18K+ characters

## 📦 Installation

### Option 1: NPM Install (Recommended)
```bash
# Install globally for easy access
npm install -g apple-docs-mcp-server

# Or install locally in your project
npm install apple-docs-mcp-server
```

### Option 2: Clone from GitHub  
```bash
git clone https://github.com/bbssppllvv/apple-docs-mcp-server.git
cd apple-docs-mcp-server
npm install
```

### Setup Environment
```bash
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

**✅ Complete**: The embeddings.db file (~260MB) downloads automatically during installation.

## ⚙️ Configuration

1. **Copy configuration template:**
```bash
cp .env.example .env
```

2. **Add your OpenAI API key to `.env`:**
```bash
OPENAI_API_KEY=sk-proj-your_openai_key_here
EMBEDDINGS_DB_PATH=./embeddings.db
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=3072
```

**Note**: The `embeddings.db` file (~260MB) downloads automatically during installation via the postinstall script.

## 🔗 Cursor Integration

### Step 1: Create MCP Configuration

Create `.cursor/mcp.json` in your **project root** (not in apple-docs-mcp-server folder):

```json
{
  "schemaVersion": 1,
  "mcpServers": {
    "apple_search": {
      "command": "/absolute/path/to/apple-docs-mcp-server/run-mcp-safe.sh",
      "autoStart": true,
      "alwaysAllow": ["search_docs", "get_doc", "get_stats"]
    }
  }
}
```

### Step 2: Get Correct Path

Get the absolute path to your script:
```bash
# In apple-docs-mcp-server directory
pwd && echo "/run-mcp-safe.sh"
# Copy the full path from output
```

⚠️ **Path with Spaces Fix**: If your path contains spaces (like "MCP Apple"), create a symlink:
```bash
# From parent directory
ln -sf "MCP Apple" MCP_Apple
# Then use: /path/to/MCP_Apple/apple-docs-mcp-server/run-mcp-safe.sh
```

### Step 3: Start Cursor
1. **Completely quit Cursor** (not just close window)
2. **Reopen Cursor**
3. **Open your project** where `.cursor/mcp.json` is located

## 🔗 Related Documents Feature

**NEW**: Automatically discover connected APIs, alternative approaches, and related concepts!

### How it works:
1. **Smart Discovery**: Extracts API names and key terms from main results
2. **Adaptive Thresholds**: Higher quality main results = stricter standards for related docs
3. **Quality Control**: Filters out low-relevance documents to prevent noise

### Example Benefits:
- Search "SwiftUI Button" → automatically finds ButtonStyle, UIButton alternatives, design guidelines  
- Search "Core Data" → discovers NSFetchRequest, performance guides, CloudKit integration
- Search "Liquid Glass" → finds morphing animations, accessibility considerations, visionOS examples

**Usage**: Add `includeRelated: true` to your search_docs calls for comprehensive topic coverage.

## 🛠️ MCP Tools - For AI Agents

### 🔍 **search_docs** - Intelligent Semantic Search  
**Strategy**: BROAD→NARROW workflow with relevance scoring  

**Parameters:**
- **query** (string) - 2-4 keywords: `"SwiftUI custom animation"`, `"Core Data CloudKit"`  
- **limit** (number) - 8-10 for exploration, 3-5 for focused search
- **minSimilarity** (number) - 0.3 for broad, 0.5+ for highly specific  
- **maxContentChars** (number) - 200 for quick scan, 300+ for detail
- **🔗 includeRelated** (boolean) - `true` to auto-discover connected APIs and topics  

**Example Results:**
```json
{
  "query": "SwiftUI Button",
  "total": 3,
  "results": [
    {
      "id": "b2827c16e46dbe8a0b030c729534d85f66763aa5",
      "title": "Button",
      "similarity": 65.5,
      "url": "https://developer.apple.com/documentation/swiftui/button",
      "snippet": "You create a button by providing an action and a label..."
    }
  ],
  "relatedDocuments": [
    {
      "id": "86eb96c9ce81fe20d672a6781fe44e33f2a237f7",
      "title": "SwiftUI",
      "similarity": 61.4,
      "relationship": "Related to: SwiftUI"
    },
    {
      "id": "07e583455001128f8032f8ec0209796ee3343f12",
      "title": "UIButton", 
      "similarity": 54.2,
      "relationship": "Related to: NSButton"
    }
  ],
  "coverage": "extended",
  "totalWithRelated": 8
}
```

### 📖 **get_doc** - Deep Content Analysis  
**Strategy**: Follow-up to promising search results for complete information  

**Parameters:**
- **id** (string|array) - Single ID for focus, up to 10 IDs for batch analysis

**Example Output:**
- Complete documents (up to 18K+ characters)
- Multiple code blocks with Swift examples
- Full API documentation with usage patterns

### 📊 **get_stats** - Database Overview
**Strategy**: Health check and scope understanding  
**Output**: 16,253 docs, text-embedding-3-large model, sample titles

## 🎮 **AI Agent Workflow Examples:**

### Example 1: SwiftUI Animation Research
```
1. EXPLORE: search_docs("SwiftUI custom animation", limit=8) 
   → Get overview of animation options
   
2. ANALYZE: get_doc(["3717b0734c846b2ccbb640856f1a693b39a90fb9"])
   → Deep dive into Animation documentation (2,810 chars + 4 code examples)
   
3. REFINE: search_docs("SwiftUI keyframe animator") 
   → Find specific implementation details
   
4. IMPLEMENT: Complete docs with working code examples
```

### Example 2: Core Data Problem Solving
```
1. BROAD: search_docs("Core Data CloudKit sync", limit=6)
   → Find CloudKit integration docs
   
2. SPECIFIC: search_docs("Core Data conflict resolution")  
   → Target specific issue
   
3. BATCH: get_doc([id1, id2, id3])
   → Compare multiple solutions
```

## 🚨 Troubleshooting

### "No tools or prompts" in Cursor

**Problem**: Cursor shows "No tools or prompts" or tools don't appear.

**Solutions:**

1. **Check MCP Server Status:**
   - Settings → Extensions → MCP
   - Look for "apple_search" server status
   - Should show "Connected" or green indicator

2. **Path Issues (Most Common):**
   ```bash
   # Test your path directly:
   echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | /your/absolute/path/run-mcp-safe.sh
   # Should return JSON with 3 tools
   ```

3. **Spaces in Path Fix:**
   ```bash
   # If path contains spaces, create symlink:
   ln -sf "MCP Apple" MCP_Apple
   # Update .cursor/mcp.json with new path
   ```

4. **Permission Issues:**
   ```bash
   chmod +x run-mcp-safe.sh
   ```

### ENOENT Errors

**Problem**: `spawn ENOENT` errors in Cursor logs.

**Solution**: Use absolute paths without spaces:
```json
{
  "command": "/Users/username/path/without spaces/apple-docs-mcp-server/run-mcp-safe.sh"
}
```

### API Key Issues

**Problem**: Search doesn't work, returns empty results.

**Check:**
1. Valid OpenAI API key in `.env`
2. API key has embedding permissions
3. Test locally:
   ```bash
   node -e "import('openai').then(({default:OpenAI})=>{const o=new OpenAI();console.log('API key works');})"
   ```

### Version Compatibility

**Current Requirements:**
- MCP SDK: `^1.17.4` (automatically installed)
- Node.js: 18+ recommended
- Cursor: Latest version for best MCP support

### Debug Logs

Check server logs for issues:
```bash
tail -f ${TMPDIR:-/tmp}/apple-docs-mcp.err
# or
tail -f /tmp/apple-docs-mcp.err
```

Common log messages:
- ✅ `MCP server started and ready` - Working correctly
- ❌ `Invalid OpenAI API key` - Fix .env file
- ❌ `Engine not initialized` - Database or startup issue

## 📊 Database

- **16,253 Apple documents** from official documentation
- **Model**: text-embedding-3-large (3072 dimensions)  
- **Size**: ~260MB embeddings database
- **Coverage**: iOS, macOS, watchOS, tvOS, visionOS platforms
- **Content**: Full documentation, code examples, API references

## 🎯 Project Structure

```
apple-docs-mcp-server/
├── server.js           # MCP server (430 lines)
├── search.js           # Search engine (249 lines)
├── run-mcp-safe.sh     # Production launcher (24 lines)
├── embeddings.db       # Vector database (~260MB)
├── package.json        # Dependencies
├── .env.example        # Configuration template
├── .env                # Your API keys (create this)
└── README.md           # This documentation
```

## 🚀 Usage

### Local Testing (Recommended First Step)
```bash
# Test server startup
echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | ./run-mcp-safe.sh

# Test search functionality  
echo '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"search_docs","arguments":{"query":"SwiftUI button","limit":3}}}' | ./run-mcp-safe.sh

# Test document retrieval
echo '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"get_stats","arguments":{}}}' | ./run-mcp-safe.sh
```

Expected results: JSON responses with tool lists, search results, and database stats.

### Production MCP Server
```bash
npm run mcp
# or
./run-mcp-safe.sh
```

## 📈 Performance & Capabilities

- **Search Speed**: ~1.2 seconds for semantic queries
- **Relevance Scores**: 
  - 60%+ = Highly relevant (likely contains what you need)
  - 50-59% = Good match (worth investigating)  
  - 40-49% = Partial match (may have related information)
  - <40% = Weak match (consider refining search)
- **Database Size**: 16,253 documents with full content
- **Document Size**: 500-18,000+ characters per document
- **Code Examples**: Many documents contain multiple Swift code blocks

## 🔧 Development

### Requirements
- Node.js 18+ 
- SQLite database (included as embeddings.db)
- OpenAI API key with embeddings access

### Dependencies (Production)
- `@modelcontextprotocol/sdk@^1.17.4` - Latest MCP protocol
- `better-sqlite3@^11.3.0` - High-performance SQLite access
- `dotenv@^16.4.5` - Environment configuration  
- `openai@^4.0.0` - Official OpenAI API client
- `p-limit@^6.0.0` - Concurrency control

### Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] `npm install` completed successfully  
- [ ] `.env` file created with valid `OPENAI_API_KEY`
- [ ] `embeddings.db` file downloaded automatically (~260MB)
- [ ] `chmod +x run-mcp-safe.sh` executed
- [ ] Local test passes: `./run-mcp-safe.sh` responds to JSON-RPC
- [ ] `.cursor/mcp.json` created in project root with absolute path
- [ ] Cursor completely restarted
- [ ] MCP server shows "Connected" status in Cursor

## ❓ Getting Help

If you encounter issues:

1. **Run local tests first** - Most issues are configuration problems
2. **Check logs**: `tail -f ${TMPDIR:-/tmp}/apple-docs-mcp.err`
3. **Verify paths** - Use absolute paths without spaces
4. **Test API key** - Make sure OpenAI access works
5. **Restart Cursor completely** - Many MCP issues require full restart

Common successful setup: API key works → local tests pass → Cursor integration works.

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

This project is licensed under the MIT License, which means you can freely use, modify, and distribute this software for any purpose, including commercial use, as long as you include the original copyright notice.