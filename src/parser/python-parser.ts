// Main Python parser class
import { BaseParser } from './base-parser';
import { ParserOptions, ParseResult } from '../types/parser';
import { IR, countIRNodes } from '../types/ir';
import { PythonASTVisitor } from './visitor';

/**
 * Parser for converting Python to IGCSE Pseudocode
 */
export class PythonParser extends BaseParser {
  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * Parse Python source code and convert to IR
   */
  override parse(source: string): ParseResult {
    this.resetContext();

    const preprocessedSource = this.preprocessSource(source);

    const result = this.parseToIR(preprocessedSource);

    // Update statistics
    result.stats.parseTime = Date.now() - this.context.startTime;

    return result;
  }

  /**
   * Parse to IR
   */
  private parseToIR(source: string): ParseResult {
    this.context.startTime = Date.now();

    // Preprocess source code
    const processedSource = this.preprocessSource(source);

    // Convert AST to IR using PythonASTVisitor
    const visitor = new PythonASTVisitor();
    const visitorResult = visitor.parse(processedSource);

    const parseTime = Date.now() - this.context.startTime;

    const result: ParseResult = {
      ir: visitorResult.ir,
      errors: [...this.context.errors, ...visitorResult.errors],
      warnings: [...this.context.warnings, ...visitorResult.warnings],
      stats: {
        parseTime,
        linesProcessed: processedSource.split('\n').length,
        nodesGenerated: Array.isArray(visitorResult.ir)
          ? visitorResult.ir.reduce((sum, node) => sum + countIRNodes(node), 0)
          : countIRNodes(visitorResult.ir),
        functionsFound: Array.isArray(visitorResult.ir)
          ? visitorResult.ir.reduce((sum, node) => sum + this.countFunctionsFromIR(node), 0)
          : this.countFunctionsFromIR(visitorResult.ir),
        classesFound: Array.isArray(visitorResult.ir)
          ? visitorResult.ir.reduce((sum, node) => sum + this.countClassesFromIR(node), 0)
          : this.countClassesFromIR(visitorResult.ir),
        variablesFound: Array.isArray(visitorResult.ir)
          ? visitorResult.ir.reduce((sum, node) => sum + this.countVariablesFromIR(node), 0)
          : this.countVariablesFromIR(visitorResult.ir),
      },
      success: this.context.errors.length === 0 && visitorResult.errors.length === 0,
      parseTime,
    };

    return result;
  }

  /**
   * Preprocess source code
   */
  private preprocessSource(source: string): string {
    return this.preprocess(source);
  }

  /**
   * Count functions from IR
   */
  private countFunctionsFromIR(ir: IR): number {
    let count = 0;
    if (ir.kind === 'function' || ir.kind === 'procedure') {
      count = 1;
    }
    if (ir.children) {
      for (const child of ir.children) {
        count += this.countFunctionsFromIR(child);
      }
    }
    return count;
  }

  /**
   * Count classes from IR
   */
  private countClassesFromIR(ir: IR): number {
    let count = 0;
    if (ir.kind === 'class') {
      count = 1;
    }
    if (ir.children) {
      for (const child of ir.children) {
        count += this.countClassesFromIR(child);
      }
    }
    return count;
  }

  /**
   * Count variables from IR
   */
  private countVariablesFromIR(ir: IR): number {
    let count = 0;
    if (ir.kind === 'assign' && ir.meta?.name) {
      count = 1;
    }
    if (ir.children) {
      for (const child of ir.children) {
        count += this.countVariablesFromIR(child);
      }
    }
    return count;
  }

  /**
   * Preprocess source code (internal implementation)
   */
  private preprocess(source: string): string {
    let processed = source;

    // Normalize empty lines
    processed = processed.replace(/\r\n/g, '\n');
    processed = processed.replace(/\r/g, '\n');

    // Convert tabs to spaces
    processed = processed.replace(/\t/g, ' '.repeat(this.options.indentSize));

    // Remove trailing whitespace
    processed = processed
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Merge consecutive empty lines into one
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');

    this.debug(`Preprocessed ${source.split('\n').length} lines`);

    return processed;
  }

  /**
   * Post-process IR
   */
  /*
  private postprocess(ir: IR): IR {
    // Optimize IR
    const optimized = this.optimizeIR(ir);
    
    // Validation
    this.validateIR(optimized);
    
    return optimized;
  }
  */

  /**
   * Optimize IR
   */
  private optimizeIR(ir: IR): IR {
    // Recursively optimize child nodes
    const optimizedChildren = ir.children.map((child) => this.optimizeIR(child));

    // Remove empty nodes (but preserve statement nodes with children)
    const filteredChildren = optimizedChildren.filter((child) => {
      // Keep nodes with text
      if (child.text.trim() !== '') {
        return true;
      }
      // Keep statement nodes with children
      if (child.kind === 'statement' && child.children.length > 0) {
        return true;
      }
      // Keep important nodes like assign, input, output, if, for, while
      if (
        ['assign', 'input', 'output', 'if', 'for', 'while', 'function', 'class'].includes(
          child.kind
        )
      ) {
        return true;
      }
      // Remove other empty nodes
      return false;
    });

    // Merge consecutive comments
    const mergedChildren = this.mergeConsecutiveComments(filteredChildren);

    return {
      ...ir,
      children: mergedChildren,
    };
  }

  /**
   * Merge consecutive comments
   */
  private mergeConsecutiveComments(children: IR[]): IR[] {
    const result: IR[] = [];
    let currentCommentGroup: IR[] = [];

    for (const child of children) {
      if (child.kind === 'comment') {
        currentCommentGroup.push(child);
      } else {
        // Process comment groups
        if (currentCommentGroup.length > 0) {
          if (currentCommentGroup.length === 1) {
            result.push(currentCommentGroup[0]);
          } else {
            // Merge multiple comments into one
            const mergedText = currentCommentGroup.map((comment) => comment.text).join('\n');
            result.push({
              ...currentCommentGroup[0],
              text: mergedText,
            });
          }
          currentCommentGroup = [];
        }

        result.push(child);
      }
    }

    // Process last comment group
    if (currentCommentGroup.length > 0) {
      if (currentCommentGroup.length === 1) {
        result.push(currentCommentGroup[0]);
      } else {
        const mergedText = currentCommentGroup.map((comment) => comment.text).join('\n');
        result.push({
          ...currentCommentGroup[0],
          text: mergedText,
        });
      }
    }

    return result;
  }

  /**
   * Validate IR (temporarily disabled)
   */
  /*
  private validateIR(ir: IR): void {
    this.validateNode(ir);
  }

  private validateNode(node: IR): void {
    // Validate required fields
    if (!node.kind) {
      this.addError('IR node missing kind', 'validation_error');
    }
    
    if (node.text === undefined) {
      this.addError('IR node missing text', 'validation_error');
    }
    
    // Validate child nodes
    if (node.children) {
      for (const child of node.children) {
        this.validateNode(child);
      }
    }
    
    // 特定のノード種別の検証
    this.validateSpecificNode(node);
  }

  private validateSpecificNode(node: IR): void {
    switch (node.kind) {
      case 'assign':
        if (!node.meta?.name) {
          this.addWarning(
            'Assignment node missing variable name',
            'style_suggestion'
          );
        }
        break;
        
      case 'for':
        if (!node.meta?.startValue || !node.meta?.endValue) {
          this.addWarning(
            'FOR loop missing start or end value',
            'style_suggestion'
          );
        }
        break;
        
      case 'function':
      case 'procedure':
        if (!node.meta?.name) {
          this.addError(
            'Function/Procedure node missing name',
            'validation_error'
          );
        }
        break;
        
      case 'if':
        if (!node.meta?.condition) {
          this.addWarning(
            'IF statement missing condition',
            'style_suggestion'
          );
        }
        break;
    }
  }
  */

  /**
   * パーサーの統計情報を取得
   */
  getStats(ir?: IR): {
    totalVariables: number;
    totalFunctions: number;
    totalScopes: number;
    maxNestingDepth: number;
  } {
    return {
      totalVariables: ir ? this.countVariablesFromIR(ir) : 0,
      totalFunctions: ir ? this.countFunctionsFromIR(ir) : 0,
      totalScopes: this.context.scopeStack.length,
      maxNestingDepth: this.context.indentLevel,
    };
  }

  /**
   * 変数の使用状況を分析
   */
  analyzeVariableUsage(): Map<
    string,
    {
      defined: boolean;
      used: boolean;
      type: import('../types/igcse').IGCSEDataType;
      scope: string;
    }
  > {
    const usage = new Map();

    // 全スコープの変数を収集
    for (const scope of this.context.scopeStack) {
      for (const [name, variable] of Array.from(scope.variables.entries())) {
        usage.set(name, {
          defined: true,
          used: false, // Actual usage needs separate analysis
          type: variable.type,
          scope: variable.scope,
        });
      }
    }

    return usage;
  }

  /**
   * 関数の使用状況を分析
   */
  analyzeFunctionUsage(): Map<
    string,
    {
      defined: boolean;
      called: boolean;
      parameters: import('../types/parser').ParameterInfo[];
      returnType?: import('../types/igcse').IGCSEDataType;
    }
  > {
    const usage = new Map();

    // 全スコープの関数を収集
    for (const scope of this.context.scopeStack) {
      for (const [name, func] of Array.from(scope.functions.entries())) {
        usage.set(name, {
          defined: true,
          called: false, // Actual call status needs separate analysis
          parameters: func.parameters,
          returnType: func.returnType,
        });
      }
    }

    return usage;
  }

  /**
   * パーサーの状態をリセット
   */
  reset(): void {
    this.resetContext();
    this.debug('Parser state reset');
  }
}
