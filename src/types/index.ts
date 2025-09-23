// Type definition exports

// IR-related types
export * from './ir';

// IGCSE Pseudocode-related types
export * from './igcse';

// Parser-related types
export * from './parser';

// Emitter-related types
export * from './emitter';

// Common utility types
export interface ConversionOptions {
  /** Parser options */
  parser?: import('./parser').ParserOptions;
  /** Emitter options */
  emitter?: import('./emitter').EmitterOptions;
  /** Debug mode */
  debug?: boolean;
  /** Output file name */
  outputFile?: string;
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
  /** Parser type */
  parserType?: string;
  /** Emitter type */
  emitterType?: string;
}

export interface ConversionResult {
  /** Converted code */
  code: string;
  /** Parse result */
  parseResult: import('./parser').ParseResult;
  /** Emit result */
  emitResult: import('./emitter').EmitResult;
  /** Conversion statistics */
  stats: ConversionStats;
  /** Parsed AST (for debugging) */
  ast?: any;
  /** Intermediate representation (IR) tree */
  ir?: import('./ir').IR[];
  /** Success flag */
  success: boolean;
}

export interface ConversionStats {
  /** Input line count */
  inputLines: number;
  /** Output line count */
  outputLines: number;
  /** Conversion time (milliseconds) */
  conversionTime: number;
  /** Parse time (milliseconds) */
  parseTime: number;
  /** Emit time (milliseconds) */
  emitTime: number;
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Total time */
  totalTime: number;
}

// Version information
export const VERSION = '1.0.0';
export const SUPPORTED_PYTHON_VERSION = '3.x';
export const IGCSE_SPEC_VERSION = '2024';
