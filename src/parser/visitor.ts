import { IR, IRKind, createIR, IRMeta, countIRNodes } from '../types/ir';
import { BaseParser } from './base-parser';
import { StatementVisitor } from './statement-visitor';
import { DefinitionVisitor } from './definition-visitor';

/**
 * Python ASTノードの基本インターフェース
 */
interface ASTNode {
  type: string;
  lineno?: number;
  col_offset?: number;
  [key: string]: any;
}

/**
 * Python ASTからIRへの変換ビジター
 */
export class PythonASTVisitor extends BaseParser {
  private statementVisitor: StatementVisitor;
  private definitionVisitor: DefinitionVisitor;

  constructor() {
    super();
    this.statementVisitor = new StatementVisitor();
    this.definitionVisitor = new DefinitionVisitor();
    
    // ビジターにコンテキストを共有
    this.statementVisitor.setContext(this.context);
    this.definitionVisitor.setContext(this.context);
  }

  /**
   * メインのパース関数
   */
  parse(source: string): import('../types/parser').ParseResult {
    this.startParsing();
    this.resetContext();
    
    try {
      // 実際の実装では、PythonのASTパーサーを使用
      // ここでは簡易的な実装を提供
      const ast = this.parseToAST(source);
      const ir = this.visitNode(ast);
      
      return this.createParseResult([ir]);
    } catch (error) {
      this.addError(
        `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'syntax_error'
      );
      
      // エラー時は空のIRを返す
      const emptyIR = createIR('statement', '', []);
      return this.createParseResult([emptyIR]);
    }
  }

  /**
   * 簡易的なASTパーサー（実際の実装では外部ライブラリを使用）
   */
  private parseToAST(source: string): ASTNode {
    // 実際の実装では、python-astやpyodideなどを使用
    // ここでは簡易的な実装
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        nodes.push({
          type: 'statement',
          lineno: i + 1,
          value: line
        });
      }
    }
    
    return {
      type: 'Module',
      body: nodes
    };
  }

  /**
   * ASTノードをIRに変換
   */
  visitNode(node: ASTNode): IR {
    if (!node) {
      return createIR('statement', '', []);
    }

    // ビジターにvisitNodeメソッドを設定
    this.statementVisitor.visitNode = this.visitNode.bind(this);
    this.definitionVisitor.visitNode = this.visitNode.bind(this);

    switch (node.type) {
      case 'Module':
        return this.visitModule(node);
      
      // 文の処理を委譲
      case 'Assign':
        return this.statementVisitor.visitAssign(node);
      case 'AugAssign':
        return this.statementVisitor.visitAugAssign(node);
      case 'If':
        return this.statementVisitor.visitIf(node);
      case 'For':
        return this.statementVisitor.visitFor(node);
      case 'While':
        return this.statementVisitor.visitWhile(node);
      case 'Return':
        return this.statementVisitor.visitReturn(node);
      case 'Call':
        return this.statementVisitor.visitCall(node);
      case 'Expr':
        return this.statementVisitor.visitExpr(node);
      case 'Comment':
        return this.statementVisitor.visitComment(node);
      case 'Pass':
        return this.statementVisitor.visitPass(node);
      case 'Break':
        return this.statementVisitor.visitBreak(node);
      case 'Continue':
        return this.statementVisitor.visitContinue(node);
      case 'Import':
      case 'ImportFrom':
        return this.statementVisitor.visitImport(node);
      case 'Try':
        return this.statementVisitor.visitTry(node);
      case 'Raise':
        return this.statementVisitor.visitRaise(node);
      case 'With':
        return this.statementVisitor.visitWith(node);
      case 'Assert':
        return this.statementVisitor.visitAssert(node);
      case 'Global':
      case 'Nonlocal':
        return this.statementVisitor.visitGlobal(node);
      case 'Delete':
        return this.statementVisitor.visitDelete(node);
      
      // 定義の処理を委譲
      case 'FunctionDef':
        return this.definitionVisitor.visitFunctionDef(node);
      case 'ClassDef':
        return this.definitionVisitor.visitClassDef(node);
      
      default:
        // 未対応のノードタイプの場合、コメントとして出力
        return this.createIRNode('comment', `// Unsupported node type: ${node.type}`);
    }
  }

  private visitModule(node: ASTNode): IR {
    const children = node.body.map((child: ASTNode) => this.visitNode(child));
    return this.createIRNode('statement', '', children);
  }

  /**
   * IRノード作成のヘルパー
   */
  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }

  /**
   * パース結果の作成
   */
  protected override createParseResult(ir: IR[]): import('../types/parser').ParseResult {
    return {
      ir,
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      stats: {
        parseTime: Date.now() - this.context.startTime,
        linesProcessed: 0,
        nodesGenerated: ir.reduce((sum, node) => sum + countIRNodes(node), 0),
        functionsFound: 0,
        classesFound: 0,
        variablesFound: 0
      }
    };
  }
}