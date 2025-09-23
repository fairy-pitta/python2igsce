// Type definitions for emitters
import { IR } from './ir';

/**
 * Emitter configuration options
 */
export interface EmitterOptions {
  /** Output format */
  format: OutputFormat;
  /** Indent size */
  indentSize: number;
  /** Indent character (space or tab) */
  indentChar: ' ' | '\t';
  /** Indent type */
  indentType?: 'spaces' | 'tabs';
  /** Line ending character */
  lineEnding: '\n' | '\r\n';
  /** Maximum line length */
  maxLineLength?: number;
  /** Include comments in output */
  includeComments: boolean;
  /** Include line numbers in output */
  includeLineNumbers: boolean;
  /** Include debug information in output */
  includeDebugInfo: boolean;
  /** Beautify options */
  beautify: boolean;
  /** Uppercase keywords */
  uppercaseKeywords?: boolean;
  /** Preserve whitespace */
  preserveWhitespace?: boolean;
}

/**
 * Output format
 */
export type OutputFormat =
  | 'plain' // Plain text
  | 'markdown' // Markdown format
  | 'html' // HTML format
  | 'latex'; // LaTeX format

/**
 * Emitter result
 */
export interface EmitResult {
  /** Generated code */
  code: string;
  /** Error messages */
  errors: EmitError[];
  /** Warning messages */
  warnings: EmitWarning[];
  /** Output statistics */
  stats: EmitStats;
  /** Success flag */
  success: boolean;
  /** Emit time */
  emitTime: number;
  /** Output code */
  output: string;
}

/**
 * Emit error
 */
export interface EmitError {
  /** Error message */
  message: string;
  /** Error type */
  type: EmitErrorType;
  /** Target IR node */
  node?: IR;
  /** Error severity */
  severity: 'error' | 'warning';
}

/**
 * Emit warning
 */
export interface EmitWarning {
  /** Warning message */
  message: string;
  /** Warning type */
  type: EmitWarningType;
  /** Target IR node */
  node?: IR;
}

/**
 * Emit error type
 */
export type EmitErrorType =
  | 'invalid_ir' // Invalid IR
  | 'unsupported_node' // Unsupported node
  | 'formatting_error' // Formatting error
  | 'output_error' // Output error
  | 'validation_error'; // Validation error

/**
 * Emit warning type
 */
export type EmitWarningType =
  | 'long_line' // Long line
  | 'deep_nesting' // Deep nesting
  | 'complex_expression' // Complex expression
  | 'style_issue'; // Style issue

/**
 * Emit statistics
 */
export interface EmitStats {
  /** Number of output lines */
  linesGenerated: number;
  /** Number of output lines (test alias) */
  lineCount: number;
  /** Number of output characters */
  charactersGenerated: number;
  /** Number of output characters (test alias) */
  characterCount: number;
  /** Number of processed IR nodes */
  nodesProcessed: number;
  /** Emit time (milliseconds) */
  emitTime: number;
  /** Processing time (test alias) */
  processingTime: number;
  /** Maximum nesting depth */
  maxNestingDepth: number;
  /** Maximum line length */
  maxLineLength: number;
}

/**
 * Indent information
 */
export interface IndentInfo {
  /** Current indent level */
  level: number;
  /** Indent string */
  string: string;
  /** Next level indent string */
  next: string;
}

/**
 * Formatter configuration
 */
export interface FormatterConfig {
  /** Uppercase keywords */
  uppercaseKeywords: boolean;
  /** Space around operators */
  spaceAroundOperators: boolean;
  /** Space after comma */
  spaceAfterComma: boolean;
  /** Space inside parentheses */
  spaceInsideParentheses: boolean;
  /** Insert blank lines */
  insertBlankLines: boolean;
  /** Wrap long lines */
  wrapLongLines: boolean;
}

/**
 * Output context
 */
export interface EmitContext {
  /** Current indent information */
  indent: IndentInfo;
  /** Output buffer */
  output: string[];
  /** Current line number */
  currentLine: number;
  /** Error list */
  errors: EmitError[];
  /** Warning list */
  warnings: EmitWarning[];
  /** Formatter configuration */
  formatter: FormatterConfig;
  /** Currently processing IR node */
  currentNode?: IR;
}

/**
 * Template information
 */
export interface Template {
  /** Template name */
  name: string;
  /** Template content */
  content: string;
  /** Variable placeholders */
  variables: string[];
}

/**
 * Markdown output configuration
 */
export interface MarkdownConfig {
  /** Code block language specification */
  codeBlockLanguage: string;
  /** Heading level */
  headingLevel: number;
  /** Include description */
  includeDescription: boolean;
  /** Generate table of contents */
  generateToc: boolean;
}

/**
 * HTML output configuration
 */
export interface HtmlConfig {
  /** CSS class name prefix */
  cssPrefix: string;
  /** Use inline styles */
  useInlineStyles: boolean;
  /** Syntax highlighting */
  syntaxHighlight: boolean;
  /** Show line numbers */
  showLineNumbers: boolean;
}

/**
 * LaTeX output configuration
 */
export interface LatexConfig {
  /** Package list */
  packages: string[];
  /** Font configuration */
  fontFamily: string;
  /** Code block environment */
  codeEnvironment: string;
  /** Math mode */
  mathMode: boolean;
}

/**
 * Emitter helper functions
 */
export function createEmitError(
  message: string,
  type: EmitErrorType,
  node?: IR,
  severity: 'error' | 'warning' = 'error'
): EmitError {
  const error: EmitError = {
    message,
    type,
    severity,
  };
  if (node !== undefined) error.node = node;
  return error;
}

export function createEmitWarning(message: string, type: EmitWarningType, node?: IR): EmitWarning {
  const warning: EmitWarning = {
    message,
    type,
  };
  if (node !== undefined) warning.node = node;
  return warning;
}

export function createIndentInfo(
  level: number,
  indentChar: ' ' | '\t',
  indentSize: number
): IndentInfo {
  const unit = indentChar.repeat(indentSize);
  const string = unit.repeat(level);
  const next = unit.repeat(level + 1);

  return {
    level,
    string,
    next,
  };
}

export function getDefaultEmitterOptions(): EmitterOptions {
  return {
    format: 'plain',
    indentSize: 2,
    indentChar: ' ',
    lineEnding: '\n',
    maxLineLength: 80,
    includeComments: true,
    includeLineNumbers: false,
    includeDebugInfo: false,
    beautify: true,
  };
}

export function getDefaultFormatterConfig(): FormatterConfig {
  return {
    uppercaseKeywords: true,
    spaceAroundOperators: true,
    spaceAfterComma: true,
    spaceInsideParentheses: false,
    insertBlankLines: false,
    wrapLongLines: true,
  };
}
