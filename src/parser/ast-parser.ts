import { ASTNode } from '../types/parser';

/**
 * Python ASTパーサー
 * 簡易的なPython構文解析を行う
 */
export class ASTParser {
  /**
   * ソースコードをASTに変換
   */
  parseToAST(source: string): ASTNode {
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
      return this.parseAssignStatement(trimmed, lineNumber);
    }
    
    // print文の検出
    if (trimmed.startsWith('print(')) {
      return this.parsePrintStatement(trimmed, lineNumber);
    }
    
    // return文の検出
    if (trimmed.startsWith('return')) {
      return this.parseReturnStatement(trimmed, lineNumber);
    }
    
    // その他の式文
    return {
      type: 'Expr',
      value: this.parseExpression(trimmed),
      lineno: lineNumber
    };
  }

  // 以下、各種パース関数の実装...
  private parseIfStatement(line: string, lineNumber: number): ASTNode {
    // IF文の実装
    const condition = line.substring(3, line.length - 1).trim();
    return {
      type: 'If',
      test: this.parseExpression(condition),
      body: [],
      orelse: [],
      lineno: lineNumber
    };
  }

  private parseForStatement(line: string, lineNumber: number): ASTNode {
    // FOR文の実装
    const match = line.match(/^for\s+(\w+)\s+in\s+(.+):$/);
    if (match) {
      const [, target, iter] = match;
      return {
        type: 'For',
        target: { type: 'Name', id: target },
        iter: this.parseExpression(iter),
        body: [],
        orelse: [],
        lineno: lineNumber
      };
    }
    throw new Error(`Invalid for statement: ${line}`);
  }

  private parseWhileStatement(line: string, lineNumber: number): ASTNode {
    // WHILE文の実装
    const condition = line.substring(6, line.length - 1).trim();
    return {
      type: 'While',
      test: this.parseExpression(condition),
      body: [],
      orelse: [],
      lineno: lineNumber
    };
  }

  private parseClassDef(line: string, lineNumber: number): ASTNode {
    // クラス定義の実装
    const match = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:$/);
    if (match) {
      const [, className, basesStr] = match;
      const bases = basesStr ? basesStr.split(',').map(base => ({
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
    throw new Error(`Invalid class definition: ${line}`);
  }

  private parseFunctionDef(line: string, lineNumber: number): ASTNode {
    // 関数定義の実装
    const match = line.match(/^def\s+(\w+)\(([^)]*)\):$/);
    if (match) {
      const [, funcName, argsStr] = match;
      const args = argsStr ? argsStr.split(',').map(arg => ({
        arg: arg.trim(),
        annotation: null
      })) : [];

      return {
        type: 'FunctionDef',
        name: funcName,
        args: { args },
        body: [],
        lineno: lineNumber
      };
    }
    throw new Error(`Invalid function definition: ${line}`);
  }

  private parseAssignStatement(line: string, lineNumber: number): ASTNode {
    // 代入文の実装
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
    
    const assignNode: ASTNode = {
      type: 'Assign',
      lineno: lineNumber,
      targets: [{
        type: 'Name',
        id: target
      }],
      value: this.parseExpression(value)
    };
    
    if (inlineComment) {
      assignNode.inlineComment = inlineComment;
    }
    
    return assignNode;
  }

  private parsePrintStatement(line: string, lineNumber: number): ASTNode {
    // print文の実装
    const argsStr = line.substring(6, line.length - 1);
    const args = argsStr ? [this.parseExpression(argsStr)] : [];
    
    return {
      type: 'Expr',
      value: {
        type: 'Call',
        func: { type: 'Name', id: 'print' },
        args
      },
      lineno: lineNumber
    };
  }

  private parseReturnStatement(line: string, lineNumber: number): ASTNode {
    // return文の実装
    const value = line.substring(6).trim();
    return {
      type: 'Return',
      value: value ? this.parseExpression(value) : null,
      lineno: lineNumber
    };
  }

  /**
   * 式を解析してASTノードに変換（簡易版）
   */
  parseExpression(expr: string): ASTNode {
    const trimmed = expr.trim();
    
    // 数値リテラル
    if (/^\d+$/.test(trimmed)) {
      return {
        type: 'Constant',
        value: parseInt(trimmed),
        kind: null
      };
    }
    
    // 文字列リテラル
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return {
        type: 'Constant',
        value: trimmed.slice(1, -1),
        kind: null
      };
    }
    
    // 変数名
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      return {
        type: 'Name',
        id: trimmed,
        ctx: 'Load'
      };
    }
    
    // その他の複雑な式（簡易実装）
    return {
      type: 'Name',
      id: trimmed,
      ctx: 'Load'
    };
  }

  /**
   * クラス定義をコンテキストに登録
   */
  registerClassDefinition(node: any, context: any): void {
    const className = node.name;
    
    // __init__メソッドから属性を抽出
    const constructor = node.body.find((item: any) => 
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
    if (!context.classDefinitions) {
      context.classDefinitions = {};
    }
    
    context.classDefinitions[className] = {
      attributes: attributes,
      bases: bases
    };
  }
}