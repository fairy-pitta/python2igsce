import { IR, IRKind, IRMeta, createIR } from '../../types/ir';
import { ASTNode } from '../../types/parser';
import { ExpressionVisitor } from '../expression-visitor';
import { BaseParser } from '../base-parser';
import { UtilityHandler } from './utility-handler';

/**
 * 関数呼び出しの処理を担当するハンドラー
 */
export class FunctionCallHandler extends BaseParser {
  private expressionVisitor: ExpressionVisitor;
  private utilityHandler: UtilityHandler;
  public visitNode: ((node: ASTNode) => IR) | undefined;

  constructor(expressionVisitor: ExpressionVisitor) {
    super();
    this.expressionVisitor = expressionVisitor;
    this.utilityHandler = new UtilityHandler();
  }

  /**
   * コンテキストの設定
   */
  setContext(_context: any): void {
    // 必要に応じてコンテキストを設定
  }

  /**
   * パース処理（ハンドラーでは使用しない）
   */
  parse(_source: string): any {
    throw new Error('FunctionCallHandler does not implement parse method');
  }

  /**
   * 式文の処理（関数呼び出しなど）
   */
  visitExpr(node: ASTNode): IR {
    // print()関数の特別処理
    if (node.value.type === 'Call' && 
        node.value.func.type === 'Name' && 
        node.value.func.id === 'print') {
      return this.handlePrintCall(node.value);
    }
    
    // input()関数の特別処理（単独で使用された場合）
    if (node.value.type === 'Call' && 
        node.value.func.type === 'Name' && 
        node.value.func.id === 'input') {
      return this.handleStandaloneInputCall(node.value);
    }
    
    // メソッド呼び出しの処理
    if (node.value.type === 'Call' && node.value.func.type === 'Attribute') {
      return this.handleMethodCall(node.value);
    }
    
    // 通常の関数呼び出し
    if (node.value.type === 'Call') {
      return this.handleFunctionCall(node.value);
    }
    
    // その他の式
    const exprText = this.expressionVisitor.visitExpression(node.value);
    return this.createIRNode('statement', exprText);
  }

  /**
   * print()関数の処理
   */
  private handlePrintCall(node: ASTNode): IR {
    const args = node.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    const outputText = `OUTPUT ${args.join(', ')}`;
    return this.createIRNode('output', outputText);
  }

  /**
   * 単独で使用されたinput()関数の処理
   */
  private handleStandaloneInputCall(node: ASTNode): IR {
    if (node.args.length > 0) {
      const prompt = this.expressionVisitor.visitExpression(node.args[0]);
      return this.createIRNode('output', `OUTPUT ${prompt}`);
    }
    return this.createIRNode('comment', '// Standalone input() call');
  }

  /**
   * メソッド呼び出しの処理
   */
  private handleMethodCall(node: ASTNode): IR {
    const object = this.expressionVisitor.visitExpression(node.func.value);
    const method = node.func.attr;
    const args = node.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // 特殊なメソッド処理（append, pop, etc.）
    if (method === 'append') {
      return this.handleArrayAppend(object, args[0]);
    }
    
    if (method === 'pop') {
      return this.handleArrayPop(object, args.length > 0 ? args[0] : null);
    }
    
    // 通常のメソッド呼び出し
    const callText = `${object}.${method}(${args.join(', ')})`;
    return this.createIRNode('statement', callText);
  }

  /**
   * 通常の関数呼び出しの処理
   */
  private handleFunctionCall(node: ASTNode): IR {
    const funcName = this.expressionVisitor.visitExpression(node.func);
    const args = node.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // 特殊な関数処理（len, etc.）
    if (funcName === 'len') {
      return this.handleLenFunction(args[0]);
    }
    
    // 関数名を大文字化（最初の文字のみ）
    const capitalizedFuncName = this.utilityHandler.capitalizeFirstLetter(funcName);
    
    // プロシージャ呼び出しとしてCALLキーワードを追加
    const callText = `CALL ${capitalizedFuncName}(${args.join(', ')})`;
    return this.createIRNode('statement', callText);
  }

  /**
   * 配列のappendメソッドの処理
   */
  private handleArrayAppend(arrayName: string, value: string): IR {
    // コンテキストから配列情報を取得
    let currentIndex = 0;
    if (this.context && this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
      currentIndex = this.context.arrayInfo[arrayName].currentIndex || 0;
      this.context.arrayInfo[arrayName].currentIndex = currentIndex + 1;
    }
    
    const assignText = `${arrayName}[${currentIndex + 1}] ← ${value}`;
    return this.createIRNode('assign', assignText);
  }

  /**
   * 配列のpopメソッドの処理
   */
  private handleArrayPop(arrayName: string, index: string | null): IR {
    // コンテキストから配列情報を取得
    let currentIndex = 0;
    if (this.context && this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
      currentIndex = this.context.arrayInfo[arrayName].currentIndex || 0;
      if (currentIndex > 0) {
        this.context.arrayInfo[arrayName].currentIndex = currentIndex - 1;
      }
    }
    
    // インデックスが指定されていない場合は最後の要素を削除
    const commentText = `// ${arrayName}.pop(${index ? index : ''})`;
    return this.createIRNode('comment', commentText);
  }

  /**
   * len()関数の処理
   */
  private handleLenFunction(arg: string): IR {
    // コンテキストから配列情報を取得
    let size = 0;
    if (this.context && this.context.arrayInfo && this.context.arrayInfo[arg]) {
      size = this.context.arrayInfo[arg].size || 0;
    }
    
    const commentText = `// len(${arg}) = ${size}`;
    return this.createIRNode('comment', commentText);
  }



  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }
}