import { IR, IRKind, IRMeta, createIR } from '../../types/ir';
import { ASTNode } from '../../types/parser';
import { ExpressionVisitor } from '../expression-visitor';
import { BaseParser } from '../base-parser';

/**
 * 制御フロー文（IF、FOR、WHILE）の処理を担当するハンドラー
 */
export class ControlFlowHandler extends BaseParser {
  private expressionVisitor: ExpressionVisitor;
  public visitNode: ((node: ASTNode) => IR) | undefined;

  constructor(expressionVisitor: ExpressionVisitor) {
    super();
    this.expressionVisitor = expressionVisitor;
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
    throw new Error('ControlFlowHandler does not implement parse method');
  }

  /**
   * IF文の処理
   */
  visitIf(node: ASTNode): IR {
    const condition = this.expressionVisitor.visitExpression(node.test);
    const ifText = `IF ${condition} THEN`;
    
    this.enterScope('if', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    let children = bodyChildren;
    
    // ELSE節の処理
    if (node.orelse && node.orelse.length > 0) {
      const firstElse = node.orelse[0];
      
      // 最初の要素がIF文の場合、ELSE IFとして処理
      if (firstElse.type === 'If') {
        const condition = this.expressionVisitor.visitExpression(firstElse.test);
        const elseIfText = `ELSE IF ${condition} THEN`;
        const elseIfIR = this.createIRNode('elseif', elseIfText);
        
        this.enterScope('elseif', 'block');
        this.increaseIndent();
        const elseIfBodyChildren = firstElse.body.map((child: ASTNode) => 
          this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
        );
        this.decreaseIndent();
        this.exitScope();
        
        children = [...bodyChildren, elseIfIR, ...elseIfBodyChildren];
        
        // 再帰的にELSE IF文のorelse節を処理
        if (firstElse.orelse && firstElse.orelse.length > 0) {
          const nestedElseResult = this.visitIf({
            ...firstElse,
            body: [], // bodyは空にして、orelseのみ処理
            test: null // testも不要
          } as ASTNode);
          
          // ネストしたELSE/ELSE IF文の子要素を追加
          if (nestedElseResult.children) {
            children = [...children, ...nestedElseResult.children];
          }
        }
      } else {
        // 通常のELSE節
        const elseIR = this.createIRNode('else', 'ELSE');
        this.enterScope('else', 'block');
        this.increaseIndent();
        const elseChildren = node.orelse.map((child: ASTNode) => 
          this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
        );
        this.decreaseIndent();
        this.exitScope();
        
        children = [...bodyChildren, elseIR, ...elseChildren];
      }
    }
    
    return this.createIRNode('if', ifText, children);
  }

  /**
   * FOR文の処理
   */
  visitFor(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);
    
    // range()関数を使用したfor文の処理
    if (node.iter.type === 'Call' && node.iter.func.id === 'range') {
      return this.handleRangeFor(node, target);
    }
    
    // 配列やリストの直接反復の場合
    if (node.iter.type === 'Name') {
      const arrayName = node.iter.id;
      const indexVar = 'i';
      
      // 配列のサイズを取得（コンテキストから）
      let arraySize = '3'; // デフォルトサイズ
      
      // コンテキストから配列サイズを取得
      if (this.context && this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
        arraySize = this.context.arrayInfo[arrayName].size.toString();
      }
      
      // FOR i ← 1 TO size の形式
      const forText = `FOR ${indexVar} ← 1 TO ${arraySize}`;
      
      this.enterScope('for', 'block');
      this.increaseIndent();
      
      // ボディの処理（target変数を使わずに直接配列要素を参照）
       const bodyChildren = node.body.map((child: ASTNode) => {
         // print(target) を OUTPUT array[i] に変換
         if (child.type === 'Expr' && child.value.type === 'Call' && 
             child.value.func && child.value.func.type === 'Name' && child.value.func.id === 'print' && 
             child.value.args.length === 1 &&
             ((child.value.args[0].type === 'Name' && child.value.args[0].id === target) ||
              (child.value.args[0].type === 'Str' && child.value.args[0].s === target))) {
           return this.createIRNode('output', `OUTPUT ${arrayName}[${indexVar}]`);
         }
         return this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node');
       });
      
      this.decreaseIndent();
      this.exitScope();
      
      const nextIR = this.createIRNode('statement', `NEXT ${indexVar}`);
      bodyChildren.push(nextIR);
      
      return this.createIRNode('for', forText, bodyChildren);
    }
    
    // その他の反復可能オブジェクトの場合
    const iterExpression = this.expressionVisitor.visitExpression(node.iter);
    const forText = `FOR ${target} IN ${iterExpression}`;
    
    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    return this.createIRNode('for', forText, bodyChildren);
  }

  /**
   * WHILE文の処理
   */
  visitWhile(node: ASTNode): IR {
    const condition = this.expressionVisitor.visitExpression(node.test);
    const whileText = `WHILE ${condition} DO`;
    
    this.enterScope('while', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    const endWhileIR = this.createIRNode('statement', 'ENDWHILE');
    bodyChildren.push(endWhileIR);
    
    return this.createIRNode('while', whileText, bodyChildren);
  }

  /**
   * range()関数を使用したFOR文の処理
   */
  private handleRangeFor(node: ASTNode, target: string): IR {
    const args = node.iter.args;
    let startValue = '0';
    let endValue = '0';
    let stepValue = '1';
    
    if (args.length === 1) {
      // range(n)
      endValue = this.expressionVisitor.visitExpression(args[0]);
    } else if (args.length === 2) {
      // range(start, end)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
    } else if (args.length === 3) {
      // range(start, end, step)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
      stepValue = this.expressionVisitor.visitExpression(args[2]);
    }
    
    // 数値定数の場合は最適化
    // ステップが1の場合のみ終了値から1を引く
    if (stepValue === '1') {
      if (this.expressionVisitor.isNumericConstant(args[args.length - 1])) {
        const endNum = this.expressionVisitor.getNumericValue(args[args.length - 1]);
        endValue = (endNum - 1).toString();
      } else {
        endValue = `${endValue} - 1`;
      }
    }
    
    const forText = `FOR ${target} ← ${startValue} TO ${endValue}`;
    
    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    const nextIR = this.createIRNode('statement', `NEXT ${target}`);
    bodyChildren.push(nextIR);
    
    return this.createIRNode('for', forText, bodyChildren);
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }
}