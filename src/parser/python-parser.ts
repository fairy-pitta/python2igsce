// メインのPythonパーサークラス
import { PythonASTVisitor } from './visitor';
import { ParserOptions, ParseResult } from '../types/parser';
import { IR } from '../types/ir';

/**
 * PythonからIGCSE Pseudocodeへの変換パーサー
 */
export class PythonParser extends PythonASTVisitor {
  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * Pythonソースコードをパースしてイルに変換
   */
  override parse(source: string): ParseResult {
    this.debug('Starting Python parse...');
    
    // 前処理
    const preprocessedSource = this.preprocess(source);
    
    // パース実行
    const result = super.parse(preprocessedSource);
    
    // 後処理
    const postprocessedIR = this.postprocess(result.ir);
    
    this.debug(`Parse completed. Nodes: ${result.stats.nodesGenerated}, Errors: ${result.errors.length}`);
    
    return {
      ...result,
      ir: postprocessedIR
    };
  }

  /**
   * ソースコードの前処理
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
  private postprocess(ir: IR): IR {
    // IRの最適化
    const optimized = this.optimizeIR(ir);
    
    // 検証
    this.validateIR(optimized);
    
    return optimized;
  }

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
   * IRの検証
   */
  private validateIR(ir: IR): void {
    this.validateNode(ir);
  }

  /**
   * 個別ノードの検証
   */
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

  /**
   * 特定ノード種別の検証
   */
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

  /**
   * パーサーの統計情報を取得
   */
  getStats(): {
    totalVariables: number;
    totalFunctions: number;
    totalScopes: number;
    maxNestingDepth: number;
  } {
    return {
      totalVariables: this.countVariables(),
      totalFunctions: this.countFunctions(),
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
      for (const [name, variable] of scope.variables) {
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
      for (const [name, func] of scope.functions) {
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