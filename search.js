import Database from 'better-sqlite3';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { CompatibilityAnalyzer } from './compatibility-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AppleSearchEngine {
  constructor() {
    this.db = null;
    this.openai = null;
    this.initialized = false;
    this.openaiInitialized = false;
    // Initialize compatibility analyzer
    this.compatibilityAnalyzer = new CompatibilityAnalyzer();
  }

  findDatabasePath() {
    // Try environment variable first
    if (process.env.EMBEDDINGS_DB_PATH) {
      const envPath = process.env.EMBEDDINGS_DB_PATH;
      if (fs.existsSync(envPath)) {
        return envPath;
      }
    }

    // List of paths to try (in order of preference)
    const candidatePaths = [
      // 1. Relative to package (most common)
      path.join(__dirname, 'embeddings.db'),
      // 2. Current working directory 
      path.join(process.cwd(), 'embeddings.db'),
      // 3. node_modules location
      path.join(process.cwd(), 'node_modules', 'apple-docs-mcp-server', 'embeddings.db'),
      // 4. Default relative path (fallback)
      './embeddings.db'
    ];

    for (const dbPath of candidatePaths) {
      if (fs.existsSync(dbPath)) {
        console.error(`✅ Found database at: ${dbPath}`);
        return dbPath;
      }
    }

    // Fallback to environment variable or default
    const fallbackPath = process.env.EMBEDDINGS_DB_PATH || './embeddings.db';
    console.error(`⚠️  Database not found. Using: ${fallbackPath}`);
    return fallbackPath;
  }

  async init(initOpenAI = true) {
    try {
      // Initialize SQLite database with smart path resolution
      const dbPath = this.findDatabasePath();
      this.db = new Database(dbPath);
      
      this.initialized = true;
      
      // Initialize OpenAI client (optional)
      if (initOpenAI) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          console.warn('⚠️  OPENAI_API_KEY not found. Search will be unavailable.');
          console.error('✅ SQLite database initialized (read-only)');
          return;
        }
        
        this.openai = new OpenAI({
          apiKey: apiKey
        });
        this.openaiInitialized = true;
        console.error('Apple Search Engine initialized successfully (with OpenAI)');
      } else {
        console.error('✅ SQLite database initialized (read-only)');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  async search(query, limit = 10, minSimilarity = 0.3) {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }
    
    if (!this.openaiInitialized) {
      throw new Error('OpenAI not initialized. Search requires OPENAI_API_KEY.');
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await this.getEmbedding(query);
      const queryVector = queryEmbedding; // Already array of numbers
      
      // Get all documents with their embeddings, joining two tables
      const stmt = this.db.prepare(`
        SELECT d.id, d.title, d.url, d.content, d.platforms, d.technologies, e.embedding 
        FROM documents d 
        JOIN embeddings e ON d.id = e.id
      `);
      const allDocuments = stmt.all();
      
      // Calculate cosine similarity for each document
      const resultsWithSimilarity = allDocuments.map(doc => {
        // BLOB to Float32Array conversion
        const docVector = this.blobToFloat32Array(doc.embedding);
        const similarity = this.calculateCosineSimilarity(queryVector, docVector);
        
        // Add compatibility analysis (fast, non-blocking)
        let compatibility = null;
        try {
          compatibility = this.compatibilityAnalyzer.analyze({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            platforms: doc.platforms,
            technologies: doc.technologies
          });
        } catch (error) {
          // Fail silently to not break search
          console.error(`Compatibility analysis failed for ${doc.id}:`, error);
        }
        
        return {
          id: doc.id,
          title: doc.title,
          url: doc.url,
          content: doc.content,
          similarity: similarity,
          compatibility: compatibility
        };
      });
      
      // Sort by decreasing relevance
      const sortedResults = resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);
      
      // Filter by minimum similarity
      let filteredResults = sortedResults.filter(doc => doc.similarity >= minSimilarity);
      
      // Auto-fallback: if few results, relax threshold
      if (filteredResults.length < Math.min(3, limit) && minSimilarity > 0.2) {
        const fallbackThreshold = Math.max(0.2, minSimilarity - 0.1);
        filteredResults = sortedResults.filter(doc => doc.similarity >= fallbackThreshold);
        console.warn(`⚠️  Few results with threshold ${minSimilarity}. Relaxed to ${fallbackThreshold}.`);
      }
      
      return filteredResults.slice(0, limit);
        
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  async getEmbedding(text) {
    try {
      const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
      const dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS) || 3072;
      
      const response = await this.openai.embeddings.create({
        model: model,
        input: text,
        dimensions: dimensions
      });

      return response.data[0].embedding; // Return array directly
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Check OPENAI_API_KEY.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try later.');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        throw new Error('OpenAI connection timeout. Please try later.');
      } else {
        console.error('Embedding retrieval error:', error);
        throw new Error('Failed to get embedding: ' + (error.message || 'unknown error'));
      }
    }
  }

  getDocument(id) {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
      const result = stmt.get(id);
      
      if (result) {
        return {
          id: result.id,
          title: result.title,
          url: result.url,
          content: result.content,
          type: result.type,
          description: result.description
        };
      }
      return null;
    } catch (error) {
      console.error('Document retrieval error:', error);
      throw error;
    }
  }

  getDocuments(ids) {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    try {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`SELECT * FROM documents WHERE id IN (${placeholders})`);
      const results = stmt.all(...ids);
      
      return results.map(row => ({
        id: row.id,
        title: row.title,
        url: row.url,
        content: row.content,
        type: row.type,
        description: row.description
      }));
    } catch (error) {
      console.error('Documents retrieval error:', error);
      throw error;
    }
  }

  getStats() {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    try {
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM documents');
      const countResult = countStmt.get();
      
      const sampleStmt = this.db.prepare('SELECT title FROM documents LIMIT 5');
      const sampleResults = sampleStmt.all();
      
      return {
        totalDocuments: countResult.count,
        sampleTitles: sampleResults.map(r => r.title)
      };
    } catch (error) {
      console.error('Statistics retrieval error:', error);
      throw error;
    }
  }

  // Method for converting BLOB to Float32Array
  blobToFloat32Array(blob) {
    // Proper Buffer to Float32Array conversion
    if (blob.buffer) {
      // If this is Node.js Buffer with buffer property
      return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
    } else {
      // Fallback for regular byte arrays
      const buffer = new ArrayBuffer(blob.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < blob.length; i++) {
        view[i] = blob[i];
      }
      return new Float32Array(buffer);
    }
  }

  // Method for calculating cosine similarity
  calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  // 🔗 RELATED DOCUMENTS: Find documents related to main search results (Vector-Based)
  async findRelatedDocuments(mainResults, originalQuery) {
    if (!mainResults || mainResults.length === 0) {
      return [];
    }

    const usedIds = new Set(mainResults.map(r => r.id)); // Exclude duplicates
    
    try {
      console.error(`🔍 Finding related docs using vector similarity for ${mainResults.length} main results`);
      
      // 1. 📊 Get embeddings for top-3 main results from database (NO API calls!)
      const topResults = mainResults.slice(0, 3);
      const embeddings = await this.getEmbeddingsFromDB(topResults);
      
      if (embeddings.length === 0) {
        console.warn('⚠️  No embeddings found for main results');
        return [];
      }
      
      // 2. 🧠 Compute centroid (semantic center) of main results
      const centroid = this.computeCentroid(embeddings);
      
      // 3. 🎯 Find semantically similar documents using existing embeddings
      const avgMainSimilarity = mainResults.reduce((sum, r) => sum + r.similarity, 0) / mainResults.length;
      let relatedThreshold = 0.45; // Base threshold for related docs
      
      // Adaptive threshold based on main results quality
      if (avgMainSimilarity > 0.6) {
        relatedThreshold = 0.48; // High quality → higher threshold
      } else if (avgMainSimilarity < 0.4) {
        relatedThreshold = 0.42; // Lower quality → more lenient
      }
      
      console.error(`🎯 Using vector threshold: ${relatedThreshold.toFixed(2)} (main avg: ${(avgMainSimilarity * 100).toFixed(1)}%)`);
      
      const relatedDocs = await this.findSimilarByEmbedding(centroid, usedIds, relatedThreshold, 10);
      
      // 4. 🏷️ Classify relationship types for better UX
      const classifiedDocs = this.classifyRelationships(relatedDocs, mainResults, originalQuery);
      
      const finalResults = classifiedDocs.slice(0, 6); // Max 6 related documents
      console.error(`🔗 Found ${finalResults.length} vector-based related documents`);
      
      return finalResults;
      
    } catch (error) {
      console.error('Error finding related documents:', error);
      return [];
    }
  }

  // 📊 Get embeddings from database for given results (NO API calls!)
  async getEmbeddingsFromDB(results) {
    if (!results || results.length === 0) {
      return [];
    }
    
    try {
      const ids = results.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`SELECT id, embedding FROM embeddings WHERE id IN (${placeholders})`);
      const embeddings = stmt.all(...ids);
      
      return embeddings.map(e => ({
        id: e.id,
        vector: this.blobToFloat32Array(e.embedding)
      }));
    } catch (error) {
      console.error('Error getting embeddings from DB:', error);
      return [];
    }
  }

  // 🧠 Compute centroid (semantic center) of multiple embeddings
  computeCentroid(embeddings) {
    if (!embeddings || embeddings.length === 0) {
      return null;
    }
    
    const dim = embeddings[0].vector.length;
    const centroid = new Float32Array(dim);
    
    // Sum all vectors
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += emb.vector[i];
      }
    }
    
    // Average (normalize by count)
    for (let i = 0; i < dim; i++) {
      centroid[i] /= embeddings.length;
    }
    
    return centroid;
  }

  // 🎯 Find documents similar to given embedding vector
  async findSimilarByEmbedding(queryVector, excludeIds, threshold = 0.45, limit = 10) {
    if (!queryVector) {
      return [];
    }
    
    try {
      // Get all documents with their embeddings, excluding already used ones
      const excludeList = Array.from(excludeIds);
      const excludePlaceholders = excludeList.map(() => '?').join(',');
      const excludeClause = excludeList.length > 0 ? `WHERE d.id NOT IN (${excludePlaceholders})` : '';
      
      const stmt = this.db.prepare(`
        SELECT d.id, d.title, d.url, d.content, e.embedding 
        FROM documents d 
        JOIN embeddings e ON d.id = e.id
        ${excludeClause}
      `);
      
      const allDocuments = excludeList.length > 0 ? stmt.all(...excludeList) : stmt.all();
      
      // Calculate cosine similarity for each document
      const resultsWithSimilarity = allDocuments.map(doc => {
        const docVector = this.blobToFloat32Array(doc.embedding);
        const similarity = this.calculateCosineSimilarity(queryVector, docVector);
        
        return {
          id: doc.id,
          title: doc.title,
          url: doc.url,
          content: doc.content,
          similarity: similarity
        };
      });
      
      // Filter by threshold and sort by similarity
      const filteredResults = resultsWithSimilarity
        .filter(doc => doc.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
      
      return filteredResults.slice(0, limit);
      
    } catch (error) {
      console.error('Error finding similar documents by embedding:', error);
      return [];
    }
  }

  // 🏷️ Classify relationship types for better UX
  classifyRelationships(candidates, mainResults, originalQuery) {
    if (!candidates || candidates.length === 0) {
      return candidates;
    }
    
    return candidates.map(candidate => {
      const relationship = this.determineRelationshipType(candidate, mainResults, originalQuery);
      return { ...candidate, relationship };
    });
  }

  // 🎯 Determine the type of relationship between candidate and main results
  determineRelationshipType(candidate, mainResults, originalQuery) {
    const candidateTitle = candidate.title.toLowerCase();
    const candidateContent = candidate.content.toLowerCase();
    const mainTitles = mainResults.map(r => r.title.toLowerCase());
    const queryLower = originalQuery.toLowerCase();
    
    // 🔄 Migration guides
    if (candidateTitle.includes('bringing') || candidateTitle.includes('migrat') || 
        candidateTitle.includes('converting') || candidateTitle.includes('transition')) {
      return '🔄 Migration Guide';
    }
    
    // 🆕 Modern alternatives (SceneKit → RealityKit, UIKit → SwiftUI, etc.)
    if ((mainTitles.some(t => t.includes('scenekit')) && candidateTitle.includes('realitykit')) ||
        (mainTitles.some(t => t.includes('uikit')) && candidateTitle.includes('swiftui')) ||
        (mainTitles.some(t => t.includes('core animation')) && candidateTitle.includes('swiftui'))) {
      return '🆕 Modern Alternative';
    }
    
    // ⚡ Performance and optimization
    if (candidateTitle.includes('performance') || candidateTitle.includes('optimiz') || 
        candidateTitle.includes('efficient') || candidateTitle.includes('faster')) {
      return '⚡ Performance Guide';
    }
    
    // 📋 Code examples and samples
    if (candidateTitle.includes('sample') || candidateTitle.includes('demo') || 
        candidateTitle.includes('example') || candidateTitle.includes('tutorial')) {
      return '📋 Code Example';
    }
    
    // 🔧 Implementation details (low-level alternatives)
    if ((queryLower.includes('realitykit') && candidateTitle.includes('metal')) ||
        (queryLower.includes('swiftui') && candidateTitle.includes('core animation')) ||
        (queryLower.includes('core image') && candidateTitle.includes('metal'))) {
      return '🔧 Low-Level Implementation';
    }
    
    // 📚 API references (lots of code blocks, structured content)
    if (this.isApiReference(candidate.content)) {
      return '📚 API Reference';
    }
    
    // 🎯 Platform-specific variants
    if (candidateTitle.includes('visionos') || candidateTitle.includes('macos') || 
        candidateTitle.includes('ios') || candidateTitle.includes('tvos')) {
      return '🎯 Platform Specific';
    }
    
    // 🔗 Default: Related topic
    return '🔗 Related Topic';
  }

  // Check if document is primarily an API reference
  isApiReference(content) {
    const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;
    const structPattern = /\b(struct|class|protocol|enum)\s+\w+/g;
    const structCount = (content.match(structPattern) || []).length;
    
    return codeBlockCount >= 3 || structCount >= 2;
  }

  // Legacy method kept for backward compatibility (now unused)
  extractKeywords(results) {
    const keywords = new Set();
    
    results.forEach(result => {
      // Extract API names (patterns like ButtonStyle, NavigationView, etc.)
      const apiMatches = result.content.match(/\b[A-Z][a-zA-Z]+(?:Style|View|Controller|Modifier|Protocol|Delegate|Component|Manager|Service)\b/g);
      if (apiMatches) {
        apiMatches.slice(0, 3).forEach(api => {
          if (api.length > 4) { // Filter out too short matches
            keywords.add(api);
          }
        });
      }
      
      // Extract words from title
      const titleWords = result.title.split(/[\s\-_]+/)
        .filter(word => word.length > 3 && word.match(/^[A-Z]/))
        .filter(word => !word.match(/^(The|And|For|With|How|What|Where|When)$/)); // Filter common words
      
      titleWords.forEach(word => keywords.add(word));
      
      // Extract SwiftUI/UIKit specific terms
      const frameworkTerms = result.content.match(/\b(SwiftUI|UIKit|AppKit|RealityKit|CoreData|CloudKit|ARKit|VisionOS)\b/gi);
      if (frameworkTerms) {
        frameworkTerms.slice(0, 2).forEach(term => keywords.add(term));
      }
    });
    
    return Array.from(keywords).slice(0, 5);
  }

  /**
   * Extract code examples from a specific document
   * @param {string} docId - Document ID  
   * @returns {Array} Code examples with context
   */
  extractCodeFromDocument(docId) {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    try {
      // Get document from database
      const doc = this.getDocument(docId);
      if (!doc) {
        throw new Error(`Document ${docId} not found`);
      }

      // Extract code examples directly (no complex legacy code)
      const examples = this.extractCodeExamples(doc);
      console.log(`📋 Extracted ${examples.length} code examples from ${doc.title}`);
      
      return examples;
    } catch (error) {
      console.error('Code extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract code examples from document (simple, no legacy complexity)
   * @param {Object} doc - Document object
   * @returns {Array} Simple code examples with context
   */
  extractCodeExamples(doc) {
    const examples = [];
    const content = doc.content;
    
    // Find Swift code blocks
    const swiftCodeRegex = /```swift\s*\n([\s\S]*?)\n?\s*```/g;
    let match;
    
    while ((match = swiftCodeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      const startIndex = match.index;
      
      // Smart context extraction with sentence boundaries
      const contextBefore = this.extractSmartContextBefore(content, startIndex);
      const contextAfter = this.extractSmartContextAfter(content, startIndex + match[0].length);
      
      // Enhanced categorization with comprehensive patterns
      const category = this.categorizeCodeEnhanced(code, doc.title, contextBefore + ' ' + contextAfter);
      
      // Simple complexity assessment
      const lines = code.split('\n').length;
      const complexity = lines <= 3 ? 'Simple' : lines <= 10 ? 'Medium' : 'Complex';
      
      // Attempt to fix corrupted formatting (commas instead of newlines)
      const fixedCode = this.attemptCodeFormatFix(code);
      
      // Validate code quality before including
      if (!this.isValidCodeExample(fixedCode, contextBefore + ' ' + contextAfter)) {
        continue; // Skip invalid examples
      }
      
      const actualLines = fixedCode.split('\n').length;
      const actualComplexity = actualLines <= 3 ? 'Simple' : actualLines <= 10 ? 'Medium' : 'Complex';
      
      examples.push({
        id: `${doc.id}_${startIndex}`,
        documentId: doc.id,
        documentTitle: doc.title,
        documentUrl: doc.url,
        code: fixedCode,
        originalCode: code, // Keep original for debugging
        language: 'swift',
        lines: actualLines,
        contextBefore: contextBefore,
        contextAfter: contextAfter,
        purpose: contextBefore.includes('example') ? 'Example' : 'Usage',
        complexity: actualComplexity,
        category: category,
        hasComments: fixedCode.includes('//'),
        usesSystemAPI: fixedCode.includes('Button') || fixedCode.includes('Text') || fixedCode.includes('List') ? ['SwiftUI'] : []
      });
    }
    
    return examples;
  }
  
  /**
   * Attempt to fix corrupted code formatting (improved version)
   * @param {string} code - Corrupted code with commas instead of newlines
   * @returns {string} Potentially fixed code
   */
  attemptCodeFormatFix(code) {
    if (!code.includes(',')) {
      return code; // Already properly formatted
    }
    
    let fixed = code;
    
    // Phase 1: Handle structural elements first
    fixed = fixed
      .replace(/{\s*,/g, '{\n')           // Opening braces
      .replace(/,\s*}/g, '\n}')           // Closing braces
      .replace(/\)\s*,\s*{/g, ') {\n')    // ) { patterns
      .replace(/;\s*,/g, ';\n')           // Semicolon line endings
      
    // Phase 2: Handle indentation patterns
      .replace(/,(\s{8,})/g, '\n$1')      // 8+ spaces = deep indentation
      .replace(/,(\s{4,7})/g, '\n$1')     // 4-7 spaces = normal indentation  
      .replace(/,(\s{2,3})/g, '\n$1')     // 2-3 spaces = shallow indentation
      
    // Phase 3: Handle Swift-specific patterns
      .replace(/,\s*(let |var |func |class |struct |enum |import |@)/g, '\n$1') // Swift keywords
      .replace(/,\s*(\.[a-zA-Z])/g, '\n    $1')  // Method chaining with dot notation
      .replace(/,\s*(\w+\()/g, '\n    $1')       // Function calls
      .replace(/,\s*(\w+:)/g, '\n    $1')        // Parameter labels
      
    // Phase 4: Clean up artifacts
      .replace(/\n\s*,/g, '\n')           // Remove leading commas
      .replace(/,\s*\n/g, '\n')           // Remove trailing commas before newlines
      .replace(/\n{3,}/g, '\n\n')         // Remove excessive newlines
      .trim();
    
    // Phase 5: Final validation - if result looks worse, return simpler version
    const originalLines = code.split(/[,\n]/).length;
    const fixedLines = fixed.split('\n').length;
    
    // If we created too few lines, use basic fallback
    if (fixedLines < originalLines * 0.5) {
      return code.replace(/,/g, '\n').trim();
    }
    
    return fixed;
  }
  
  /**
   * Extract context before code with smart sentence boundary detection
   * @param {string} content - Full document content
   * @param {number} startIndex - Start position of code block
   * @returns {string} Context before code
   */
  extractSmartContextBefore(content, startIndex) {
    const maxLength = 200;
    const minLength = 50;
    
    // Get text before the code block
    const beforeText = content.substring(Math.max(0, startIndex - maxLength), startIndex);
    
    // Try to find complete sentences
    const sentences = beforeText.split(/[.!?]\s+/);
    
    if (sentences.length > 1) {
      // Take last 1-2 complete sentences
      const lastSentences = sentences.slice(-2).filter(s => s.trim().length > 10);
      if (lastSentences.length > 0) {
        return lastSentences.join('. ').trim();
      }
    }
    
    // Fallback: try paragraph breaks
    const paragraphs = beforeText.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      const lastParagraph = paragraphs[paragraphs.length - 1].trim();
      if (lastParagraph.length >= minLength) {
        return lastParagraph;
      }
    }
    
    // Final fallback: just clean up the text
    return beforeText.trim().replace(/^\W+/, ''); // Remove leading non-word chars
  }
  
  /**
   * Extract context after code with smart sentence boundary detection
   * @param {string} content - Full document content
   * @param {number} endIndex - End position of code block
   * @returns {string} Context after code
   */
  extractSmartContextAfter(content, endIndex) {
    const maxLength = 150;
    
    // Get text after the code block
    const afterText = content.substring(endIndex, endIndex + maxLength);
    
    // Try to find the first complete sentence
    const sentenceMatch = afterText.match(/^[^.!?]*[.!?]/);
    if (sentenceMatch) {
      return sentenceMatch[0].trim();
    }
    
    // Try to find a reasonable break point (paragraph, code block, etc.)
    const breakPoints = [
      afterText.indexOf('\n\n'),
      afterText.indexOf('\n```'),
      afterText.indexOf('## ')
    ].filter(pos => pos > 0);
    
    if (breakPoints.length > 0) {
      const breakPoint = Math.min(...breakPoints);
      return afterText.substring(0, breakPoint).trim();
    }
    
    // Fallback: return first ~100 chars, breaking at word boundary
    if (afterText.length > 100) {
      const wordBreak = afterText.lastIndexOf(' ', 100);
      if (wordBreak > 50) {
        return afterText.substring(0, wordBreak).trim() + '...';
      }
    }
    
    return afterText.trim();
  }
  
  /**
   * Enhanced code categorization with comprehensive pattern matching
   * @param {string} code - Code snippet
   * @param {string} title - Document title
   * @param {string} context - Context around code
   * @returns {string} Category name
   */
  categorizeCodeEnhanced(code, title, context) {
    const lowerCode = code.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerContext = context.toLowerCase();
    
    // Combine all text for pattern matching
    const allText = `${lowerCode} ${lowerTitle} ${lowerContext}`;
    
    // UI Controls & Input
    if (/button|toggle|slider|picker|textfield|secureField|datepicker|stepper/i.test(allText)) {
      return 'UI Controls';
    }
    
    // Navigation & Routing
    if (/navigation|routing|link|sheet|popover|alert|actionsheet|tab|sidebar/i.test(allText)) {
      return 'Navigation';
    }
    
    // Lists & Data Display
    if (/list|table|collection|grid|foreach|section|row|cell/i.test(allText)) {
      return 'Lists & Collections';
    }
    
    // State Management
    if (/@state|@binding|@observedobject|@stateobject|@environmentobject|@published|observable/i.test(allText)) {
      return 'State Management';
    }
    
    // Layout & Positioning
    if (/vstack|hstack|zstack|grid|geometry|alignment|padding|frame|spacing/i.test(allText)) {
      return 'Layout';
    }
    
    // Animations & Transitions
    if (/animation|transition|spring|easing|keyframe|withanimation|scaleeffect|rotationeffect/i.test(allText)) {
      return 'Animations';
    }
    
    // Network & Data
    if (/urlsession|fetch|download|upload|json|codable|api|request|response/i.test(allText)) {
      return 'Networking';
    }
    
    // Core Data & Persistence
    if (/coredata|fetch|predicate|managedObject|persistent|@fetchrequest|swiftdata/i.test(allText)) {
      return 'Data Persistence';
    }
    
    // Graphics & Drawing
    if (/path|shape|canvas|metal|scenekit|realitykit|arkit|vision|core graphics/i.test(allText)) {
      return 'Graphics & AR';
    }
    
    // Platform-specific
    if (/watchos|complication|clockkit|digital crown/i.test(allText)) {
      return 'watchOS';
    }
    if (/visionos|spatial|immersive|window|volume/i.test(allText)) {
      return 'visionOS';
    }
    if (/tvos|focus|remote|directional/i.test(allText)) {
      return 'tvOS';
    }
    
    // System Integration
    if (/notification|location|camera|contacts|calendar|health|siri|widget/i.test(allText)) {
      return 'System Integration';
    }
    
    // Testing & Debugging
    if (/test|mock|preview|debug|assert|xctassert/i.test(allText)) {
      return 'Testing';
    }
    
    // Performance & Concurrency
    if (/async|await|task|actor|concurrent|performance|background|queue/i.test(allText)) {
      return 'Concurrency';
    }
    
    // Accessibility
    if (/accessibility|voiceover|dynamic type|reduce motion/i.test(allText)) {
      return 'Accessibility';
    }
    
    return 'General';
  }
  
  /**
   * Validate and filter code examples to remove obvious junk
   * @param {string} code - Code to validate
   * @param {string} context - Context around code
   * @returns {boolean} True if code seems valid
   */
  isValidCodeExample(code, context) {
    // Too short to be useful
    if (code.trim().length < 10) return false;
    
    // Just a type declaration without implementation
    if (/^(class|struct|enum|protocol)\s+\w+.*$/.test(code.trim()) && !code.includes('{')) {
      return false;
    }
    
    // Only imports
    if (/^import\s+\w+$/.test(code.trim())) return false;
    
    // Only variable declarations without context
    if (/^(let|var)\s+\w+/.test(code.trim()) && code.split('\n').length === 1 && context.length < 20) {
      return false;
    }
    
    // Contains too many artifacts
    const artifactCount = (code.match(/,\s*}/g) || []).length + (code.match(/{\s*,/g) || []).length;
    if (artifactCount > code.split('\n').length * 0.3) return false;
    
    return true;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    console.error('Apple Search Engine closed');
  }
}