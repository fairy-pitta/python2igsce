// パーサーファクトリー
import { PythonParser } from './python-parser';
import { ParserOptions } from '../types/parser';

/**
 * パーサーの種類
 */
export type ParserType = 'python' | 'javascript' | 'java' | 'cpp';

/**
 * パーサーファクトリーの設定
 */
export interface ParserFactoryOptions {
  /** パーサーの種類 */
  type: ParserType;
  /** パーサーオプション */
  options?: ParserOptions;
}

/**
 * パーサーファクトリークラス
 */
export class ParserFactory {
  /**
   * パーサーを作成
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
   * サポートされているパーサーの一覧を取得
   */
  static getSupportedParsers(): ParserType[] {
    return ['python'];
  }

  /**
   * パーサーがサポートされているかチェック
   */
  static isSupported(type: ParserType): boolean {
    return this.getSupportedParsers().includes(type);
  }
}

/**
 * 便利な関数：Pythonパーサーを作成
 */
export function createParser(options?: ParserOptions): PythonParser {
  return ParserFactory.create({
    type: 'python',
    options: options || {}
  });
}

/**
 * 便利な関数：設定済みのパーサーを作成
 */
export function createPreconfiguredParser(preset: 'strict' | 'lenient' | 'debug'): PythonParser {
  const presets: Record<string, ParserOptions> = {
    strict: {
      strictTypes: true,
      preserveComments: true,
      debug: false,
      maxDepth: 20
    },
    lenient: {
      strictTypes: false,
      preserveComments: true,
      debug: false,
      maxDepth: 50
    },
    debug: {
      strictTypes: true,
      preserveComments: true,
      debug: true,
      maxDepth: 30
    }
  };

  return createParser(presets[preset]);
}

/**
 * パーサーの能力を取得
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
          'Arithmetic and logical operations'
        ],
        limitations: [
          'Complex object-oriented features',
          'Advanced Python-specific syntax',
          'Decorators and metaclasses',
          'Async/await patterns',
          'Complex comprehensions'
        ],
        recommendedUse: 'Basic to intermediate Python programs suitable for educational purposes'
      };
    
    default:
      return {
        supportedFeatures: [],
        limitations: ['Not implemented'],
        recommendedUse: 'Not available'
      };
  }
}

/**
 * パーサーのベンチマーク情報
 */
export interface ParserBenchmark {
  /** パーサーの種類 */
  type: ParserType;
  /** 平均パース時間（ミリ秒/行） */
  avgParseTimePerLine: number;
  /** メモリ使用量（MB/1000行） */
  memoryUsagePer1000Lines: number;
  /** 最大処理可能行数 */
  maxRecommendedLines: number;
}

/**
 * パーサーのベンチマーク情報を取得
 */
export function getParserBenchmark(type: ParserType): ParserBenchmark {
  switch (type) {
    case 'python':
      return {
        type: 'python',
        avgParseTimePerLine: 0.5,
        memoryUsagePer1000Lines: 2.0,
        maxRecommendedLines: 10000
      };
    
    default:
      return {
        type,
        avgParseTimePerLine: 0,
        memoryUsagePer1000Lines: 0,
        maxRecommendedLines: 0
      };
  }
}