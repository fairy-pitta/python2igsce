// メインのPythonパーサークラス
import { BaseParser } from './base-parser';
import { ParserOptions, ParseResult } from '../types/parser';
import { IR } from '../types/ir';
import { PythonASTVisitor } from './visitor';

/**
 * PythonからIGCSE Pseudocodeへの変換パーサー
 */
export class PythonParser extends BaseParser {
  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * Pythonソースコードをパースしてイルに変換
   */
  override parse(source: string): ParseResult {
    this.resetContext();
    
    const preprocessedSource = this.preprocessSource(source);
    
    const result = this.parseToIR(preprocessedSource);
    
    // 統計情報の更新
    result.stats.parseTime = Date.now() - this.context.startTime;
    
    return result;
  }

  /**
   * IRへのパース処理
   */
  private parseToIR(source: string): ParseResult {
    this.context.startTime = Date.now();
    
    // ソースコードの前処理
    const processedSource = this.preprocessSource(source);
    
    // PythonASTVisitorを使用してASTからIRへ変換
    const visitor = new PythonASTVisitor(this.options);
    const visitorResult = visitor.parse(processedSource);
    
    const parseTime = Date.now() - this.context.startTime;
    
    const result: ParseResult = {
       ir: visitorResult.ir,
       errors: [...this.context.errors, ...visitorResult.errors],
       warnings: [...this.context.warnings, ...visitorResult.warnings],
       stats: {
         parseTime,
         linesProcessed: processedSource.split('\n').length,
         nodesGenerated: this.countNodes(visitorResult.ir),
         functionsFound: this.countFunctionsFromIR(visitorResult.ir),
         classesFound: this.countClassesFromIR(visitorResult.ir),
         variablesFound: this.countVariablesFromIR(visitorResult.ir)
       }
     };
    
    return result;
  }

  /**
   * ソースコードの前処理
   */
  private preprocessSource(source: string): string {
    return this.preprocess(source);
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
   * IRからクラス数をカウント
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
   * ソースコードの前処理（内部実装）
   */
  private preprocess(source: string): string {
    let processed = source;
    
    // 空行の正規化
    processed = processed.replace(/\r\n/g, '\n');
    processed = processed.replace(/\r/g, '\n');
    
    // タブをスペースに変換
    processed = processed.replace(/\t/g, ' '.repeat(this.options.indentSize));
    
    // 末尾の空白を除去
    processed = processed.split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    
    // 連続する空行を1つにまとめる
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    this.debug(`Preprocessed ${source.split('\n').length} lines`);
    
    return processed;
  }

  /**
   * IRの後処理
   */
  /*
  private postprocess(ir: IR): IR {
    // IRの最適化
    const optimized = this.optimizeIR(ir);
    
    // 検証
    this.validateIR(optimized);
    
    return optimized;
  }
  */

  /**
   * IRの最適化
   */
  private optimizeIR(ir: IR): IR {
    // 子ノードを再帰的に最適化
    const optimizedChildren = ir.children.map(child => this.optimizeIR(child));
    
    // 空のノードを除去（ただし、子ノードを持つstatementノードは保持）
    const filteredChildren = optimizedChildren
      .filter(child => {
        // テキストがあるノードは保持
        if (child.text.trim() !== '') {
          return true;
        }
        // statementノードで子ノードがある場合は保持
        if (child.kind === 'statement' && child.children.length > 0) {
          return true;
        }
        // assign, input, output, if, for, while等の重要なノードは保持
        if (['assign', 'input', 'output', 'if', 'for', 'while', 'function', 'class'].includes(child.kind)) {
          return true;
        }
        // その他の空のノードは除去
        return false;
      });
    
    // 連続するコメントをまとめる
    const mergedChildren = this.mergeConsecutiveComments(filteredChildren);
    
    return {
      ...ir,
      children: mergedChildren
    };
  }

  /**
   * 連続するコメントをまとめる
   */
  private mergeConsecutiveComments(children: IR[]): IR[] {
    const result: IR[] = [];
    let currentCommentGroup: IR[] = [];
    
    for (const child of children) {
      if (child.kind === 'comment') {
        currentCommentGroup.push(child);
      } else {
        // コメントグループを処理
        if (currentCommentGroup.length > 0) {
          if (currentCommentGroup.length === 1) {
            result.push(currentCommentGroup[0]);
          } else {
            // 複数のコメントを1つにまとめる
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
    
    // 最後のコメントグループを処理
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
   * IRの検証（一時的に無効化）
   */
  /*
  private validateIR(ir: IR): void {
    this.validateNode(ir);
  }

  private validateNode(node: IR): void {
    // 必須フィールドの検証
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
}