import { IR, IRKind, IRMeta, createIR } from '../types/ir';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';
import { ParseResult, ASTNode } from '../types/parser';
import { ControlFlowHandler } from './handlers/control-flow-handler';
import { AssignmentHandler } from './handlers/assignment-handler';
import { FunctionCallHandler } from './handlers/function-call-handler';
import { SimpleStatementsHandler } from './handlers/simple-statements-handler';
import { UtilityHandler } from './handlers/utility-handler';

/**
 * 文の処理を担当するビジタークラス
 */
export class StatementVisitor extends BaseParser {
  /**
   * パースの実行（StatementVisitorでは使用しない）
   */
  parse(_source: string): ParseResult {
    throw new Error('StatementVisitor.parse() should not be called directly');
  }
  private expressionVisitor: ExpressionVisitor;
  private controlFlowHandler: ControlFlowHandler;
  private assignmentHandler: AssignmentHandler;
  private functionCallHandler: FunctionCallHandler;
  private simpleStatementsHandler: SimpleStatementsHandler;
  private utilityHandler: UtilityHandler;
  public visitNode: ((node: ASTNode) => IR) | undefined;

  constructor() {
    super();
    this.expressionVisitor = new ExpressionVisitor();
    this.controlFlowHandler = new ControlFlowHandler(this.expressionVisitor);
    this.assignmentHandler = new AssignmentHandler(this.expressionVisitor);
    this.functionCallHandler = new FunctionCallHandler(this.expressionVisitor);
    this.simpleStatementsHandler = new SimpleStatementsHandler(this.expressionVisitor);
    this.utilityHandler = new UtilityHandler();
  }

  /**
   * コンテキストを設定
   */
  setContext(context: any): void {
    this.context = context;
    this.controlFlowHandler.setContext(context);
    this.assignmentHandler.setContext(context);
    this.functionCallHandler.setContext(context);
    this.simpleStatementsHandler.setContext(context);
    this.utilityHandler.setContext(context);
  }

  /**
   * 代入文の処理
   */
  visitAssign(node: ASTNode): IR {
    this.assignmentHandler.visitNode = this.visitNode;
    return this.assignmentHandler.visitAssign(node);
  }



  /**
   * 拡張代入文の処理
   */
  visitAugAssign(node: ASTNode): IR {
    this.assignmentHandler.visitNode = this.visitNode;
    return this.assignmentHandler.visitAugAssign(node);
  }

  /**
   * 型注釈付き代入文の処理 (items: list[str] = [])
   */
  visitAnnAssign(node: ASTNode): IR {
    this.assignmentHandler.visitNode = this.visitNode;
    return this.assignmentHandler.visitAnnAssign(node);
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
    this.controlFlowHandler.visitNode = this.visitNode;
    return this.controlFlowHandler.visitFor(node);
  }

  /**
   * WHILE文の処理
   */
  visitWhile(node: ASTNode): IR {
    this.controlFlowHandler.visitNode = this.visitNode;
    return this.controlFlowHandler.visitWhile(node);
  }

  /**
   * 関数呼び出し文の処理
   */
  visitCall(node: ASTNode): IR {
    const func = this.expressionVisitor.visitExpression(node.func);
    const args = node.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // 組み込み関数の変換
    if (func === 'print') {
      const text = `OUTPUT ${args.join(', ')}`;
      return this.createIRNode('output', text);
    }
    
    if (func === 'input') {
      const prompt = args.length > 0 ? args[0] : '';
      const text = prompt ? `INPUT ${prompt}` : 'INPUT';
      return this.createIRNode('input', text);
    }
    
    // 通常の関数呼び出し（CALLキーワードを追加）
    const capitalizedFunc = this.utilityHandler.capitalizeFirstLetter(func);
    const text = `CALL ${capitalizedFunc}(${args.join(', ')})`;
    return this.createIRNode('statement', text);
  }

  /**
   * RETURN文の処理
   */
  visitReturn(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitReturn(node);
  }

  /**
   * 式文の処理（関数呼び出しなど）
   */
  visitExpr(node: ASTNode): IR {
    this.functionCallHandler.visitNode = this.visitNode;
    return this.functionCallHandler.visitExpr(node);
  }

  /**
   * コメントの処理
   */
  visitComment(node: ASTNode): IR {
    return this.createIRNode('comment', `// ${node.value}`);
  }

  /**
   * PASS文の処理
   */
  visitPass(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitPass(node);
  }

  /**
   * BREAK文の処理
   */
  visitBreak(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitBreak(node);
  }

  /**
   * CONTINUE文の処理
   */
  visitContinue(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitContinue(node);
  }

  /**
   * IMPORT文の処理
   */
  visitImport(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitImport(node);
  }

  /**
   * TRY文の処理
   */
  visitTry(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitTry(node);
  }

  /**
   * RAISE文の処理
   */
  visitRaise(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitRaise(node);
  }

  /**
   * WITH文の処理
   */
  visitWith(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitWith(node);
  }

  /**
   * ASSERT文の処理
   */
  visitAssert(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitAssert(node);
  }

  /**
   * GLOBAL文の処理
   */
  visitGlobal(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitGlobal(node);
  }

  /**
   * DELETE文の処理
   */
  visitDelete(node: ASTNode): IR {
    return this.simpleStatementsHandler.visitDelete(node);
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }

  // visitNodeはプロパティとして定義済み
}