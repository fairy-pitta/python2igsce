// Main Python parser class
import { BaseParser } from './base-parser';
import { ParserOptions, ParseResult } from '../types/parser';
import { IR } from '../types/ir';
import { PythonASTVisitor } from './visitor';

/**
 * Parser for converting Python to IGCSE Pseudocode.
 */
export class PythonParser extends BaseParser {
  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * Parses Python source code and converts it to IR.
   */
  override async parse(source: string): Promise<ParseResult> {
    this.reset();
    try {
      // Preprocessing
      const preprocessed = this.preprocessSource(source);
      
      // Parse using the AST visitor
      const visitor = new PythonASTVisitor();
      const result = await visitor.parse(preprocessed);
      
      // Update statistics
      this.updateStatistics(result);
      
      return result;
    } catch (error) {
      console.error('Parse error in PythonParser:', error);
      this.addError(
        `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'syntax_error'
      );
      
      return this.createParseResult([]);
    }
  }



  /**
   * Preprocesses the source code.
   */
  private preprocessSource(source: string): string {
    return this.preprocess(source);
  }



  /**
   * Preprocesses the source code (internal implementation).
   */
  private preprocess(source: string): string {
    let processed = source;
    
    // Normalize empty lines
    processed = processed.replace(/\r\n/g, '\n');
    processed = processed.replace(/\r/g, '\n');
    
    // Convert tabs to spaces
    processed = processed.replace(/\t/g, ' '.repeat(this.options.indentSize));
    
    // Remove trailing whitespace
    processed = processed.split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    
    // Collapse consecutive empty lines into one
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    this.debug(`Preprocessed ${source.split('\n').length} lines`);
    
    return processed;
  }

  /**
   * Postprocesses the IR.
   */
  /*
  private postprocess(ir: IR): IR {
    // Optimize the IR
    const optimized = this.optimizeIR(ir);
    
    // Validate
    this.validateIR(optimized);
    
    return optimized;
  }
  */

  private countIRNodes(node: IR): number {
    let count = 1;
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + this.countIRNodes(child), 0);
    }
    return count;
  }

  /**
   * Optimizes the IR.
   */
  private optimizeIR(ir: IR): IR {
    // Recursively optimize child nodes
    const optimizedChildren = ir.children.map(child => this.optimizeIR(child));
    
    // Remove empty nodes (but keep statement nodes with children)
    const filteredChildren = optimizedChildren
      .filter(child => {
        // Keep nodes with text
        if (child.text.trim() !== '') {
          return true;
        }
        // Keep statement nodes with children
        if (child.kind === 'statement' && child.children.length > 0) {
          return true;
        }
        // Keep important nodes like assign, input, output, if, for, while, etc.
        if (['assign', 'input', 'output', 'if', 'for', 'while', 'function', 'class'].includes(child.kind)) {
          return true;
        }
        // Remove other empty nodes
        return false;
      });
    
    // Merge consecutive comments
    const mergedChildren = this.mergeConsecutiveComments(filteredChildren);
    
    return {
      ...ir,
      children: mergedChildren
    };
  }

  /**
   * Merges consecutive comments.
   */
  private mergeConsecutiveComments(children: IR[]): IR[] {
    const result: IR[] = [];
    let currentCommentGroup: IR[] = [];
    
    for (const child of children) {
      if (child.kind === 'comment') {
        currentCommentGroup.push(child);
      } else {
        // Process the comment group
        if (currentCommentGroup.length > 0) {
          if (currentCommentGroup.length === 1) {
            result.push(currentCommentGroup[0]);
          } else {
            // Merge multiple comments into one
            const mergedText = currentCommentGroup
              .map(comment => comment.text)
              .join('\n');
            result.push({
              ...currentCommentGroup[0],
              text: mergedText
            });
          }
          currentCommentGroup = [];
        }
        
        result.push(child);
      }
    }
    
    // Process the last comment group
    if (currentCommentGroup.length > 0) {
      if (currentCommentGroup.length === 1) {
        result.push(currentCommentGroup[0]);
      } else {
        const mergedText = currentCommentGroup
          .map(comment => comment.text)
          .join('\n');
        result.push({
          ...currentCommentGroup[0],
          text: mergedText
        });
      }
    }
    
    return result;
  }

  /**
   * Validates the IR (temporarily disabled).
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
    
    // 子ノードの検証
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
      maxNestingDepth: this.context.indentLevel
    };
  }

  /**
   * 変数の使用状況を分析
   */
  analyzeVariableUsage(): Map<string, {
    defined: boolean;
    used: boolean;
    type: import('../types/igcse').IGCSEDataType;
    scope: string;
  }> {
    const usage = new Map();
    
    // 全スコープの変数を収集
    for (const scope of this.context.scopeStack) {
      for (const [name, variable] of Array.from(scope.variables.entries())) {
        usage.set(name, {
          defined: true,
          used: false, // 実際の使用状況は別途分析が必要
          type: variable.type,
          scope: variable.scope
        });
      }
    }
    
    return usage;
  }

  /**
   * 関数の使用状況を分析
   */
  analyzeFunctionUsage(): Map<string, {
    defined: boolean;
    called: boolean;
    parameters: import('../types/parser').ParameterInfo[];
    returnType?: import('../types/igcse').IGCSEDataType;
  }> {
    const usage = new Map();
    
    // 全スコープの関数を収集
    for (const scope of this.context.scopeStack) {
      for (const [name, func] of Array.from(scope.functions.entries())) {
        usage.set(name, {
          defined: true,
          called: false, // 実際の呼び出し状況は別途分析が必要
          parameters: func.parameters,
          returnType: func.returnType
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

  /**
   * 統計情報を更新
   */
  private updateStatistics(_result: ParseResult): void {
    // 統計情報の更新処理
  }

  /**
   * IRから関数数をカウント
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
   * IRから変数数をカウント
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
   * パース結果を作成
   */
  protected override createParseResult(ir: IR[]): ParseResult {
    return {
      ir,
      errors: this.context.errors,
      warnings: this.context.warnings,
      stats: {
        parseTime: 0,
        linesProcessed: 0,
        nodesGenerated: 0,
        functionsFound: 0,
        classesFound: 0,
        variablesFound: 0
      }
    };
  }
}