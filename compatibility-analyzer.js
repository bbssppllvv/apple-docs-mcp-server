/**
 * Compatibility Analyzer for Apple Documentation
 * Extracts platform, technology, and requirement info from documents
 * Designed to be fast and non-invasive
 */

export class CompatibilityAnalyzer {
  constructor() {
    // Cache for parsed compatibility data to avoid re-parsing
    this.cache = new Map();
  }

  /**
   * Main analysis method - fast and safe
   * @param {Object} doc - Document object with title, content, platforms, technologies
   * @returns {Object} Compatibility information
   */
  analyze(doc) {
    // Use cache to avoid re-analysis
    if (this.cache.has(doc.id)) {
      return this.cache.get(doc.id);
    }

    try {
      const compatibility = {
        platforms: this.parsePlatforms(doc.platforms),
        technologies: this.parseTechnologies(doc.technologies),
        requirements: this.extractRequirements(doc.content),
        limitations: this.extractLimitations(doc.content),
        deprecation: this.detectDeprecation(doc.title, doc.content)
      };

      // Cache result for performance
      this.cache.set(doc.id, compatibility);
      return compatibility;

    } catch (error) {
      // Fail gracefully - return empty compatibility info
      console.error(`Compatibility analysis failed for ${doc.id}:`, error);
      return this.getEmptyCompatibility();
    }
  }

  /**
   * Parse platforms from JSON field
   */
  parsePlatforms(platformsJson) {
    try {
      if (!platformsJson) return { supported: [], count: 0 };
      
      const platforms = JSON.parse(platformsJson);
      if (!Array.isArray(platforms)) return { supported: [], count: 0 };

      return {
        supported: platforms,
        count: platforms.length,
        universal: platforms.length >= 6,
        mobile: platforms.some(p => ['iOS', 'iPadOS'].includes(p)),
        desktop: platforms.includes('macOS'),
        spatial: platforms.includes('visionOS'),
        watch: platforms.includes('watchOS'),
        tv: platforms.includes('tvOS')
      };
    } catch {
      return { supported: [], count: 0 };
    }
  }

  /**
   * Parse technologies from JSON field
   */
  parseTechnologies(technologiesJson) {
    try {
      if (!technologiesJson) return { frameworks: [], primary: null };
      
      const techs = JSON.parse(technologiesJson);
      if (!Array.isArray(techs)) return { frameworks: [], primary: null };

      return {
        frameworks: techs,
        primary: techs[0] || null,
        isModern: techs.includes('SwiftUI'),
        isLegacy: techs.includes('UIKit') && !techs.includes('SwiftUI'),
        hasAI: techs.some(t => ['Core ML', 'Vision', 'Speech'].includes(t)),
        hasAR: techs.some(t => ['ARKit', 'RealityKit'].includes(t)),
        hasGraphics: techs.some(t => ['Metal', 'Core Graphics', 'SceneKit'].includes(t))
      };
    } catch {
      return { frameworks: [], primary: null };
    }
  }

  /**
   * Extract system requirements from content - fast regex matching
   */
  extractRequirements(content) {
    if (!content) return {};
    
    const requirements = {};
    const lowerContent = content.toLowerCase();

    // iOS version requirements
    const iosMatch = lowerContent.match(/(?:requires|minimum|ios)\s+ios\s+(\d+(?:\.\d+)?)/);
    if (iosMatch) requirements.minIOS = iosMatch[1];

    // macOS version requirements  
    const macosMatch = lowerContent.match(/(?:requires|minimum|macos)\s+macos\s+(\d+(?:\.\d+)?)/);
    if (macosMatch) requirements.minMacOS = macosMatch[1];

    // Processor requirements
    const processorMatch = lowerContent.match(/a(\d+)\s*(?:\(or later\)|processor|chip)/);
    if (processorMatch) requirements.minProcessor = `A${processorMatch[1]}`;

    // Apple Silicon requirements
    if (lowerContent.includes('apple silicon') || lowerContent.includes('m1') || lowerContent.includes('m2')) {
      requirements.requiresAppleSilicon = true;
    }

    // Xcode requirements
    const xcodeMatch = lowerContent.match(/(?:requires|minimum)\s+xcode\s+(\d+(?:\.\d+)?)/);
    if (xcodeMatch) requirements.minXcode = xcodeMatch[1];

    return requirements;
  }

  /**
   * Extract hardware/device limitations - fast string matching
   */
  extractLimitations(content) {
    if (!content) return [];
    
    const limitations = [];
    const lowerContent = content.toLowerCase();

    // Hardware requirements
    if (lowerContent.includes('truedepth')) {
      limitations.push({
        type: 'hardware',
        requirement: 'TrueDepth camera',
        scope: 'iPhone X+, iPad Pro 2018+'
      });
    }

    if (lowerContent.includes('lidar')) {
      limitations.push({
        type: 'hardware',
        requirement: 'LiDAR sensor', 
        scope: 'iPhone 12 Pro+, iPad Pro 2020+'
      });
    }

    // Simulator limitations
    if (lowerContent.includes('not available in') && lowerContent.includes('simulator')) {
      limitations.push({
        type: 'simulator',
        restriction: 'Device only'
      });
    }

    // Device-specific limitations
    const deviceRestrictionMatch = content.match(/(\d{4}\s+iPads?\s+do not support[^.]*)/i);
    if (deviceRestrictionMatch) {
      limitations.push({
        type: 'device_specific',
        restriction: deviceRestrictionMatch[1]
      });
    }

    return limitations;
  }

  /**
   * Detect deprecated APIs - fast pattern matching
   */
  detectDeprecation(title, content) {
    if (!content) return null;
    
    const lowerContent = content.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Direct deprecation statements
    if (lowerContent.includes('this is deprecated') || 
        lowerContent.includes('// deprecated')) {
      return {
        status: 'deprecated',
        evidence: 'Direct deprecation statement',
        confidence: 'high'
      };
    }

    // Migration patterns
    const migrationPatterns = [
      'transition away from using',
      'stop doing this',
      'instead, create',
      'instead, use',
      'in its place, use'
    ];

    for (const pattern of migrationPatterns) {
      if (lowerContent.includes(pattern)) {
        return {
          status: 'superseded',
          evidence: pattern,
          confidence: 'medium'
        };
      }
    }

    // Migration documentation
    if (lowerTitle.includes('deprecated') || lowerTitle.includes('migrating')) {
      return {
        status: 'migration_guide',
        evidence: 'Migration documentation',
        confidence: 'high'
      };
    }

    return null;
  }

  /**
   * Return empty compatibility object for error cases
   */
  getEmptyCompatibility() {
    return {
      platforms: { supported: [], count: 0 },
      technologies: { frameworks: [], primary: null },
      requirements: {},
      limitations: [],
      deprecation: null
    };
  }

  /**
   * Clear cache (useful for memory management)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000 // We'll limit cache size for memory
    };
  }
}
