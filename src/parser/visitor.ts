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
  inlineComment?: string;
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
   * 簡易的なASTパーサー（実際の実装では外部ライブラリを使用）
   */
  private parseToAST(source: string): ASTNode {
    // 実際の実装では、python-astやpyodideなどを使用
    // ここでは簡易的な実装
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const processedLines = new Set<number>();
    
    let i = 0;
    while (i < lines.length) {
      if (processedLines.has(i)) {
        i++;
        continue;
      }
      
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#')) {
        // コメント行を処理
        const commentNode: ASTNode = {
          type: 'Comment',
          value: trimmed.substring(1).trim(),
          lineno: i + 1
        };
        nodes.push(commentNode);
        processedLines.add(i);
        i++;
      } else if (trimmed) {
        const result = this.parseStatement(lines, i);
        if (result.node) {
          nodes.push(result.node);
          // 処理された行をマーク
          for (let j = i; j < result.nextIndex; j++) {
            processedLines.add(j);
          }
        }
        i = result.nextIndex;
      } else {
        processedLines.add(i);
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
      if (node.type === 'If' || node.type === 'For' || node.type === 'While' || node.type === 'FunctionDef' || node.type === 'ClassDef') {
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
    
    // クラス定義の検出
    if (trimmed.startsWith('class ')) {
      return this.parseClassDef(trimmed, lineNumber);
    }
    
    // 関数定義の検出
    if (trimmed.startsWith('def ')) {
      return this.parseFunctionDef(trimmed, lineNumber);
    }
    
    // 型注釈付き代入文の検出（例: items: list[str] = []）
    if (trimmed.includes(': ') && trimmed.includes(' = ')) {
      const colonIndex = trimmed.indexOf(': ');
      const equalIndex = trimmed.indexOf(' = ');
      
      // コロンが等号より前にある場合は型注釈付き代入
      if (colonIndex < equalIndex) {
        const varName = trimmed.substring(0, colonIndex).trim();
        const typeAnnotation = trimmed.substring(colonIndex + 2, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 3).trim();
        
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          return {
            type: 'AnnAssign',
            target: {
              type: 'Name',
              id: varName,
              ctx: 'Store'
            },
            annotation: {
              type: 'Subscript',
              value: {
                type: 'Name',
                id: typeAnnotation.includes('[') ? typeAnnotation.substring(0, typeAnnotation.indexOf('[')) : typeAnnotation
              },
              slice: typeAnnotation.includes('[') ? {
                type: 'Name',
                id: typeAnnotation.substring(typeAnnotation.indexOf('[') + 1, typeAnnotation.indexOf(']'))
              } : null
            },
            value: value ? this.parseExpression(value) : null,
            lineno: lineNumber
          };
        }
      }
    }
    
    // 代入文の検出
    if (trimmed.includes(' = ')) {
      // = の前後をチェックして、代入文かどうかを判定
      const equalIndex = trimmed.indexOf(' = ');
      const beforeEqual = trimmed.substring(0, equalIndex).trim();
      const afterEqual = trimmed.substring(equalIndex + 3).trim();
      
      // 配列要素代入の検出（例: data[1] = 100）
      const arrayAssignMatch = beforeEqual.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/);
      if (arrayAssignMatch && afterEqual.length > 0) {
        const [, arrayName, indexExpr] = arrayAssignMatch;
        return {
          type: 'Assign',
          targets: [{
            type: 'Subscript',
            value: {
              type: 'Name',
              id: arrayName,
              ctx: 'Load'
            },
            slice: {
              type: 'Index',
              value: {
                type: 'Constant',
                value: parseInt(indexExpr),
                kind: null
              }
            },
            ctx: 'Store'
          }],
          value: this.parseExpression(afterEqual),
          lineno: lineNumber
        };
      }
      
      // 属性代入の検出（例: self.name = value）
      const attrAssignMatch = beforeEqual.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (attrAssignMatch && afterEqual.length > 0) {
        const [, objName, attrName] = attrAssignMatch;
        return {
          type: 'Assign',
          targets: [{
            type: 'Attribute',
            value: {
              type: 'Name',
              id: objName,
              ctx: 'Load'
            },
            attr: attrName,
            ctx: 'Store'
          }],
          value: this.parseExpression(afterEqual),
          lineno: lineNumber
        };
      }
      
      // 左辺が単純な変数名で、右辺が存在する場合は代入文
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(beforeEqual) && afterEqual.length > 0) {
        return this.parseAssignStatement(trimmed, lineNumber);
      }
    }
    
    // print文の検出
    if (trimmed.startsWith('print(')) {
      return this.parsePrintStatement(trimmed, lineNumber);
    }
    
    // 関数定義の検出
    if (trimmed.startsWith('def ')) {
      return this.parseFunctionDef(trimmed, lineNumber);
    }
    
    // クラス定義の検出
    if (trimmed.startsWith('class ')) {
      return this.parseClassDef(trimmed, lineNumber);
    }
    
    // return文の検出
    if (trimmed.startsWith('return')) {
      return this.parseReturnStatement(trimmed, lineNumber);
    }
    
    // break文の検出
    if (trimmed === 'break') {
      return {
        type: 'Break',
        lineno: lineNumber
      };
    }
    
    // continue文の検出
    if (trimmed === 'continue') {
      return {
        type: 'Continue',
        lineno: lineNumber
      };
    }
    
    // 拡張代入文の検出（+=, -=, *=, /=, %=）
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*[+\-*/%]=/.test(trimmed)) {
      return this.parseAugAssignStatement(trimmed, lineNumber);
    }
    
    // 関数呼び出しの検出
    const callMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const funcName = callMatch[1];
      const argsStr = callMatch[2];
      const args = this.parseArguments(argsStr);
      
      return {
        type: 'Expr',
        lineno: lineNumber,
        value: {
          type: 'Call',
          func: { type: 'Name', id: funcName },
          args: args
        }
      };
    }
    
    // 属性メソッド呼び出しの検出（例: names.append("Alice")）
    const attrCallMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (attrCallMatch) {
      const objName = attrCallMatch[1];
      const methodName = attrCallMatch[2];
      const argsStr = attrCallMatch[3];
      const args = this.parseArguments(argsStr);
      
      return {
        type: 'Expr',
        lineno: lineNumber,
        value: {
          type: 'Call',
          func: {
            type: 'Attribute',
            value: {
              type: 'Name',
              id: objName,
              ctx: 'Load'
            },
            attr: methodName,
            ctx: 'Load'
          },
          args: args
        }
      };
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

  /**
   * 拡張代入文の解析
   */
  private parseAugAssignStatement(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*([+\-*/%])=\s*(.+)$/);
    
    if (!match) {
      // マッチしない場合は通常の式として処理
      return {
        type: 'Expr',
        lineno: lineNumber,
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'unknown' },
          args: [],
          raw: line
        }
      };
    }

    const [, target, op, value] = match;
    
    return {
      type: 'AugAssign',
      lineno: lineNumber,
      target: {
        type: 'Name',
        id: target
      },
      op: {
        type: this.getAugAssignOpType(op)
      },
      value: {
        type: 'Num',
        n: isNaN(Number(value)) ? value : Number(value),
        raw: value
      }
    };
  }

  /**
   * 拡張代入演算子のタイプを取得
   */
  private getAugAssignOpType(op: string): string {
    switch (op) {
      case '+': return 'Add';
      case '-': return 'Sub';
      case '*': return 'Mult';
      case '/': return 'Div';
      case '%': return 'Mod';
      default: return 'Add';
    }
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
    // "for var in iterable:" の形式を解析
    const match = line.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
    const target = match ? match[1] : 'i';
    const iter = match ? match[2] : 'range(1)';
    
    // range関数の引数を解析
    let args: any[] = [];
    if (iter.startsWith('range(') && iter.endsWith(')')) {
      const argsStr = iter.slice(6, -1); // "range(" と ")" を除去
      if (argsStr.trim()) {
        const argParts = argsStr.split(',').map(arg => arg.trim());
        args = argParts.map(arg => ({
          type: 'Num',
          n: isNaN(Number(arg)) ? arg : Number(arg),
          raw: arg
        }));
      }
    }
    
    // 配列やリストの直接反復の場合
    if (!iter.startsWith('range(')) {
      return {
        type: 'For',
        lineno: lineNumber,
        target: { type: 'Name', id: target },
        iter: {
          type: 'Name',
          id: iter
        },
        body: [],
        orelse: []
      };
    }
    
    return {
      type: 'For',
      lineno: lineNumber,
      target: { type: 'Name', id: target },
      iter: {
        type: 'Call',
        func: { type: 'Name', id: 'range' },
        args: args,
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
    let value = parts.slice(1).join(' = ').trim();
    
    // インラインコメント部分を抽出（# 以降）
    let inlineComment = '';
    const commentIndex = value.indexOf('#');
    if (commentIndex !== -1) {
      inlineComment = value.substring(commentIndex + 1).trim();
      value = value.substring(0, commentIndex).trim();
    }
    
    // 配列リテラルの検出
    if (value.startsWith('[') && value.endsWith(']')) {
      const elementsStr = value.slice(1, -1).trim();
      const elements = elementsStr ? elementsStr.split(',').map(elem => {
        const trimmed = elem.trim();
        // 数値かどうかを判定
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          return {
            type: 'Num',
            n: parseFloat(trimmed)
          };
        } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return {
            type: 'Str',
            s: trimmed.slice(1, -1)
          };
        } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
          return {
            type: 'Str',
            s: trimmed.slice(1, -1)
          };
        } else {
          return {
            type: 'Name',
            id: trimmed
          };
        }
      }) : [];
      
      return {
        type: 'Assign',
        lineno: lineNumber,
        targets: [{ type: 'Name', id: target }],
        value: {
          type: 'List',
          elts: elements
        }
      };
    }
    
    // 配列アクセスの検出 (例: my_array[0])
    const arrayAccessMatch = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]$/);
    if (arrayAccessMatch) {
      const [, arrayName, indexStr] = arrayAccessMatch;
      return {
        type: 'Assign',
        lineno: lineNumber,
        targets: [{ type: 'Name', id: target }],
        value: {
          type: 'Subscript',
          value: { type: 'Name', id: arrayName },
          slice: { type: 'Num', n: parseInt(indexStr) }
        }
      };
    }
    
    // 比較演算子を含む式の検出
    const valueNode = this.parseExpression(value);
    
    const assignNode: ASTNode = {
      type: 'Assign',
      lineno: lineNumber,
      targets: [{
        type: 'Name',
        id: target
      }],
      value: valueNode
    };
    
    if (inlineComment) {
      assignNode.inlineComment = inlineComment;
    }
    
    return assignNode;
  }

  /**
   * 式を解析してASTノードに変換
   */
  private parseExpression(expr: string): ASTNode {
    const trimmed = expr.trim();
    
    // 空リストの検出
    if (trimmed === '[]') {
      return {
        type: 'List',
        elts: [],
        ctx: 'Load'
      };
    }
    
    // リストリテラルの検出
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1).trim();
      if (!content) {
        return {
          type: 'List',
          elts: [],
          ctx: 'Load'
        };
      }
      
      // リスト要素の解析
      const elements = content.split(',').map(elem => {
        const elemTrimmed = elem.trim();
        
        // 数値の検出
        if (/^\d+$/.test(elemTrimmed)) {
          return {
            type: 'Constant',
            value: parseInt(elemTrimmed),
            kind: null
          };
        }
        
        // 文字列の検出
        if ((elemTrimmed.startsWith('"') && elemTrimmed.endsWith('"')) ||
            (elemTrimmed.startsWith("'") && elemTrimmed.endsWith("'"))) {
          return {
            type: 'Constant',
            value: elemTrimmed.slice(1, -1),
            kind: null
          };
        }
        
        // 変数名の検出
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(elemTrimmed)) {
          return {
            type: 'Name',
            id: elemTrimmed,
            ctx: 'Load'
          };
        }
        
        // その他の式
        return {
          type: 'Name',
          id: elemTrimmed,
          ctx: 'Load'
        };
      });
      
      return {
        type: 'List',
        elts: elements,
        ctx: 'Load'
      };
    }
    
    // NOT演算子の検出（最優先）
    if (trimmed.startsWith('not ')) {
      const operand = trimmed.substring(4).trim();
      return {
        type: 'UnaryOp',
        op: { type: 'Not' },
        operand: this.parseExpression(operand)
      };
    }
    
    // 括弧で囲まれた式の処理
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const innerExpr = trimmed.slice(1, -1);
      const innerNode = this.parseExpression(innerExpr);
      // 括弧付きの式として明示的にマーク
      return {
        type: 'Expr',
        value: innerNode,
        parenthesized: true
      };
    }
    
    // 比較演算子の検出
    const compareOps = ['==', '!=', '<=', '>=', '<', '>'];
    for (const op of compareOps) {
      const index = trimmed.indexOf(op);
      if (index !== -1) {
        const left = trimmed.substring(0, index).trim();
        const right = trimmed.substring(index + op.length).trim();
        
        return {
          type: 'Compare',
          left: this.parseSimpleExpression(left),
          ops: [this.getCompareOpNode(op)],
          comparators: [this.parseSimpleExpression(right)]
        };
      }
    }
    
    // 論理演算子の検出
    if (trimmed.includes(' and ')) {
      const parts = trimmed.split(' and ');
      return {
        type: 'BoolOp',
        op: { type: 'And' },
        values: parts.map(part => this.parseExpression(part.trim()))
      };
    }
    
    if (trimmed.includes(' or ')) {
      const parts = trimmed.split(' or ');
      return {
        type: 'BoolOp',
        op: { type: 'Or' },
        values: parts.map(part => this.parseExpression(part.trim()))
      };
    }
    
    // メソッド呼び出しの検出（例: text.upper()）
    const methodCallMatch = trimmed.match(/^(.+)\.([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (methodCallMatch) {
      const [, objectExpr, methodName, argsStr] = methodCallMatch;
      const args = this.parseArguments(argsStr);
      
      return {
        type: 'Call',
        func: {
          type: 'Attribute',
          value: this.parseSimpleExpression(objectExpr),
          attr: methodName,
          ctx: 'Load'
        },
        args: args
      };
    }
    
    // 関数呼び出しの検出
    const callMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const [, funcName, argsStr] = callMatch;
      const args = this.parseArguments(argsStr);
      
      return {
        type: 'Call',
        func: { type: 'Name', id: funcName },
        args: args
      };
    }
    
    // 算術演算子の検出（長い演算子を先に検出）
    const arithOps = ['//', '+', '-', '*', '/', '%'];
    for (const op of arithOps) {
      const index = trimmed.indexOf(op);
      if (index !== -1) {
        const left = trimmed.substring(0, index).trim();
        const right = trimmed.substring(index + op.length).trim();
        
        return {
          type: 'BinOp',
          left: this.parseSimpleExpression(left),
          op: this.getArithOpNode(op),
          right: this.parseSimpleExpression(right)
        };
      }
    }
    
    // 単純な式として処理
    return this.parseSimpleExpression(trimmed);
  }
  
  /**
   * 単純な式（変数、リテラル）を解析
   */
  private parseSimpleExpression(expr: string): ASTNode {
    const trimmed = expr.trim();
    
    // 属性アクセスの検出（例: path[0].x）
    const attrMatch = trimmed.match(/^(.+)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (attrMatch) {
      const [, valueExpr, attr] = attrMatch;
      return {
        type: 'Attribute',
        value: this.parseSimpleExpression(valueExpr),
        attr: attr,
        ctx: 'Load'
      };
    }
    
    // 配列インデックスの検出（例: path[0]）
    const subscriptMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/);
    if (subscriptMatch) {
      const [, arrayName, indexExpr] = subscriptMatch;
      return {
        type: 'Subscript',
        value: {
          type: 'Name',
          id: arrayName,
          ctx: 'Load'
        },
        slice: this.parseSimpleExpression(indexExpr),
        ctx: 'Load'
      };
    }
    
    // 文字列リテラル
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return {
        type: 'Str',
        s: trimmed.slice(1, -1)
      };
    }
    
    // 数値リテラル
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return {
        type: 'Num',
        n: parseFloat(trimmed)
      };
    }
    
    // ブール値
    if (trimmed === 'True' || trimmed === 'False') {
      return {
        type: 'NameConstant',
        value: trimmed === 'True'
      };
    }
    
    // 変数名
    return {
      type: 'Name',
      id: trimmed
    };
  }
  
  /**
   * 比較演算子のASTノードを取得
   */
  private getCompareOpNode(op: string): ASTNode {
    switch (op) {
      case '==': return { type: 'Eq' };
      case '!=': return { type: 'NotEq' };
      case '<': return { type: 'Lt' };
      case '<=': return { type: 'LtE' };
      case '>': return { type: 'Gt' };
      case '>=': return { type: 'GtE' };
      default: return { type: 'Eq' };
    }
  }
  
  /**
   * 算術演算子のASTノードを取得
   */
  private getArithOpNode(op: string): ASTNode {
    switch (op) {
      case '+': return { type: 'Add' };
      case '-': return { type: 'Sub' };
      case '*': return { type: 'Mult' };
      case '/': return { type: 'Div' };
      case '//': return { type: 'FloorDiv' };
      case '%': return { type: 'Mod' };
      default: return { type: 'Add' };
    }
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
   * 関数定義の解析
   */
  private parseFunctionDef(line: string, lineNumber: number): ASTNode {
    // "def function_name(params):" の形式を解析
    const match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:\s*$/);
    
    if (!match) {
      // マッチしない場合は基本的な関数定義として処理
      return {
        type: 'FunctionDef',
        name: 'unknown_function',
        args: { args: [] },
        returns: null,
        body: [],
        lineno: lineNumber
      };
    }
    
    const [, funcName, paramsStr, returnType] = match;
    
    // パラメータの解析
    const params = this.parseParameters(paramsStr);
    
    return {
      type: 'FunctionDef',
      name: funcName,
      args: { args: params },
      returns: returnType ? { type: 'Name', id: returnType.trim() } : null,
      body: [],
      lineno: lineNumber
    };
  }

  /**
   * 引数リストの解析
   */
  private parseArguments(argsStr: string): any[] {
    if (!argsStr.trim()) {
      return [];
    }
    
    // 括弧のバランスを考慮して引数を分割
    const args = this.splitArgumentsRespectingParentheses(argsStr);
    
    return args.map(arg => {
      const trimmed = arg.trim();
      
      // 関数呼び出しの場合（括弧を含む）
      if (trimmed.includes('(') && trimmed.includes(')')) {
        return this.parseExpression(trimmed);
      }
      
      // 文字列リテラルの場合
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return {
          type: 'Str',
          s: trimmed.slice(1, -1)
        };
      }
      
      // 数値の場合
      if (/^\d+$/.test(trimmed)) {
        return {
          type: 'Num',
          n: parseInt(trimmed)
        };
      }
      
      // 変数名の場合
      return {
        type: 'Name',
        id: trimmed
      };
    });
  }

  /**
   * 括弧のバランスを考慮して引数を分割
   */
  private splitArgumentsRespectingParentheses(argsStr: string): string[] {
    const args: string[] = [];
    let currentArg = '';
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '(') {
          parenDepth++;
        } else if (char === ')') {
          parenDepth--;
        } else if (char === ',' && parenDepth === 0) {
          args.push(currentArg.trim());
          currentArg = '';
          continue;
        }
      } else {
        if (char === stringChar && (i === 0 || argsStr[i - 1] !== '\\')) {
          inString = false;
          stringChar = '';
        }
      }
      
      currentArg += char;
    }
    
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  /**
   * パラメータリストの解析
   */
  private parseParameters(paramsStr: string): any[] {
    if (!paramsStr.trim()) {
      return [];
    }
    
    return paramsStr.split(',').map(param => {
      const trimmed = param.trim();
      
      // 型注釈がある場合: "param: type"
      const typeMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      if (typeMatch) {
        const [, paramName, paramType] = typeMatch;
        return {
          arg: paramName,
          annotation: { type: 'Name', id: paramType.trim() }
        };
      }
      
      // 型注釈がない場合
      return {
        arg: trimmed,
        annotation: null
      };
    });
  }

  /**
   * return文の解析
   */
  private parseReturnStatement(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^return\s*(.*)$/);
    const value = match ? match[1].trim() : '';
    
    return {
      type: 'Return',
      value: value ? {
        type: 'Name',
        id: value,
        raw: value
      } : null,
      lineno: lineNumber
    };
  }

  /**
   * クラス定義の解析
   */
  private parseClassDef(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/);
    if (!match) {
       this.addError(`Invalid class definition: ${line}`, 'syntax_error');
       return {
         type: 'Unknown',
         lineno: lineNumber
       };
     }

    const [, className, baseClasses] = match;
    const bases = baseClasses ? baseClasses.split(',').map(base => ({
      type: 'Name',
      id: base.trim()
    })) : [];

    return {
      type: 'ClassDef',
      name: className,
      bases,
      body: [],
      lineno: lineNumber
    };
  }

  /**
   * クラス定義をコンテキストに登録
   */
  private registerClassDefinition(node: ASTNode): void {
    const className = node.name;
    
    // __init__メソッドから属性を抽出
    const constructor = node.body.find((item: ASTNode) => 
      item.type === 'FunctionDef' && item.name === '__init__'
    );
    
    const attributes: string[] = [];
    if (constructor) {
      // コンストラクタのパラメータから属性名を取得
      if (constructor.args && constructor.args.args) {
        constructor.args.args.forEach((arg: any) => {
          if (arg.arg !== 'self') {
            attributes.push(arg.arg);
          }
        });
      }
    }
    
    // 継承情報を抽出
    const bases: string[] = [];
    if (node.bases && node.bases.length > 0) {
      node.bases.forEach((base: any) => {
        if (base.type === 'Name') {
          bases.push(base.id);
        }
      });
    }
    
    // コンテキストに登録
    if (!this.context.classDefinitions) {
      this.context.classDefinitions = {};
    }
    
    this.context.classDefinitions[className] = {
      attributes: attributes,
      bases: bases
    };
  }

  /**
   * すべてのクラス定義を事前に登録（2パス処理の1パス目）
   */
  private preRegisterAllClasses(nodes: ASTNode[]): void {
    for (const node of nodes) {
      if (node.type === 'ClassDef') {
        this.registerClassDefinition(node);
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