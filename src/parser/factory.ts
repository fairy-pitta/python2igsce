// Parser factory
import { PythonParser } from './python-parser';
import { ParserOptions } from '../types/parser';

/**
 * Parser type
 */
export type ParserType = 'python' | 'javascript' | 'java' | 'cpp';

/**
 * Parser factory configuration
 */
export interface ParserFactoryOptions {
  /** Parser type */
  type: ParserType;
  /** Parser options */
  options?: ParserOptions;
}

/**
 * Parser factory class
 */
export class ParserFactory {
  /**
   * Create parser
   */
  static create(config: ParserFactoryOptions): PythonParser {
    switch (config.type) {
      case 'python':
        return new PythonParser(config.options);

      case 'javascript':
      case 'java':
      case 'cpp':
        throw new Error(`Parser for ${config.type} is not implemented yet`);

      default:
        throw new Error(`Unknown parser type: ${config.type}`);
    }
  }

  /**
   * Get list of supported parsers
   */
  static getSupportedParsers(): ParserType[] {
    return ['python'];
  }

  /**
   * Check if parser is supported
   */
  static isSupported(type: ParserType): boolean {
    return this.getSupportedParsers().includes(type);
  }
}

/**
 * Convenience function: Create Python parser
 */
export function createParser(options?: ParserOptions): PythonParser {
  return ParserFactory.create({
    type: 'python',
    options: options || {},
  });
}

/**
 * Convenience function: Create preconfigured parser
 */
export function createPreconfiguredParser(preset: 'strict' | 'lenient' | 'debug'): PythonParser {
  const presets: Record<string, ParserOptions> = {
    strict: {
      strictTypes: true,
      preserveComments: true,
      debug: false,
      maxDepth: 20,
    },
    lenient: {
      strictTypes: false,
      preserveComments: true,
      debug: false,
      maxDepth: 50,
    },
    debug: {
      strictTypes: true,
      preserveComments: true,
      debug: true,
      maxDepth: 30,
    },
  };

  return createParser(presets[preset]);
}

/**
 * Get parser capabilities
 */
export function getParserCapabilities(type: ParserType): {
  supportedFeatures: string[];
  limitations: string[];
  recommendedUse: string;
} {
  switch (type) {
    case 'python':
      return {
        supportedFeatures: [
          'Variables and assignments',
          'Control structures (if/else, for, while)',
          'Functions and procedures',
          'Basic data types',
          'Arrays and lists',
          'Comments',
          'Input/Output operations',
          'Arithmetic and logical operations',
        ],
        limitations: [
          'Complex object-oriented features',
          'Advanced Python-specific syntax',
          'Decorators and metaclasses',
          'Async/await patterns',
          'Complex comprehensions',
        ],
        recommendedUse: 'Basic to intermediate Python programs suitable for educational purposes',
      };

    default:
      return {
        supportedFeatures: [],
        limitations: ['Not implemented'],
        recommendedUse: 'Not available',
      };
  }
}

/**
 * Parser benchmark information
 */
export interface ParserBenchmark {
  /** Parser type */
  type: ParserType;
  /** Average parse time (milliseconds/line) */
  avgParseTimePerLine: number;
  /** Memory usage (MB/1000 lines) */
  memoryUsagePer1000Lines: number;
  /** Maximum recommended lines */
  maxRecommendedLines: number;
}

/**
 * Get parser benchmark information
 */
export function getParserBenchmark(type: ParserType): ParserBenchmark {
  switch (type) {
    case 'python':
      return {
        type: 'python',
        avgParseTimePerLine: 0.5,
        memoryUsagePer1000Lines: 2.0,
        maxRecommendedLines: 10000,
      };

    default:
      return {
        type,
        avgParseTimePerLine: 0,
        memoryUsagePer1000Lines: 0,
        maxRecommendedLines: 0,
      };
  }
}
