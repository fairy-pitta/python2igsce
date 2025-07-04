import { IR, IRKind, createIR, IRMeta, countIRNodes } from '../types/ir';
import { BaseParser } from './base-parser';
import { StatementVisitor } from './statement-visitor';
import { DefinitionVisitor } from './definition-visitor';
import { ASTParser } from './ast-parser';
import { ASTNode } from '../types/parser';

/**
 * Python ASTからIRへの変換ビジター
 */
export class PythonASTVisitor extends BaseParser {
  private statementVisitor: StatementVisitor;
  private definitionVisitor: DefinitionVisitor;
  private astParser: ASTParser;

  constructor() {
    super();
    this.statementVisitor = new StatementVisitor();
    this.definitionVisitor = new DefinitionVisitor();
    this.astParser = new ASTParser();
    
    // ビジターにコンテキストを共有
    this.statementVisitor.setContext(this.context);
    this.definitionVisitor.setContext(this.context);
    
    // DefinitionVisitorにvisitNodeメソッドを設定
    this.definitionVisitor.visitNode = this.visitNode.bind(this);
    this.statementVisitor.visitNode = this.visitNode.bind(this);
  }

  /**
   * メインのパース関数
   */
  parse(source: string): import('../types/parser').ParseResult {
    this.startParsing();
    this.resetContext();
    
    try {
      // ASTParserを使用してソースコードを解析
      const ast = this.astParser.parseToAST(source);
      // 2パス処理: まずすべてのクラス定義を事前登録
      this.preRegisterAllClasses(ast.body);
      
      // クラス定義登録後、ビジターに最新のコンテキストを再共有
      this.statementVisitor.setContext(this.context);
      this.definitionVisitor.setContext(this.context);
      
      const ir = this.visitNode(ast);
      
      // IRが配列でない場合は、その子要素を返す
      if (ir.kind === 'compound' && ir.children) {
        return this.createParseResult(ir.children);
      }
      
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
      case 'AnnAssign':
        return this.statementVisitor.visitAnnAssign(node);
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
        // クラス定義は既にpreRegisterAllClassesで登録済み
        return this.definitionVisitor.visitClassDef(node);
      
      default:
        // 未対応のノードタイプの場合、コメントとして出力
        return this.createIRNode('comment', `// Unsupported node type: ${node.type}`);
    }
  }

  private visitModule(node: ASTNode): IR {
    const children: IR[] = [];
    
    for (const child of node.body) {
      const childIR = this.visitNode(child);
      children.push(childIR);
    }
    
    return this.createIRNode('compound', '', children);
  }





  /**
   * すべてのクラス定義を事前に登録（2パス処理の1パス目）
   */
  private preRegisterAllClasses(nodes: ASTNode[]): void {
    for (const node of nodes) {
      if (node.type === 'ClassDef') {
        this.astParser.registerClassDefinition(node, this.context);
      }
    }
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