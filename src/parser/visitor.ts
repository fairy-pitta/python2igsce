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
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !trimmed.startsWith('#')) {
        const result = this.parseStatement(lines, i);
        if (result.node) {
          nodes.push(result.node);
        }
        i = result.nextIndex;
      } else {
        i++;
      }
    }
    
    return {
      type: 'Module',
      body: nodes
    };
  }

  /**
   * 文とその子ブロックを解析
   */
  private parseStatement(lines: string[], startIndex: number): { node: ASTNode | null, nextIndex: number } {
    const line = lines[startIndex];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    
    // 基本的な文ノードを作成
    const node = this.parseLineToASTNode(trimmed, startIndex + 1);
    if (!node) {
      return { node: null, nextIndex: startIndex + 1 };
    }
    
    // コロンで終わる文（ブロック文）の場合、子ブロックを解析
    if (trimmed.endsWith(':')) {
      const bodyNodes: ASTNode[] = [];
      let i = startIndex + 1;
      
      // 次の行から子ブロックを解析
      while (i < lines.length) {
        const childLine = lines[i];
        const childTrimmed = childLine.trim();
        const childIndent = childLine.length - childLine.trimStart().length;
        
        // 空行やコメント行はスキップ
        if (!childTrimmed || childTrimmed.startsWith('#')) {
          i++;
          continue;
        }
        
        // IF文の場合、ELIF文とELSE文を特別に処理
        if (node.type === 'If' && childIndent === indent) {
          if (childTrimmed.startsWith('elif ')) {
            // ELIF文を新しいIF文として処理し、orelseに追加
            const elifResult = this.parseStatement(lines, i);
            if (elifResult.node) {
              node.orelse = [elifResult.node];
            }
            i = elifResult.nextIndex;
            break;
          } else if (childTrimmed.startsWith('else:')) {
            // ELSE節の処理
            const elseNodes: ASTNode[] = [];
            i++; // else行をスキップ
            
            // ELSE節の子ブロックを解析
            while (i < lines.length) {
              const elseChildLine = lines[i];
              const elseChildTrimmed = elseChildLine.trim();
              const elseChildIndent = elseChildLine.length - elseChildLine.trimStart().length;
              
              // 空行やコメント行はスキップ
              if (!elseChildTrimmed || elseChildTrimmed.startsWith('#')) {
                i++;
                continue;
              }
              
              // インデントが同じかそれより少ない場合、ELSE節終了
              if (elseChildIndent <= indent) {
                break;
              }
              
              // ELSE節の子文を解析
              const elseChildResult = this.parseStatement(lines, i);
              if (elseChildResult.node) {
                elseNodes.push(elseChildResult.node);
              }
              i = elseChildResult.nextIndex;
            }
            
            // ELSE節をノードに設定
            node.orelse = elseNodes;
            break;
          }
        }
        
        // インデントが同じかそれより少ない場合、ブロック終了
        if (childIndent <= indent) {
          break;
        }
        
        // 子文を解析
        const childResult = this.parseStatement(lines, i);
        if (childResult.node) {
          bodyNodes.push(childResult.node);
        }
        i = childResult.nextIndex;
      }
      
      // ノードに子ブロックを設定
      if (node.type === 'If' || node.type === 'For' || node.type === 'While') {
        node.body = bodyNodes;
      }
      
      return { node, nextIndex: i };
    }
    
    return { node, nextIndex: startIndex + 1 };
  }

  /**
   * 単一行をASTノードに変換
   */
  private parseLineToASTNode(line: string, lineNumber: number): ASTNode | null {
    const trimmed = line.trim();
    
    // IF文の検出
    if (trimmed.startsWith('if ')) {
      return this.parseIfStatement(trimmed, lineNumber);
    }
    
    // ELIF文の検出（IF文として処理）
    if (trimmed.startsWith('elif ')) {
      // 'elif' を 'if' に置き換えて処理
      const ifLine = 'if ' + trimmed.substring(5);
      return this.parseIfStatement(ifLine, lineNumber);
    }
    
    // FOR文の検出
    if (trimmed.startsWith('for ')) {
      return this.parseForStatement(trimmed, lineNumber);
    }
    
    // WHILE文の検出
    if (trimmed.startsWith('while ')) {
      return this.parseWhileStatement(trimmed, lineNumber);
    }
    
    // 代入文の検出
    if (trimmed.includes(' = ') && !trimmed.includes('==')) {
      return this.parseAssignStatement(trimmed, lineNumber);
    }
    
    // print文の検出
    if (trimmed.startsWith('print(')) {
      return this.parsePrintStatement(trimmed, lineNumber);
    }
    
    // その他の式文として処理
    return {
      type: 'Expr',
      lineno: lineNumber,
      value: {
        type: 'Call',
        func: { type: 'Name', id: 'unknown' },
        args: [],
        raw: trimmed
      }
    };
  }

  private parseIfStatement(line: string, lineNumber: number): ASTNode {
    // "if condition:" の形式を解析
    const match = line.match(/^if\s+(.+):\s*$/);
    const condition = match ? match[1] : line.substring(3, line.length - 1);
    
    return {
      type: 'If',
      lineno: lineNumber,
      test: {
        type: 'Compare',
        left: { type: 'Name', id: 'condition' },
        ops: ['>'],
        comparators: [{ type: 'Num', n: 0 }],
        raw: condition
      },
      body: [],
      orelse: []
    };
  }

  private parseForStatement(line: string, lineNumber: number): ASTNode {
    // "for var in range(...)" の形式を解析
    const match = line.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
    const target = match ? match[1] : 'i';
    const iter = match ? match[2] : 'range(1)';
    
    return {
      type: 'For',
      lineno: lineNumber,
      target: { type: 'Name', id: target },
      iter: {
        type: 'Call',
        func: { type: 'Name', id: 'range' },
        args: [],
        raw: iter
      },
      body: [],
      orelse: []
    };
  }

  private parseWhileStatement(line: string, lineNumber: number): ASTNode {
    // "while condition:" の形式を解析
    const match = line.match(/^while\s+(.+):\s*$/);
    const condition = match ? match[1] : line.substring(6, line.length - 1);
    
    return {
      type: 'While',
      lineno: lineNumber,
      test: {
        type: 'Compare',
        raw: condition
      },
      body: [],
      orelse: []
    };
  }

  private parseAssignStatement(line: string, lineNumber: number): ASTNode {
    // "var = value" の形式を解析
    const parts = line.split(' = ');
    const target = parts[0].trim();
    const value = parts.slice(1).join(' = ').trim();
    
    return {
      type: 'Assign',
      lineno: lineNumber,
      targets: [{ type: 'Name', id: target }],
      value: {
        type: 'Str',
        s: value,
        raw: value
      }
    };
  }

  private parsePrintStatement(line: string, lineNumber: number): ASTNode {
    // "print(...)" の形式を解析
    const match = line.match(/^print\((.*)\)\s*$/);
    const args = match ? match[1] : '';
    
    return {
      type: 'Expr',
      lineno: lineNumber,
      value: {
        type: 'Call',
        func: { type: 'Name', id: 'print' },
        args: [{
          type: 'Str',
          s: args,
          raw: args
        }]
      }
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