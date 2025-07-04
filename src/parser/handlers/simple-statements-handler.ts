import { IR, IRKind, IRMeta, createIR } from '../../types/ir';
import { ASTNode } from '../../types/parser';
import { ExpressionVisitor } from '../expression-visitor';
import { BaseParser } from '../base-parser';

/**
 * 単純な文（return, break, continue, import等）の処理を担当するハンドラー
 */
export class SimpleStatementsHandler extends BaseParser {
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
    throw new Error('SimpleStatementsHandler does not implement parse method');
  }

  /**
   * RETURN文の処理
   */
  visitReturn(node: ASTNode): IR {
    if (node.value) {
      const returnValue = this.expressionVisitor.visitExpression(node.value);
      return this.createIRNode('return', `RETURN ${returnValue}`);
    } else {
      return this.createIRNode('return', 'RETURN');
    }
  }

  /**
   * BREAK文の処理
   */
  visitBreak(_node: ASTNode): IR {
    return this.createIRNode('break', 'BREAK');
  }

  /**
   * CONTINUE文の処理
   */
  visitContinue(_node: ASTNode): IR {
    return this.createIRNode('statement', 'CONTINUE');
  }

  /**
   * PASS文の処理
   */
  visitPass(_node: ASTNode): IR {
    return this.createIRNode('comment', '// pass');
  }

  /**
   * IMPORT文の処理
   */
  visitImport(_node: ASTNode): IR {
    // IGCSEでは通常importは使用しないため、コメントとして出力
    return this.createIRNode('comment', `// import statement`);
  }

  /**
   * FROM-IMPORT文の処理
   */
  visitImportFrom(_node: ASTNode): IR {
    // IGCSEでは通常importは使用しないため、コメントとして出力
    return this.createIRNode('comment', `// from-import statement`);
  }

  /**
   * TRY文の処理
   */
  visitTry(_node: ASTNode): IR {
    // IGCSEでは例外処理は通常使用しないため、コメントとして出力
    return this.createIRNode('comment', `// try-except statement`);
  }

  /**
   * RAISE文の処理
   */
  visitRaise(_node: ASTNode): IR {
    return this.createIRNode('comment', `// raise statement`);
  }

  /**
   * WITH文の処理
   */
  visitWith(_node: ASTNode): IR {
    return this.createIRNode('comment', `// with statement`);
  }

  /**
   * ASSERT文の処理
   */
  visitAssert(_node: ASTNode): IR {
    return this.createIRNode('comment', `// assert statement`);
  }

  /**
   * GLOBAL文の処理
   */
  visitGlobal(_node: ASTNode): IR {
    return this.createIRNode('comment', `// global statement`);
  }

  /**
   * NONLOCAL文の処理
   */
  visitNonlocal(_node: ASTNode): IR {
    return this.createIRNode('comment', `// nonlocal statement`);
  }

  /**
   * DELETE文の処理
   */
  visitDelete(_node: ASTNode): IR {
    return this.createIRNode('comment', `// delete statement`);
  }

  /**
   * YIELD文の処理
   */
  visitYield(_node: ASTNode): IR {
    return this.createIRNode('comment', `// yield statement`);
  }

  /**
   * YIELD FROM文の処理
   */
  visitYieldFrom(_node: ASTNode): IR {
    return this.createIRNode('comment', `// yield from statement`);
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }
}