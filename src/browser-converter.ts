// Browser-compatible converter implementation
import { PythonParser } from './parser';
import { TextEmitter } from './emitter';
import { ConversionOptions, ConversionResult } from './types';
import { IR } from './types/ir';
import { ParserOptions } from './types/parser';
import { EmitterOptions } from './types/emitter';

export interface BrowserConversionOptions {
  /** Debug mode */
  debug?: boolean;
  /** Strict mode */
  strictMode?: boolean;
  /** Include comments */
  includeComments?: boolean;
  /** Preserve whitespace */
  preserveWhitespace?: boolean;
  /** Maximum error count */
  maxErrors?: number;
  /** Timeout */
  timeout?: number;
  /** Output format */
  outputFormat?: 'plain' | 'markdown';
  /** Indent size */
  indentSize?: number;
  /** Indent type */
  indentType?: 'spaces' | 'tabs';
  /** Line ending */
  lineEnding?: '\n' | '\r\n';
  /** Maximum line length */
  maxLineLength?: number;
  /** Beautify */
  beautify?: boolean;
  /** Include line numbers */
  includeLineNumbers?: boolean;
  /** Uppercase keywords */
  uppercaseKeywords?: boolean;
  /** Space around operators */
  spaceAroundOperators?: boolean;
  /** Space after commas */
  spaceAfterCommas?: boolean;
  /** Allow experimental syntax */
  allowExperimentalSyntax?: boolean;
  /** Maximum nesting depth */
  maxNestingDepth?: number;
}

/**
 * Browser-compatible converter class
 */
export class BrowserConverter {
  private options: BrowserConversionOptions;
  private parser: PythonParser;
  private emitter: TextEmitter;

  constructor(options: BrowserConversionOptions = {}) {
    this.options = this.mergeDefaultOptions(options);
    
    // Initialize parser with basic options
    const parserOptions: ParserOptions = {
      strictMode: this.options.strictMode ?? false,
      includeComments: this.options.includeComments ?? true,
      preserveWhitespace: this.options.preserveWhitespace ?? false,
      maxErrors: this.options.maxErrors ?? 100,
      timeout: this.options.timeout ?? 30000
    };
    this.parser = new PythonParser(parserOptions);
    
    // Initialize emitter with basic options
    const emitterOptions: EmitterOptions = {
      format: this.options.outputFormat ?? 'plain',
      indentSize: this.options.indentSize ?? 2,
      lineEnding: this.options.lineEnding ?? '\n',
      indentChar: ' ',
      includeComments: this.options.includeComments ?? true,
      includeLineNumbers: this.options.includeLineNumbers ?? false,
      includeDebugInfo: false,
      beautify: this.options.beautify ?? true
    };
    this.emitter = new TextEmitter(emitterOptions);
  }

  /**
   * Convert Python code to IGCSE Pseudocode
   */
  convertCode(pythonCode: string): ConversionResult {
    const startTime = Date.now();
    
    try {
      // Parse Python code
      const parseResult = this.parser.parse(pythonCode);
      
      if (!parseResult.success || parseResult.errors.length > 0) {
        return this.createErrorResult(
          'Parse failed',
          parseResult.errors,
          parseResult.warnings || [],
          startTime
        );
      }

      // Create program IR node from parsed statements
      const programIR: IR = {
        kind: 'program',
        text: '',
        children: parseResult.ir,
        meta: {
          lineNumber: 1
        }
      };
      
      // Emit IGCSE pseudocode
      const emitResult = this.emitter.emit(programIR);
      
      if (!emitResult.success || emitResult.errors.length > 0) {
        return this.createErrorResult(
          'Emit failed',
          emitResult.errors,
          emitResult.warnings || [],
          startTime
        );
      }

      const endTime = Date.now();
      
      return {
        code: emitResult.code,
        parseResult,
        emitResult,
        success: true,
        stats: {
          inputLines: pythonCode.split('\n').length,
          outputLines: emitResult.code.split('\n').length,
          conversionTime: endTime - startTime,
          parseTime: parseResult.parseTime || 0,
          emitTime: emitResult.emitTime || 0,
          errorCount: parseResult.errors.length + emitResult.errors.length,
          warningCount: parseResult.warnings.length + emitResult.warnings.length,
          totalTime: endTime - startTime
        }
      };
    } catch (error) {
      return this.createErrorResult(
        `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        [],
        startTime
      );
    }
  }

  /**
   * Validate Python syntax
   */
  validateSyntax(pythonCode: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    try {
      const parseResult = this.parser.parse(pythonCode);
      return {
        isValid: parseResult.success && parseResult.errors.length === 0,
        errors: parseResult.errors.map(e => e.message),
        warnings: parseResult.warnings.map(w => w.message)
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Get current options
   */
  getOptions(): BrowserConversionOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<BrowserConversionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  // Error logging is handled by the parent converter

  private mergeDefaultOptions(options: BrowserConversionOptions): BrowserConversionOptions {
    return {
      debug: false,
      strictMode: false,
      includeComments: true,
      preserveWhitespace: false,
      maxErrors: 100,
      timeout: 30000,
      outputFormat: 'plain',
      indentSize: 2,
      indentType: 'spaces',
      lineEnding: '\n',
      maxLineLength: 80,
      beautify: true,
      includeLineNumbers: false,
      uppercaseKeywords: true,
      spaceAroundOperators: true,
      spaceAfterCommas: true,
      allowExperimentalSyntax: false,
      maxNestingDepth: 50,
      ...options
    };
  }

  private createErrorResult(
    _message: string,
    errors: any[],
    warnings: any[],
    startTime: number
  ): ConversionResult {
    const endTime = Date.now();
    
    return {
      code: '',
      success: false,
      parseResult: {
        ir: [],
        errors: errors.map(e => typeof e === 'string' ? { message: e, type: 'syntax_error' as const, severity: 'error' as const } : e),
        warnings: warnings.map(w => typeof w === 'string' ? { message: w, type: 'style_suggestion' as const } : w),
        stats: {
          linesProcessed: 0,
          nodesGenerated: 0,
          parseTime: 0,
          functionsFound: 0,
          classesFound: 0,
          variablesFound: 0
        },
        success: false,
        parseTime: 0
      },
      emitResult: {
        code: '',
        errors: [],
        warnings: [],
        stats: {
          linesGenerated: 0,
          lineCount: 0,
          charactersGenerated: 0,
          characterCount: 0,
          nodesProcessed: 0,
          emitTime: 0,
          processingTime: 0,
          maxNestingDepth: 0,
          maxLineLength: 0
        },
        success: false,
        emitTime: 0,
        output: ''
      },
      stats: {
        inputLines: 0,
        outputLines: 0,
        conversionTime: endTime - startTime,
        parseTime: 0,
        emitTime: 0,
        errorCount: errors.length,
        warningCount: warnings.length,
        totalTime: endTime - startTime
      }
    };
  }
}

/**
 * Utility function for browser conversion
 */
export function convertPythonToIGCSE(
  pythonCode: string,
  options: BrowserConversionOptions = {}
): ConversionResult {
  const converter = new BrowserConverter(options);
  return converter.convertCode(pythonCode);
}

// Re-export types for convenience
export type { ConversionOptions, ConversionResult };
export type { IR };