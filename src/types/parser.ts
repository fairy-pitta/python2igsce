// Parser-related type definitions
import { IR } from './ir';
import { IGCSEDataType } from './igcse';

/**
 * Parser configuration options
 */
export interface ParserOptions {
  /** Enable debug mode */
  debug?: boolean;
  /** Strict type checking */
  strictTypes?: boolean;
  /** Strict mode */
  strictMode?: boolean;
  /** Preserve comments */
  preserveComments?: boolean;
  /** Include comments */
  includeComments?: boolean;
  /** Preserve whitespace */
  preserveWhitespace?: boolean;
  /** Indent size */
  indentSize?: number;
  /** Maximum nesting depth */
  maxDepth?: number;
  /** Maximum number of errors */
  maxErrors?: number;
  /** Timeout (milliseconds) */
  timeout?: number;
}

/**
 * Parser result
 */
export interface ParseResult {
  /** Generated IR */
  ir: IR[];
  /** Error messages */
  errors: ParseError[];
  /** Warning messages */
  warnings: ParseWarning[];
  /** Parse statistics */
  stats: ParseStats;
}

/**
 * Parse error
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Error type */
  type: ParseErrorType;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
  /** Error severity */
  severity: 'error' | 'warning';
}

/**
 * Parse warning
 */
export interface ParseWarning {
  /** Warning message */
  message: string;
  /** Warning type */
  type: ParseWarningType;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
}

/**
 * Parse error types
 */
export type ParseErrorType = 
  | 'syntax_error'        // Syntax error
  | 'type_error'          // Type error
  | 'name_error'          // Name error
  | 'unsupported_feature' // Unsupported feature
  | 'conversion_error'    // Conversion error
  | 'validation_error';   // Validation error

/**
 * Parse warning types
 */
export type ParseWarningType = 
  | 'type_inference'      // Type inference
  | 'implicit_conversion' // Implicit conversion
  | 'deprecated_syntax'   // Deprecated syntax
  | 'performance_hint'    // Performance hint
  | 'style_suggestion';   // Style suggestion

/**
 * Parse statistics
 */
export interface ParseStats {
  /** Number of lines processed */
  linesProcessed: number;
  /** Number of generated IR nodes */
  nodesGenerated: number;
  /** Parse time (milliseconds) */
  parseTime: number;
  /** Number of functions detected */
  functionsFound: number;
  /** Number of classes detected */
  classesFound: number;
  /** Number of variables detected */
  variablesFound: number;
}

/**
 * Variable information
 */
export interface VariableInfo {
  /** Variable name */
  name: string;
  /** Data type */
  type: IGCSEDataType;
  /** Scope */
  scope: string;
  /** Whether initialized */
  initialized: boolean;
  /** Line number where defined */
  definedAt?: number | undefined;
}

/**
 * Function information
 */
export interface FunctionInfo {
  /** Function name */
  name: string;
  /** Parameter list */
  parameters: ParameterInfo[];
  /** Return type */
  returnType?: IGCSEDataType | undefined;
  /** Function or procedure */
  isFunction: boolean;
  /** Has return value */
  hasReturn: boolean;
  /** Line number where defined */
  definedAt?: number | undefined;
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  /** Parameter name */
  name: string;
  /** Data type */
  type: IGCSEDataType;
  /** Default value */
  defaultValue?: string;
  /** Whether passed by reference */
  byReference?: boolean;
}

/**
 * Scope information
 */
export interface ScopeInfo {
  /** Scope name */
  name: string;
  /** Parent scope */
  parent?: ScopeInfo;
  /** Variable list */
  variables: Map<string, VariableInfo>;
  /** Function list */
  functions: Map<string, FunctionInfo>;
  /** Scope type */
  type: ScopeType;
}

/**
 * Scope types
 */
export type ScopeType = 
  | 'global'     // Global scope
  | 'function'   // Function scope
  | 'class'      // Class scope
  | 'block'      // Block scope
  | 'while'      // While loop scope
  | 'for';       // For loop scope

/**
 * Position information
 */
export interface Position {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
}

/**
 * Range information
 */
export interface Range {
  /** Start position */
  start: Position;
  /** End position */
  end: Position;
}

/**
 * Source location
 */
export interface SourceLocation {
  /** File name */
  filename?: string;
  /** Range */
  range: Range;
}

/**
 * Parser context
 */
export interface ParserContext {
  /** Current scope */
  currentScope: ScopeInfo;
  /** Scope stack */
  scopeStack: ScopeInfo[];
  /** Current function */
  currentFunction?: FunctionInfo;
  /** Current class */
  currentClass?: string;
  /** Indent level */
  indentLevel: number;
  /** Error list */
  errors: ParseError[];
  /** Warning list */
  warnings: ParseWarning[];
  /** Array information */
  arrayInfo: { [key: string]: { size: number; elementType: string; currentIndex: number } };
  /** Parameter mapping (for constructors) */
  parameterMapping: { [key: string]: string };
  /** Class definition information */
  classDefinitions?: { [key: string]: any };
  /** Parse start time */
  startTime: number;
  /** Method to determine if it's a class */
  isClass: (name: string) => boolean;
}

/**
 * Parser helper functions
 */
export function createParseError(
  message: string,
  type: ParseErrorType,
  line?: number,
  column?: number,
  severity: 'error' | 'warning' = 'error'
): ParseError {
  const error: ParseError = {
    message,
    type,
    severity
  };
  if (line !== undefined) error.line = line;
  if (column !== undefined) error.column = column;
  return error;
}

export function createParseWarning(
  message: string,
  type: ParseWarningType,
  line?: number,
  column?: number
): ParseWarning {
  const warning: ParseWarning = {
    message,
    type
  };
  if (line !== undefined) warning.line = line;
  if (column !== undefined) warning.column = column;
  return warning;
}

export function createPosition(line: number, column: number): Position {
  return { line, column };
}

export function createRange(start: Position, end: Position): Range {
  return { start, end };
}