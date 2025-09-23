// Base class for emitters
import { IR } from '../types/ir';
import {
  EmitterOptions,
  EmitResult,
  EmitContext,
  FormatterConfig,
  createEmitError,
  createEmitWarning,
  createIndentInfo,
  getDefaultEmitterOptions,
  getDefaultFormatterConfig,
} from '../types/emitter';

/**
 * Base class for emitters
 * Provides IR to text conversion functionality
 */
export abstract class BaseEmitter {
  protected options: EmitterOptions;
  protected context: EmitContext;
  protected startTime: number = 0;

  constructor(options: Partial<EmitterOptions> = {}) {
    this.options = { ...getDefaultEmitterOptions(), ...options };
    this.context = this.createInitialContext();
  }

  /**
   * Create initial context
   */
  private createInitialContext(): EmitContext {
    return {
      indent: createIndentInfo(0, this.options.indentChar, this.options.indentSize),
      output: [],
      currentLine: 1,
      errors: [],
      warnings: [],
      formatter: getDefaultFormatterConfig(),
    };
  }

  /**
   * Execute emit (abstract method)
   */
  abstract emit(ir: IR): EmitResult;

  /**
   * Add error
   */
  protected addError(
    message: string,
    type: import('../types/emitter').EmitErrorType,
    node?: IR
  ): void {
    const error = createEmitError(message, type, node);
    this.context.errors.push(error);

    if (this.options.includeDebugInfo) {
      console.error(`Emit Error: ${message}`);
    }
  }

  /**
   * Add warning
   */
  protected addWarning(
    message: string,
    type: import('../types/emitter').EmitWarningType,
    node?: IR
  ): void {
    const warning = createEmitWarning(message, type, node);
    this.context.warnings.push(warning);

    if (this.options.includeDebugInfo) {
      console.warn(`Emit Warning: ${message}`);
    }
  }

  /**
   * Increase indent level
   */
  protected increaseIndent(): void {
    this.context.indent = createIndentInfo(
      this.context.indent.level + 1,
      this.options.indentChar,
      this.options.indentSize
    );
  }

  /**
   * Decrease indent level
   */
  protected decreaseIndent(): void {
    if (this.context.indent.level > 0) {
      this.context.indent = createIndentInfo(
        this.context.indent.level - 1,
        this.options.indentChar,
        this.options.indentSize
      );
    }
  }

  /**
   * Output line
   */
  protected emitLine(text: string, indent: boolean = true): void {
    const indentedText = indent ? this.context.indent.string + text : text;

    // Line length check
    if (this.options.maxLineLength && indentedText.length > this.options.maxLineLength) {
      this.addWarning(
        `Line exceeds maximum length (${indentedText.length} > ${this.options.maxLineLength})`,
        'long_line'
      );
    }

    // Output with line numbers
    if (this.options.includeLineNumbers) {
      const lineNumber = this.context.currentLine.toString().padStart(3, ' ');
      this.context.output.push(`${lineNumber}: ${indentedText}`);
    } else {
      this.context.output.push(indentedText);
    }

    this.context.currentLine++;
  }

  /**
   * Output empty line
   */
  protected emitBlankLine(): void {
    this.context.output.push('');
    this.context.currentLine++;
  }

  /**
   * Output comment
   */
  protected emitComment(text: string): void {
    if (this.options.includeComments) {
      this.emitLine(text);
    }
  }

  /**
   * Process IR node (abstract method)
   */
  protected abstract emitNode(node: IR): void;

  /**
   * Process child nodes
   */
  protected emitChildren(node: IR): void {
    for (const child of node.children) {
      this.emitNode(child);
    }
  }

  /**
   * Format text
   */
  protected formatText(text: string): string {
    let formatted = text;

    // Convert operators (Python → IGCSE)
    formatted = this.convertOperators(formatted);

    // Capitalize keywords
    if (this.context.formatter.uppercaseKeywords) {
      formatted = this.uppercaseKeywords(formatted);
    }

    // Space around operators
    if (this.context.formatter.spaceAroundOperators) {
      formatted = this.addSpaceAroundOperators(formatted);
    }

    // Space after comma (excluding inside string literals)
    if (this.context.formatter.spaceAfterComma) {
      formatted = this.addSpaceAfterCommaOutsideStrings(formatted);
    }

    return formatted;
  }

  /**
   * Capitalize keywords
   */
  private uppercaseKeywords(text: string): string {
    const keywords = [
      'IF',
      'THEN',
      'ELSE',
      'ENDIF',
      'FOR',
      'TO',
      'STEP',
      'NEXT',
      'WHILE',
      'ENDWHILE',
      'REPEAT',
      'UNTIL',
      'PROCEDURE',
      'ENDPROCEDURE',
      'FUNCTION',
      'ENDFUNCTION',
      'RETURN',
      'INPUT',
      'OUTPUT',
      'CASE',
      'OF',
      'OTHERWISE',
      'ENDCASE',
      'TYPE',
      'ENDTYPE',
      'CLASS',
      'ENDCLASS',
      'DECLARE',
      'CONSTANT',
      'ARRAY',
      'RECORD',
      'AND',
      'OR',
      'NOT',
      'MOD',
      'DIV',
    ];

    // Protect string literals
    const stringLiterals: string[] = [];
    let result = text.replace(/"([^"]*)"/g, (_, content) => {
      const placeholder = `__STRING_${stringLiterals.length}__`;
      stringLiterals.push(content);
      return `"${placeholder}"`;
    });

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      result = result.replace(regex, keyword);
    }

    // Restore string literals
    result = result.replace(/"__STRING_(\d+)__"/g, (_, index) => {
      return `"${stringLiterals[parseInt(index)]}"`;
    });

    return result;
  }

  /**
   * Convert operators (Python → IGCSE)
   */
  private convertOperators(text: string): string {
    let result = text;

    // Protect comment sections (temporarily replace Python # comments and IGCSE // comments)
    const commentMatches: string[] = [];
    result = result.replace(/(#.*$|\/\/.*$)/gm, (match) => {
      const index = commentMatches.length;
      commentMatches.push(match);
      return `__COMMENT_${index}__`;
    });

    // Protect string literals
    const stringLiterals: string[] = [];
    result = result.replace(/"([^"]*)"/g, (_, content) => {
      const placeholder = `__STRING_${stringLiterals.length}__`;
      stringLiterals.push(content);
      return `"${placeholder}"`;
    });

    // Convert comparison operators (process before assignment operators)
    result = result.replace(/!=/g, '≠');
    result = result.replace(/<=/g, '≤');
    result = result.replace(/>=/g, '≥');
    result = result.replace(/==/g, '=');

    // Convert assignment operators (only = that are not comparison operators)
    // Convert variable = format from line start to ←
    result = result.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/gm, '$1$2 ← ');

    // Convert logical operators
    result = result.replace(/\band\b/gi, 'AND');
    result = result.replace(/\bor\b/gi, 'OR');
    result = result.replace(/\bnot\b/gi, 'NOT');

    // Convert string concatenation (convert + to & on lines containing string literals)
    const lines = result.split('\n');
    result = lines
      .map((line) => {
        // Check if line contains string literals (parts enclosed in " or ')
        if (/["']/.test(line)) {
          // Convert + for string concatenation to &
          return line.replace(/\s*\+\s*/g, ' & ');
        }
        return line;
      })
      .join('\n');

    // Convert arithmetic operators (only // that are not comments)
    result = result.replace(/\s*%\s*/g, ' MOD ');
    result = result.replace(/\s*\/\/\s*/g, ' DIV ');

    // Convert input() function (special handling for assignment statements)
    result = result.replace(/(\w+)\s*←\s*input\(\)/g, 'INPUT $1');
    result = result.replace(/(\w+)\s*←\s*input\(([^)]+)\)/g, 'OUTPUT $2\nINPUT $1');
    // Convert regular input() function
    result = result.replace(/\binput\(\)/g, 'INPUT');
    result = result.replace(/\binput\(([^)]+)\)/g, 'INPUT($1)');

    // Restore string literals
    result = result.replace(/"__STRING_(\d+)__"/g, (_, index) => {
      return `"${stringLiterals[parseInt(index)]}"`;
    });

    // Restore comments (convert # to //, leave // as is)
    commentMatches.forEach((comment, index) => {
      const convertedComment = comment.startsWith('#') ? comment.replace(/^#/, '//') : comment;
      result = result.replace(`__COMMENT_${index}__`, convertedComment);
    });

    return result;
  }

  /**
   * Add space around operators
   */
  private addSpaceAroundOperators(text: string): string {
    const operators = ['←', '=', '≠', '<', '>', '≤', '≥', '+', '-', '*', '/', 'MOD', 'DIV'];

    let result = text;
    for (const op of operators) {
      // Don't process if space already exists
      const regex = new RegExp(`(?<!\\s)${this.escapeRegex(op)}(?!\\s)`, 'g');
      result = result.replace(regex, ` ${op} `);
    }

    // Remove duplicate spaces
    result = result.replace(/\s+/g, ' ');

    return result;
  }

  /**
   * Escape for regular expressions
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Add space after commas outside string literals
   */
  private addSpaceAfterCommaOutsideStrings(text: string): string {
    let result = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';

      // Detect string start/end
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      result += char;

      // Add space after commas outside strings
      if (!inString && char === ',' && i + 1 < text.length && text[i + 1] !== ' ') {
        result += ' ';
      }
    }

    return result;
  }

  /**
   * Create emit result
   */
  protected createEmitResult(): EmitResult {
    const endTime = Date.now();
    const emitTime = endTime - this.startTime;

    const code = this.context.output.join(this.options.lineEnding);
    const linesGenerated = this.context.output.length;
    const charactersGenerated = code.length;

    return {
      code,
      errors: [...this.context.errors],
      warnings: [...this.context.warnings],
      stats: {
        linesGenerated,
        lineCount: linesGenerated, // Alias for testing
        charactersGenerated,
        characterCount: charactersGenerated, // Alias for testing
        nodesProcessed: 0, // Set during implementation
        emitTime,
        processingTime: emitTime, // Alias for testing
        maxNestingDepth: this.context.indent.level,
        maxLineLength: Math.max(...this.context.output.map((line) => line.length), 0),
      },
      success: this.context.errors.length === 0,
      emitTime,
      output: code,
    };
  }

  /**
   * Record emit start time
   */
  protected startEmitting(): void {
    this.startTime = Date.now();
  }

  /**
   * Output debug information
   */
  protected debug(_message: string): void {
    // Debug logging disabled
  }

  /**
   * Reset context
   */
  protected resetContext(): void {
    this.context = this.createInitialContext();
  }

  /**
   * Wrap long lines
   */
  protected wrapLongLine(text: string, maxLength?: number): string[] {
    const limit = maxLength || this.options.maxLineLength || 80;

    if (text.length <= limit) {
      return [text];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= limit) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<EmitterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Update formatter configuration
   */
  updateFormatterConfig(config: Partial<FormatterConfig>): void {
    this.context.formatter = { ...this.context.formatter, ...config };
  }
}
