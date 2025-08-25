#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import pLimit from 'p-limit';
import dotenv from 'dotenv';
import { AppleSearchEngine } from './search.js';

// Load .env configuration silently
dotenv.config({ override: false });

const SERVER_INFO = {
  name: 'apple-docs-mcp-server',
  version: '1.0.0'
};

const CAPABILITIES = {
  capabilities: {
    tools: {}
  }
};

class AppleSearchMCPServer {
  constructor() {
    this.server = new Server(SERVER_INFO, CAPABILITIES);
    this.searchEngine = null;
    this.initPromise = null;
    this.sqliteQueue = pLimit(1); // Queue to prevent SQLite race conditions
    
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    process.on('SIGINT', async () => {
      console.error('[apple-docs-mcp] Received SIGINT, shutting down server...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[apple-docs-mcp] Received SIGTERM, shutting down server...');
      await this.cleanup();
      process.exit(0);
    });
  }

  async cleanup() {
    if (this.searchEngine) {
      console.error('[apple-docs-mcp] Shutting down search engine...');
      this.searchEngine.close();
    }
  }

  // Lazy engine initialization with timeout
  async initializeEngine() {
    if (this.searchEngine) {
      return this.searchEngine;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.withTimeout(async () => {
      console.error('[apple-docs-mcp] Initializing search engine...');
      this.searchEngine = new AppleSearchEngine();
      await this.searchEngine.init(true); // With OpenAI API
      console.error('[apple-docs-mcp] Search engine successfully initialized');
      return this.searchEngine;
    }, 30000, 'Engine initialization');

    return this.initPromise;
  }

  // Timeout wrapper
  async withTimeout(operation, timeoutMs, operationName) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout: ${operationName} (${timeoutMs}ms)`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      console.error(`[apple-docs-mcp] Error in ${operationName}:`, error);
      throw this.convertToMcpError(error);
    }
  }

  // Convert errors to proper MCP format
  convertToMcpError(error) {
    if (error.message.includes('401')) {
      return new Error('Invalid OpenAI API key');
    } else if (error.message.includes('429')) {
      return new Error('OpenAI API rate limit exceeded. Please try again later');
    } else if (error.message.includes('ETIMEDOUT')) {
      return new Error('OpenAI connection timeout');
    }
    return error;
  }

  setupTools() {
    // Tool 1: Document search (preview)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'search_docs') {
        return this.handleSearchDocs(args);
      } else if (name === 'get_doc') {
        return this.handleGetDoc(args);
      } else if (name === 'get_stats') {
        return this.handleGetStats(args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    });

    // APPLE DOCUMENTATION SEARCH TOOLS - Complete workflow for iOS/macOS development
    // 🎯 STRATEGY: search_docs (explore) → get_doc (analyze) → iterate (refine)
    // 📚 DATABASE: 16,253 Apple docs with semantic search via text-embedding-3-large
    // 🔄 WORKFLOW: Broad queries → narrow focus → deep analysis → implementation ready
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_docs',
            description: `🔍 SEMANTIC SEARCH through 16,253 Apple documentation pages with intelligent relevance scoring.

SEARCH STRATEGY:
• BROAD→NARROW: Start with general concepts ("SwiftUI animation") then narrow down ("SwiftUI keyframe animator")
• ITERATE: If results aren't specific enough, reformulate with more precise terms
• EXPLORE: Use limit 8-10 for initial exploration, limit 3-5 for focused searches
• 🔗 RELATED MODE: Set includeRelated=true to auto-discover connected topics

QUERY EXAMPLES:
✅ GOOD: "SwiftUI custom transition animation", "Core Data CloudKit conflict resolution"  
✅ GOOD: "NSFetchRequest predicate performance", "UIKit navigation controller delegate"
✅ WITH RELATED: "SwiftUI Button" + includeRelated=true → 3 main + 5 related (ButtonStyle, UIButton, design guidelines) = comprehensive topic coverage
❌ AVOID: Single words like "Button" or "Core Data" - too broad
❌ AVOID: Non-Apple terms like "React" or "Android"

RELEVANCE SCORES:
• 60%+: Highly relevant, likely contains what you need
• 50-59%: Good match, worth investigating  
• 40-49%: Partial match, may have related information
• <40%: Weak match, consider refining search

🔗 ENHANCED BY DEFAULT: Every search includes 3-6 intelligently related documents
• Semantic similarity using existing embeddings (NO extra OpenAI API calls!)
• Intelligent relationship classification: 🔄 Migration, 🆕 Alternatives, ⚡ Performance, 📋 Examples
• Smart threshold adaptation based on main result quality (75-85% similarity scores)
• Framework-aware connections: SceneKit→RealityKit, UIKit→SwiftUI, Core Image→Metal
• Quality-first approach: vector-based semantic matching replaces keyword search
• Use includeRelated=false to disable and get only main search results

WORKFLOW: Use search_docs for exploration → get_doc for detailed analysis → repeat with refined queries.`,
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'SEARCH QUERY: Use 2-4 specific keywords. Examples: "SwiftUI custom animation", "Core Data fetch performance", "UIKit navigation delegate methods"'
                },
                limit: {
                  type: 'number',
                  description: 'RESULT COUNT: 8-10 for exploration, 3-5 for focused search. More results = broader overview.',
                  default: 10
                },
                minSimilarity: {
                  type: 'number',
                  description: 'RELEVANCE THRESHOLD: 0.3 (default) for broad search, 0.5+ for highly specific results. Lower = more results.',
                  default: 0.3
                },
                includeContent: {
                  type: 'boolean',
                  description: 'CONTENT PREVIEW: Always true for decision making. Provides snippet to evaluate relevance.',
                  default: true
                },
                maxContentChars: {
                  type: 'number',
                  description: 'SNIPPET SIZE: 150-200 for quick scan, 300+ for detailed preview. Balance overview vs detail.',
                  default: 200
                },
                includeRelated: {
                  type: 'boolean',
                  description: '🔗 VECTOR-BASED AUTO-DISCOVER: Find semantically related documents using embeddings similarity (NOW ENABLED BY DEFAULT). Adds 3-6 intelligently classified docs (🔄 Migration guides, 🆕 Modern alternatives, ⚡ Performance tips, 📋 Code examples). Set to false to show only main results.',
                  default: true
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_doc',
            description: `📖 DEEP DIVE: Get complete document content with unlimited size - perfect for thorough analysis.

CONTENT RICHNESS:
• FULL TEXT: Complete Apple documentation (up to 18K+ characters)
• CODE BLOCKS: Multiple Swift examples with syntax highlighting
• METADATA: Content length, code block count, document type
• STRUCTURE: Sections, discussions, usage examples

USAGE PATTERNS:
• SINGLE DOC: Pass string ID for one document
• BATCH ANALYSIS: Pass array of up to 10 IDs for comparison
• FOLLOW-UP: Use after search_docs to get complete details of promising results

WHAT YOU GET:
• title: Document title
• url: Direct link to Apple Developer docs
• content: Complete text with markdown formatting
• contentLength: Size in characters for analysis
• codeBlocks: Number of code examples

STRATEGY: Get full documents when search_docs snippets look promising but lack detail. No size limits - get everything you need for implementation.`,
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  oneOf: [
                    { 
                      type: 'string', 
                      description: 'SINGLE DOCUMENT: ID from search_docs result for focused analysis of one topic' 
                    },
                    { 
                      type: 'array', 
                      items: { type: 'string' }, 
                      maxItems: 10,
                      description: 'BATCH ANALYSIS: Up to 10 IDs for comparing related documents or getting comprehensive coverage'
                    }
                  ]
                }
              },
              required: ['id']
            }
          },
          {
            name: 'get_stats',
            description: `📊 DATABASE OVERVIEW: Quick health check and scope understanding of the Apple documentation database.

DATABASE SCALE:
• 16,253 total documents from Apple Developer documentation
• text-embedding-3-large model (3072 dimensions) for semantic search
• Covers iOS, macOS, watchOS, tvOS, visionOS platforms

WHAT YOU GET:
• totalDocuments: Exact count of available docs
• model: AI model used for semantic search quality
• dimensions: Vector dimensions for search precision
• sampleTitles: Random titles to understand content types

WHEN TO USE:
• First interaction: Understand database scope
• Debugging: Verify system is working correctly  
• Context setting: Know what's available before searching
• Health check: Confirm database connection

Quick reference: This database contains comprehensive Apple platform documentation with semantic search capabilities.`,
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          }
        ]
      };
    });
  }

  // Document search handler
  async handleSearchDocs(args) {
    const {
      query,
      limit = 10,
      minSimilarity = 0.3,
      includeContent = true,
      maxContentChars = 300,
      includeRelated = true // 🆕 NOW ENABLED BY DEFAULT
    } = args;

    if (!query || typeof query !== 'string') {
      throw new Error('Parameter query is required and must be a string');
    }

    // 🔧 Related documents enabled by default (handles undefined as true)
    const shouldIncludeRelated = includeRelated === undefined ? true : (includeRelated !== false && includeRelated !== 'false');

    return this.sqliteQueue(async () => {
      const engine = await this.initializeEngine();
      
      // 1. Main search (as before)
      const results = await this.withTimeout(
        () => engine.search(query, limit, minSimilarity),
        30000,
        `Search: "${query}"`
      );

      const formattedResults = results.map(result => ({
        id: result.id,
        title: result.title,
        url: result.url,
        similarity: Math.round(result.similarity * 10000) / 100, // Percentage with 2 decimals
        snippet: includeContent ? 
          (result.content.length > maxContentChars ? 
            result.content.substring(0, maxContentChars) + '...' : 
            result.content
          ) : null
      }));

      let response = {
        query: query,
        total: results.length,
        results: formattedResults
      };

      // 2. 🆕 RELATED DOCUMENTS (only if requested)
      if (shouldIncludeRelated && results.length > 0) {
        try {
          const relatedDocs = await this.withTimeout(
            () => engine.findRelatedDocuments(results.slice(0, 3), query),
            15000,
            `Finding related docs for: "${query}"`
          );
          
          if (relatedDocs.length > 0) {
            response.relatedDocuments = relatedDocs.map(doc => ({
              id: doc.id,
              title: doc.title,
              url: doc.url,
              similarity: Math.round(doc.similarity * 10000) / 100,
              relationship: doc.relationship,
              snippet: includeContent ? 
                (doc.content.length > 150 ? 
                  doc.content.substring(0, 150) + '...' : 
                  doc.content
                ) : null
            }));
            response.coverage = 'extended'; // Flag that this is extended search
            response.totalWithRelated = results.length + relatedDocs.length;
          }
        } catch (error) {
          console.error('Error finding related documents:', error);
          response.relatedError = 'Failed to find related documents';
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    });
  }

  // Document retrieval handler
  async handleGetDoc(args) {
    const { id } = args;

    if (!id) {
      throw new Error('Parameter id is required');
    }

    // Handle MCP's conversion of arrays to JSON strings
    // MCP SDK converts ["id1", "id2"] to "[\"id1\", \"id2\"]" string
    let processedId = id;
    if (typeof id === 'string' && id.startsWith('[') && id.endsWith(']')) {
      try {
        processedId = JSON.parse(id);
      } catch (e) {
        // Keep original id if parsing fails
      }
    }

    return this.sqliteQueue(async () => {
      const engine = await this.initializeEngine();

      let documents;
      let isArray = false;

      if (Array.isArray(processedId)) {
        if (processedId.length === 0) {
          throw new Error('Array of IDs cannot be empty');
        }
        if (processedId.length > 10) {
          throw new Error('Maximum 10 documents at once');
        }
        isArray = true;
        documents = await this.withTimeout(
          () => engine.getDocuments(processedId),
          30000,
          `Retrieving documents: ${processedId.join(', ')}`
        );
      } else {
        documents = await this.withTimeout(
          () => engine.getDocument(processedId),
          30000,
          `Retrieving document: ${processedId}`
        );
        documents = documents ? [documents] : [];
      }

      if (!documents || documents.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Documents not found',
                requested_ids: Array.isArray(processedId) ? processedId : [processedId],
                found: 0
              }, null, 2)
            }
          ]
        };
      }

      const enrichedDocs = documents.map(doc => {
        const codeBlocks = (doc.content.match(/```[\s\S]*?```/g) || []).length;
        return {
          id: doc.id,
          title: doc.title,
          url: doc.url,
          type: doc.type || null,
          content: doc.content,
          contentLength: doc.content.length,
          codeBlocks: codeBlocks
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              found: documents.length,
              documents: enrichedDocs
            }, null, 2)
          }
        ]
      };
    });
  }

  // Statistics handler
  async handleGetStats(args) {
    return this.sqliteQueue(async () => {
      const engine = await this.initializeEngine();
      
      const stats = await this.withTimeout(
        () => engine.getStats(),
        10000,
        'Retrieving statistics'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              database: 'embeddings.db',
              totalDocuments: stats.totalDocuments,
              model: 'text-embedding-3-large',
              dimensions: 3072,
              sampleTitles: stats.sampleTitles
            }, null, 2)
          }
        ]
      };
    });
  }

  async run() {
    console.error('[apple-docs-mcp] Starting MCP server...');
    
    // Register handlers before connection
    this.setupTools();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('[apple-docs-mcp] MCP server started and ready');
  }
}

// Start server
const server = new AppleSearchMCPServer();
server.run().catch(error => {
  console.error('[apple-docs-mcp] Critical startup error:', error);
  process.exit(1);
});