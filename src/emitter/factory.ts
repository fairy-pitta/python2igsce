// エミッターファクトリー
import { BaseEmitter } from './base-emitter';
import { TextEmitter } from './text-emitter';
import { MarkdownEmitter } from './markdown-emitter';
import { EmitterOptions, OutputFormat, MarkdownConfig } from '../types/emitter';

/**
 * エミッターファクトリーの設定
 */
export interface EmitterFactoryOptions {
  /** 出力フォーマット */
  format: OutputFormat;
  /** エミッターオプション */
  options?: Partial<EmitterOptions>;
  /** Markdown固有の設定 */
  markdownConfig?: Partial<MarkdownConfig>;
}

/**
 * エミッターファクトリークラス
 */
export class EmitterFactory {
  /**
   * エミッターを作成
   */
  static create(config: EmitterFactoryOptions): BaseEmitter {
    const options = config.options || {};
    
    switch (config.format) {
      case 'plain':
        return new TextEmitter(options);
      
      case 'markdown':
        return new MarkdownEmitter(options, config.markdownConfig);
      
      case 'html':
      case 'latex':
        throw new Error(`Emitter for ${config.format} is not implemented yet`);
      
      default:
        throw new Error(`Unknown output format: ${config.format}`);
    }
  }

  /**
   * サポートされているフォーマットの一覧を取得
   */
  static getSupportedFormats(): OutputFormat[] {
    return ['plain', 'markdown'];
  }

  /**
   * フォーマットがサポートされているかチェック
   */
  static isSupported(format: OutputFormat): boolean {
    return this.getSupportedFormats().includes(format);
  }

  /**
   * デフォルト設定でエミッターを作成
   */
  static createDefault(format: OutputFormat = 'plain'): BaseEmitter {
    return this.create({ format });
  }

  /**
   * 美化設定でエミッターを作成
   */
  static createBeautified(format: OutputFormat = 'plain'): BaseEmitter {
    const options: Partial<EmitterOptions> = {
      beautify: true,
      includeComments: true,
      indentSize: 3,
      maxLineLength: 80
    };
    
    return this.create({ format, options });
  }

  /**
   * コンパクト設定でエミッターを作成
   */
  static createCompact(format: OutputFormat = 'plain'): BaseEmitter {
    const options: Partial<EmitterOptions> = {
      beautify: false,
      includeComments: false,
      indentSize: 2
    };
    
    return this.create({ format, options });
  }

  /**
   * デバッグ設定でエミッターを作成
   */
  static createDebug(format: OutputFormat = 'plain'): BaseEmitter {
    const options: Partial<EmitterOptions> = {
      includeDebugInfo: true,
      includeLineNumbers: true,
      includeComments: true,
      beautify: true
    };
    
    return this.create({ format, options });
  }
}

/**
 * 便利な関数：エミッターを作成
 */
export function createEmitter(
  format: OutputFormat = 'plain',
  options?: Partial<EmitterOptions>
): BaseEmitter {
  return EmitterFactory.create({ format, options: options || {} });
}

/**
 * 便利な関数：プリセット設定でエミッターを作成
 */
export function createPresetEmitter(
  preset: 'default' | 'beautified' | 'compact' | 'debug',
  format: OutputFormat = 'plain'
): BaseEmitter {
  switch (preset) {
    case 'default':
      return EmitterFactory.createDefault(format);
    case 'beautified':
      return EmitterFactory.createBeautified(format);
    case 'compact':
      return EmitterFactory.createCompact(format);
    case 'debug':
      return EmitterFactory.createDebug(format);
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

/**
 * フォーマット固有の設定を取得
 */
export function getFormatSpecificOptions(format: OutputFormat): {
  recommendedOptions: Partial<EmitterOptions>;
  description: string;
  fileExtension: string;
} {
  switch (format) {
    case 'plain':
      return {
        recommendedOptions: {
          indentSize: 3,
          indentChar: ' ',
          lineEnding: '\n',
          includeComments: true,
          beautify: true
        },
        description: 'Plain text format suitable for printing and basic viewing',
        fileExtension: '.txt'
      };
    
    case 'markdown':
      return {
        recommendedOptions: {
          indentSize: 3,
          indentChar: ' ',
          lineEnding: '\n',
          includeComments: true,
          beautify: true
        },
        description: 'Markdown format with syntax highlighting and documentation features',
        fileExtension: '.md'
      };
    
    case 'html':
      return {
        recommendedOptions: {
          indentSize: 2,
          indentChar: ' ',
          lineEnding: '\n',
          includeComments: true,
          beautify: true
        },
        description: 'HTML format with styling and interactive features',
        fileExtension: '.html'
      };
    
    case 'latex':
      return {
        recommendedOptions: {
          indentSize: 3,
          indentChar: ' ',
          lineEnding: '\n',
          includeComments: false,
          beautify: true
        },
        description: 'LaTeX format for academic papers and documentation',
        fileExtension: '.tex'
      };
    
    default:
      return {
        recommendedOptions: {},
        description: 'Unknown format',
        fileExtension: '.txt'
      };
  }
}

/**
 * エミッターの能力を取得
 */
export function getEmitterCapabilities(format: OutputFormat): {
  supportedFeatures: string[];
  limitations: string[];
  bestUseCase: string;
} {
  switch (format) {
    case 'plain':
      return {
        supportedFeatures: [
          'Basic text formatting',
          'Indentation',
          'Line numbering',
          'Comments',
          'Syntax highlighting (basic)'
        ],
        limitations: [
          'No rich formatting',
          'No hyperlinks',
          'No embedded media'
        ],
        bestUseCase: 'Simple viewing, printing, and basic documentation'
      };
    
    case 'markdown':
      return {
        supportedFeatures: [
          'Rich text formatting',
          'Code blocks with syntax highlighting',
          'Headers and sections',
          'Table of contents',
          'Links and references',
          'Tables and lists'
        ],
        limitations: [
          'Limited interactive features',
          'Depends on Markdown renderer'
        ],
        bestUseCase: 'Documentation, README files, and web publishing'
      };
    
    case 'html':
      return {
        supportedFeatures: [
          'Full rich formatting',
          'Interactive elements',
          'CSS styling',
          'JavaScript integration',
          'Embedded media'
        ],
        limitations: [
          'Requires web browser',
          'More complex output'
        ],
        bestUseCase: 'Web applications and interactive documentation'
      };
    
    case 'latex':
      return {
        supportedFeatures: [
          'Professional typesetting',
          'Mathematical notation',
          'Academic formatting',
          'Bibliography support'
        ],
        limitations: [
          'Requires LaTeX compiler',
          'Learning curve for editing'
        ],
        bestUseCase: 'Academic papers and professional documentation'
      };
    
    default:
      return {
        supportedFeatures: [],
        limitations: ['Not implemented'],
        bestUseCase: 'Not available'
      };
  }
}