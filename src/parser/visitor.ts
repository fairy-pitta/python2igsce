// Python ASTビジターパターンの実装
import { IR, IRKind, createIR, IRMeta, IRArgument } from '../types/ir';
import { BaseParser } from './base-parser';
import { inferDataType, IGCSEDataType } from '../types/igcse';
import { ParameterInfo } from '../types/parser';

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
      
      return this.createParseResult(ir);
    } catch (error) {
      this.addError(
        `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'syntax_error'
      );
      
      // エラー時は空のIRを返す
      const emptyIR = createIR('statement', '', []);
      return this.createParseResult(emptyIR);
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
      if (line.trim()) {
        const node = this.parseLineToAST(line, i + 1);
        
        // 関数定義の場合、次の行からインデントされた行を本体として追加
        if (node.type === 'FunctionDef') {
          i++;
          const bodyNodes: ASTNode[] = [];
          
          // 関数定義のインデントレベルを取得
          const funcLine = lines[i - 1];
          const funcIndentLevel = funcLine.length - funcLine.trimStart().length;
          const expectedBodyIndent = funcIndentLevel + 4; // 関数の本体は4スペース深い
          
          // インデントされた行を関数の本体として収集
          while (i < lines.length) {
            const line = lines[i];
            const lineIndentLevel = line.length - line.trimStart().length;
            
            // 空行はスキップ
            if (!line.trim()) {
              i++;
              continue;
            }
            
            // 関数の本体より浅いインデントの場合は終了
            if (lineIndentLevel <= funcIndentLevel) {
              break;
            }
            
            // 関数の本体として処理
            if (lineIndentLevel >= expectedBodyIndent || line.trim()) {
              const bodyNode = this.parseLineToAST(line, i + 1);
              bodyNodes.push(bodyNode);
            }
            i++;
          }
          
          node.body = bodyNodes;
          i--; // 次のループで正しい行を処理するため
        }
        // IF文の場合、elif/else文を探して構造化
        else if (node.type === 'If') {
          i++;
          const bodyNodes: ASTNode[] = [];
          
          // IF文の本体として、より深いインデントの行を収集
          // 現在のIF文のインデントレベルを取得
          const currentLine = lines[i - 1];
          const ifIndentLevel = currentLine.length - currentLine.trimStart().length;
          const expectedBodyIndent = ifIndentLevel + 3; // IF文の本体は3スペース深い
          
          while (i < lines.length && !lines[i].trim().startsWith('elif') && !lines[i].trim().startsWith('else')) {
            const line = lines[i];
            const lineIndentLevel = line.length - line.trimStart().length;
            
            // 空行はスキップ
            if (!line.trim()) {
              i++;
              continue;
            }
            
            // IF文の本体より浅いインデントの場合は終了
            if (lineIndentLevel <= ifIndentLevel) {
              break;
            }
            
            // IF文の本体として収集
            if (lineIndentLevel >= expectedBodyIndent) {
              const bodyNode = this.parseLineToAST(line, i + 1);
              bodyNodes.push(bodyNode);
            }
            
            i++;
          }
          
          node.body = bodyNodes;
          
          // elif/else文があるかチェック
          if (i < lines.length && (lines[i].trim().startsWith('elif') || lines[i].trim() === 'else:')) {
            const elseNodes: ASTNode[] = [];
            
            // elif文の処理 - 連鎖構造を作成
            let currentElif: ASTNode | null = null;
            while (i < lines.length && lines[i].trim().startsWith('elif')) {
              const elifNode = this.parseLineToAST(lines[i], i + 1);
              i++;
              
              // elif文の本体を収集
              const elifBodyNodes: ASTNode[] = [];
              while (i < lines.length && lines[i].startsWith('    ') && !lines[i].trim().startsWith('elif') && !lines[i].trim().startsWith('else')) {
                if (lines[i].trim()) {
                  const bodyNode = this.parseLineToAST(lines[i], i + 1);
                  elifBodyNodes.push(bodyNode);
                }
                i++;
              }
              
              elifNode.body = elifBodyNodes;
              
              if (currentElif) {
                // 前のelif文のorelseに現在のelif文を追加
                currentElif.orelse = [elifNode];
              } else {
                // 最初のelif文
                elseNodes.push(elifNode);
              }
              
              currentElif = elifNode;
            }
            
            // else文の処理
            if (i < lines.length && lines[i].trim() === 'else:') {
              i++; // else行をスキップ
              
              // インデントされた行をelse文の本体として収集
              const elseBodyNodes: ASTNode[] = [];
              while (i < lines.length && lines[i].startsWith('    ')) {
                if (lines[i].trim()) {
                  const elseNode = this.parseLineToAST(lines[i], i + 1);
                  elseBodyNodes.push(elseNode);
                }
                i++;
              }
              
              // 最後のelif文のorelseにelse文の本体を追加
              if (currentElif) {
                currentElif.orelse = elseBodyNodes;
              } else if (elseNodes.length === 0) {
                // elif文がない場合は、直接elseNodesに追加
                elseNodes.push(...elseBodyNodes);
              }
            }
            
            node.orelse = elseNodes;
          }
          
          i--; // 次のループで正しい行を処理するため
        }
        // FOR文の場合、インデントされた行を本体として追加
        else if (node.type === 'For') {
          i++;
          const bodyNodes: ASTNode[] = [];
          
          // インデントされた行をfor文の本体として収集
          while (i < lines.length && (lines[i].startsWith('    ') || lines[i].trim() === '')) {
            if (lines[i].trim()) {
              const bodyNode = this.parseLineToAST(lines[i], i + 1);
              bodyNodes.push(bodyNode);
            }
            i++;
          }
          
          node.body = bodyNodes;
          i--; // 次のループで正しい行を処理するため
        }
        // WHILE文の場合、インデントされた行を本体として追加
        else if (node.type === 'While') {
          i++;
          const bodyNodes: ASTNode[] = [];
          
          // インデントされた行をwhile文の本体として収集
          while (i < lines.length && (lines[i].startsWith('    ') || lines[i].trim() === '')) {
            if (lines[i].trim()) {
              const bodyNode = this.parseLineToAST(lines[i], i + 1);
              bodyNodes.push(bodyNode);
            }
            i++;
          }
          
          node.body = bodyNodes;
          
          // REPEAT-UNTILパターンの検出
          if (node.test && node.test.type === 'Name' && node.test.id === 'True') {
            // while True: の場合、本体内でif condition: break パターンを探す
            const repeatUntilNode = this.detectRepeatUntilPattern(node, bodyNodes);
            if (repeatUntilNode) {
              // REPEAT-UNTILパターンが検出された場合、ノードを置き換え
              nodes[nodes.length - 1] = repeatUntilNode;
            }
          }
          
          i--; // 次のループで正しい行を処理するため
        }
        
        nodes.push(node);
      }
      i++;
    }
    
    return {
      type: 'Module',
      body: nodes
    };
  }

  /**
   * REPEAT-UNTILパターンを検出する
   */
  private detectRepeatUntilPattern(whileNode: ASTNode, bodyNodes: ASTNode[]): ASTNode | null {
    // 最後のノードがif文でbreakを含むかチェック
    for (let i = bodyNodes.length - 1; i >= 0; i--) {
      const node = bodyNodes[i];
      if (node.type === 'If') {
        // if文の本体にbreakがあるかチェック
        const hasBreak = this.hasBreakStatement(node);
        if (hasBreak) {
          // REPEAT-UNTILノードを作成
          const repeatBody = bodyNodes.slice(0, i); // breakのif文より前の部分
          return {
            type: 'RepeatUntil',
            body: repeatBody,
            test: node.test, // if文の条件をUNTIL条件として使用
            lineno: whileNode.lineno || 0
          };
        }
      }
    }
    return null;
  }

  /**
   * ノード内にbreak文があるかチェック
   */
  private hasBreakStatement(node: ASTNode): boolean {
    if (node.type === 'Break') {
      return true;
    }
    
    // 子ノードを再帰的にチェック
    if (node.body && Array.isArray(node.body)) {
      for (const child of node.body) {
        if (this.hasBreakStatement(child)) {
          return true;
        }
      }
    }
    
    if (node.orelse && Array.isArray(node.orelse)) {
      for (const child of node.orelse) {
        if (this.hasBreakStatement(child)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 行をASTノードに変換（簡易実装）
   */
  private parseLineToAST(line: string, lineNumber: number): ASTNode {
    const trimmed = line.trim();
    
    // コメント
    if (trimmed.startsWith('#')) {
      return {
        type: 'Comment',
        value: trimmed.substring(1).trim(),
        lineno: lineNumber
      };
    }
    
    // if文（代入文より先に処理）
    if (trimmed.startsWith('if ')) {
      const condition = trimmed.slice(3).replace(/:$/, ''); // 'if ' を除去し、末尾の ':' を除去
      
      // 比較演算子を含む条件を解析
      const compareMatch = condition.match(/(.*?)\s*(<=|>=|==|!=|<|>)\s*(.*)/);
      if (compareMatch) {
        const [, left, op, right] = compareMatch;
        const leftValue = left.trim();
        const rightValue = right.trim();
        
        // 左辺の解析（配列アクセスかどうかチェック）
        let leftNode: ASTNode;
        const leftArrayMatch = leftValue.match(/(\w+)\[([\w\d]+)\]/);
        if (leftArrayMatch) {
          const [, arrayName, index] = leftArrayMatch;
          leftNode = {
            type: 'ArrayAccess',
            array: { type: 'Name', id: arrayName },
            index: isNaN(parseInt(index)) ? index : parseInt(index)
          };
        } else {
          leftNode = { type: 'Name', id: leftValue };
        }
        
        // 右辺の解析（配列アクセスかどうかチェック）
        let rightNode: ASTNode;
        const rightArrayMatch = rightValue.match(/(\w+)\[([\w\d]+)\]/);
        if (rightArrayMatch) {
          const [, arrayName, index] = rightArrayMatch;
          rightNode = {
            type: 'ArrayAccess',
            array: { type: 'Name', id: arrayName },
            index: isNaN(parseInt(index)) ? index : parseInt(index)
          };
        } else {
          // 数値かどうかを判定
          const isNumber = /^-?\d+(\.\d+)?$/.test(rightValue);
          if (isNumber) {
            rightNode = { 
              type: 'Constant', 
              value: Number(rightValue) 
            };
          } else {
            // 変数名の場合はNameノードとして作成
            rightNode = {
              type: 'Name',
              id: rightValue
            };
          }
        }
        
        return {
          type: 'If',
          test: {
            type: 'Compare',
            left: leftNode,
            ops: [{ type: this.mapCompareOp(op) }],
            comparators: [rightNode]
          },
          body: [],
          orelse: [],
          lineno: lineNumber
        };
      } else {
        return {
          type: 'If',
          test: { type: 'Name', id: condition },
          body: [],
          orelse: [],
          lineno: lineNumber
        };
      }
    }
    
    // elif文
    if (trimmed.startsWith('elif ')) {
      const condition = trimmed.slice(5).replace(/:$/, ''); // 'elif ' を除去し、末尾の ':' を除去
      
      // 比較演算子を含む条件を解析
      const compareMatch = condition.match(/(.*?)\s*(<=|>=|==|!=|<|>)\s*(.*)/); 
      if (compareMatch) {
        const [, left, op, right] = compareMatch;
        const rightValue = right.trim();
        // 数値かどうかを判定
        const isNumber = /^-?\d+(\.\d+)?$/.test(rightValue);
        return {
          type: 'If',
          test: {
            type: 'Compare',
            left: { type: 'Name', id: left.trim() },
            ops: [{ type: this.mapCompareOp(op) }],
            comparators: [{ 
              type: 'Constant', 
              value: isNumber ? Number(rightValue) : rightValue 
            }]
          },
          body: [],
          orelse: [],
          lineno: lineNumber,
          is_elif: true
        };
      } else {
        return {
          type: 'If',
          test: { type: 'Name', id: condition },
          body: [],
          orelse: [],
          lineno: lineNumber,
          is_elif: true
        };
      }
    }
    
    // else文
    if (trimmed === 'else:') {
      return {
        type: 'Else',
        body: [],
        lineno: lineNumber
      };
    }
    
    // 配列の初期化（例: numbers = [0] * 5）
    if (trimmed.includes('=') && trimmed.includes('[') && trimmed.includes(']') && trimmed.includes('*')) {
      const match = trimmed.match(/(\w+)\s*=\s*\[([^\]]+)\]\s*\*\s*(\d+)/);
      if (match) {
        const [, varName, defaultValue, size] = match;
        return {
          type: 'ArrayInit',
          target: { type: 'Name', id: varName },
          defaultValue: defaultValue.trim(),
          size: parseInt(size),
          lineno: lineNumber
        };
      }
    }
    
    // 配列要素への代入（例: numbers[0] = 10, numbers[i] = 10）
    if (trimmed.includes('=') && trimmed.includes('[') && trimmed.includes(']') && !trimmed.includes('==')) {
      const match = trimmed.match(/(\w+)\[([\w\d]+)\]\s*=\s*(.+)/);
      if (match) {
        const [, arrayName, index, value] = match;
        const valueTrimmed = value.trim();
        
        // 値の型判定
        let parsedValue: any;
        
        // 文字列リテラル（引用符で囲まれている）
        if ((valueTrimmed.startsWith('"') && valueTrimmed.endsWith('"')) ||
            (valueTrimmed.startsWith("'") && valueTrimmed.endsWith("'"))) {
          parsedValue = valueTrimmed.slice(1, -1); // 引用符を除去
        }
        // 数値（整数または小数）
        else if (/^-?\d+(\.\d+)?$/.test(valueTrimmed)) {
          parsedValue = Number(valueTrimmed);
        }
        // 真偽値
        else if (valueTrimmed === 'True' || valueTrimmed === 'False') {
          parsedValue = valueTrimmed === 'True';
        }
        // その他は文字列として扱う
        else {
          parsedValue = valueTrimmed;
        }
        
        return {
          type: 'ArrayAssign',
          target: { type: 'Name', id: arrayName },
          index: parseInt(index),
          value: { type: 'Constant', value: parsedValue },
          lineno: lineNumber
        };
      }
    }
    
    // input文を含む代入文
    if (trimmed.includes('=') && trimmed.includes('input(')) {
      const [left, right] = trimmed.split('=', 2);
      const rightTrimmed = right.trim();
      
      // input()の引数を解析
      const inputMatch = rightTrimmed.match(/input\(([^)]*)\)/);
      const args = [];
      if (inputMatch && inputMatch[1]) {
        args.push({ type: 'Constant', value: inputMatch[1] });
      }
      
      return {
        type: 'Assign',
        targets: [{ type: 'Name', id: left.trim() }],
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'input' },
          args: args
        },
        lineno: lineNumber
      };
    }
    
    // 代入文
    if (trimmed.includes('=') && !trimmed.includes('==')) {
      const [left, right] = trimmed.split('=', 2);
      // インラインコメントを除去
      const rightWithoutComment = right.includes('#') ? right.split('#')[0] : right;
      const rightTrimmed = rightWithoutComment.trim();
      
      // 右辺の式を解析
      let valueNode: ASTNode | undefined = undefined;
      
      // 算術演算子を含む式の解析
      const binaryOpMatch = rightTrimmed.match(/(.*?)\s*(\+|\-|\*|\/|\/\/|%|\*\*)\s*(.*)/);
      if (binaryOpMatch) {
        const [, leftExpr, op, rightExpr] = binaryOpMatch;
        const opTypeMap: Record<string, string> = {
          '+': 'Add',
          '-': 'Sub', 
          '*': 'Mult',
          '/': 'Div',
          '//': 'FloorDiv',
          '%': 'Mod',
          '**': 'Pow'
        };
        
        const leftExprTrimmed = leftExpr.trim();
        const rightExprTrimmed = rightExpr.trim();
        
        valueNode = {
          type: 'BinOp',
          left: isNaN(Number(leftExprTrimmed)) 
            ? { type: 'Name', id: leftExprTrimmed }
            : { type: 'Constant', value: Number(leftExprTrimmed) },
          op: { type: opTypeMap[op] },
          right: isNaN(Number(rightExprTrimmed)) 
            ? { type: 'Name', id: rightExprTrimmed }
            : { type: 'Constant', value: Number(rightExprTrimmed) }
        };
      } else {
        // 単純な値の型判定
        let parsedValue: any;
        let isVariable = false;
        
        // 文字列リテラル（引用符で囲まれている）
        if ((rightTrimmed.startsWith('"') && rightTrimmed.endsWith('"')) ||
            (rightTrimmed.startsWith("'") && rightTrimmed.endsWith("'"))) {
          parsedValue = rightTrimmed.slice(1, -1); // 引用符を除去
        }
        // 数値（整数または小数）
        else if (/^-?\d+(\.\d+)?$/.test(rightTrimmed)) {
          parsedValue = Number(rightTrimmed);
        }
        // 真偽値
        else if (rightTrimmed === 'True' || rightTrimmed === 'False') {
          parsedValue = rightTrimmed === 'True';
        }
        // 配列リテラル（例: [1, 2, 3, 4, 5]）
        else if (rightTrimmed.startsWith('[') && rightTrimmed.endsWith(']')) {
          // Array literal detected
          // 配列リテラルの場合、ArrayLiteralノードを作成
          const elements = rightTrimmed.slice(1, -1).split(',').map((elem: string) => {
             const trimmedElem = elem.trim();
             if (/^-?\d+(\.\d+)?$/.test(trimmedElem)) {
               return { type: 'Constant', value: Number(trimmedElem) };
             } else {
               return { type: 'Constant', value: trimmedElem };
             }
           });
          
          valueNode = {
            type: 'ArrayLiteral',
            elements: elements
          };
          // Created ArrayLiteral valueNode
        }
        // 配列アクセス（例: numbers[i], arr[0]）
        else {
          const arrayAccessMatch = rightTrimmed.match(/(\w+)\[([\w\d]+)\]/);
          if (arrayAccessMatch) {
            const [, arrayName, index] = arrayAccessMatch;
            isVariable = true;
            valueNode = {
              type: 'ArrayAccess',
              array: { type: 'Name', id: arrayName },
              index: isNaN(parseInt(index)) ? index : parseInt(index)
            };
          }
          // メソッド呼び出し（例: text.upper(), text.lower()）
          else if (rightTrimmed.includes('.')) {
            const methodMatch = rightTrimmed.match(/(\w+)\.(\w+)\(\)/);
            if (methodMatch) {
              const [, objName, methodName] = methodMatch;
              isVariable = true;
              valueNode = {
                type: 'Attribute',
                value: { type: 'Name', id: objName },
                attr: methodName
              };
            } else {
              parsedValue = rightTrimmed;
            }
          }
          // 関数呼び出し（例: len(array), max(array)）
          else if (rightTrimmed.includes('(') && rightTrimmed.includes(')')) {
            const funcCallMatch = rightTrimmed.match(/(\w+)\(([^)]*)\)/);
            if (funcCallMatch) {
              const [, funcName, argsString] = funcCallMatch;
              // Function call detected
              
              // 引数を解析
              const args = argsString.trim() ? [{ type: 'Name', id: argsString.trim() }] : [];
              
              isVariable = true;
              valueNode = {
                type: 'Call',
                func: { type: 'Name', id: funcName },
                args: args
              };
              // Created Call node
            } else {
              parsedValue = rightTrimmed;
            }
          }
          // 変数名
          else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rightTrimmed)) {
            isVariable = true;
            valueNode = { type: 'Name', id: rightTrimmed };
          }
          // その他は文字列として扱う
          else {
            parsedValue = rightTrimmed;
          }
        }
        
        // Constantノードを作成（変数名以外かつArrayLiteralでない場合）
        if (!isVariable && !valueNode) {
          valueNode = { type: 'Constant', value: parsedValue };
        }
      }
      
      // valueNodeが設定されていない場合のフォールバック
      if (!valueNode) {
        valueNode = { type: 'Constant', value: rightTrimmed };
      }
      
      const assignNode = {
        type: 'Assign',
        targets: [{ type: 'Name', id: left.trim() }],
        value: valueNode,
        lineno: lineNumber
      };
      
      // インラインコメントがある場合は、コメントノードも作成
      if (right.includes('#')) {
        const commentPart = right.split('#')[1].trim();
        const commentNode = {
          type: 'Comment',
          value: commentPart,
          lineno: lineNumber
        };
        // 代入文とコメントの両方を含む複合ノードを返す
        return {
          type: 'AssignWithComment',
          assign: assignNode,
          comment: commentNode,
          lineno: lineNumber
        };
      }
      
      return assignNode;
    }
    
    // print文
    if (trimmed.startsWith('print(')) {
      const content = trimmed.slice(6, -1); // print( と ) を除去
      
      // カンマ区切りの引数を解析
      const args = [];
      
      // 簡易的な引数分割（文字列内のカンマは無視）
      const argParts = this.splitPrintArgs(content);
      
      for (const argPart of argParts) {
        const trimmedArg = argPart.trim();
        
        // 配列アクセスを含む引数の処理
        const arrayAccessMatch = trimmedArg.match(/(\w+)\[([\w\d]+)\]/);
        if (arrayAccessMatch) {
          const [, arrayName, index] = arrayAccessMatch;
          args.push({
            type: 'ArrayAccess',
            array: { type: 'Name', id: arrayName },
            index: isNaN(parseInt(index)) ? index : parseInt(index)
          });
        } else if (trimmedArg.startsWith('f"') && trimmedArg.endsWith('"')) {
          // f-string処理
          const fStringContent = trimmedArg.slice(2, -1); // f" と " を除去
          const parts = [];
          let currentPart = '';
          let inBrace = false;
          
          for (let i = 0; i < fStringContent.length; i++) {
            const char = fStringContent[i];
            if (char === '{' && !inBrace) {
              if (currentPart) {
                parts.push({ type: 'Constant', value: currentPart });
                currentPart = '';
              }
              inBrace = true;
            } else if (char === '}' && inBrace) {
              if (currentPart) {
                parts.push({ type: 'FormattedValue', value: { type: 'Name', id: currentPart } });
                currentPart = '';
              }
              inBrace = false;
            } else {
              currentPart += char;
            }
          }
          
          if (currentPart) {
            parts.push({ type: 'Constant', value: currentPart });
          }
          
          args.push({
            type: 'JoinedStr',
            values: parts
          });
        } else if (trimmedArg.startsWith('"') && trimmedArg.endsWith('"')) {
          // 文字列リテラル
          args.push({ type: 'Constant', value: trimmedArg.slice(1, -1) });
        } else {
          // 変数名
          args.push({ type: 'Name', id: trimmedArg });
        }
      }
      
      return {
        type: 'Expr',
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'print' },
          args: args
        },
        lineno: lineNumber
      };
    }
    
    // input文（単体）
    if (trimmed.includes('input(')) {
      return {
        type: 'Expr',
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'input' },
          args: []
        },
        lineno: lineNumber
      };
    }
    

    
    // for文
    if (trimmed.startsWith('for ')) {
      // range()の引数を正しく解析するため、括弧の対応を考慮した解析を行う
      const rangeMatch = trimmed.match(/for\s+(\w+)\s+in\s+range\((.*)\)/);
      if (rangeMatch) {
        const argsString = rangeMatch[2];
        const args = this.parseRangeArguments(argsString).map(arg => {
          const trimmedArg = arg.trim();
          // len()関数の場合はCallノードとして処理
          if (trimmedArg.startsWith('len(') && trimmedArg.endsWith(')')) {
            const arrayName = trimmedArg.slice(4, -1).trim();
            return {
              type: 'Call',
              func: { type: 'Name', id: 'len' },
              args: [{ type: 'Name', id: arrayName }]
            };
          }
          // 数値の場合
          const numValue = parseFloat(trimmedArg);
          if (!isNaN(numValue)) {
            return {
              type: 'Constant',
              value: numValue
            };
          }
          // その他の場合は文字列として処理
          return {
            type: 'Constant',
            value: trimmedArg
          };
        });
        
        return {
          type: 'For',
          target: { type: 'Name', id: rangeMatch[1] },
          iter: {
            type: 'Call',
            func: { type: 'Name', id: 'range' },
            args: args
          },
          body: [],
          orelse: [],
          lineno: lineNumber
        };
      }
    }
    
    // while文
    if (trimmed.startsWith('while ')) {
      const condition = trimmed.slice(6, -1); // 'while ' と ':' を除去
      let testNode;
      if (condition === 'True') {
        testNode = { type: 'Name', id: 'True' };
      } else {
        testNode = { type: 'Name', id: condition };
      }
      return {
        type: 'While',
        test: testNode,
        body: [],
        orelse: [],
        lineno: lineNumber
      };
    }

    // break文
    if (trimmed === 'break') {
      return {
        type: 'Break',
        lineno: lineNumber
      };
    }
    


    // return文
    if (trimmed.startsWith('return')) {
      const returnValue = trimmed.slice(6).trim(); // 'return' を除去
      
      if (returnValue === '') {
        // return文のみ（値なし）
        return {
          type: 'Return',
          value: null,
          lineno: lineNumber
        };
      } else {
        // return文に値がある場合
        let valueNode: ASTNode;
        
        // 数値かどうかを判定
        if (/^-?\d+(\.\d+)?$/.test(returnValue)) {
          valueNode = {
            type: 'Constant',
            value: Number(returnValue)
          };
        }
        // 文字列リテラルかどうかを判定
        else if ((returnValue.startsWith('"') && returnValue.endsWith('"')) ||
                 (returnValue.startsWith("'") && returnValue.endsWith("'"))) {
          valueNode = {
            type: 'Constant',
            value: returnValue.slice(1, -1)
          };
        }
        // 真偽値かどうかを判定
        else if (returnValue === 'True' || returnValue === 'False') {
          valueNode = {
            type: 'Constant',
            value: returnValue === 'True'
          };
        }
        // その他は変数名として扱う
        else {
          valueNode = {
            type: 'Name',
            id: returnValue
          };
        }
        
        return {
          type: 'Return',
          value: valueNode,
          lineno: lineNumber
        };
      }
    }

    // 関数定義
    if (trimmed.startsWith('def ')) {
      const match = trimmed.match(/def\s+(\w+)\(([^)]*)\):?/);
      if (match) {
        const params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
        return {
          type: 'FunctionDef',
          name: match[1],
          args: {
            args: params.map(p => ({ type: 'arg', arg: p }))
          },
          body: [],
          lineno: lineNumber
        };
      }
    }
    
    // デフォルト（式として扱う）
    return {
      type: 'Expr',
      value: { type: 'Constant', value: trimmed },
      lineno: lineNumber
    };
  }

  /**
   * ASTノードをIRに変換
   */
  private visitNode(node: ASTNode): IR {
    this.debug(`Visiting node: ${node.type}`);
    
    switch (node.type) {
      case 'Module':
        return this.visitModule(node);
      case 'Assign':
        return this.visitAssign(node);
      case 'Expr':
        return this.visitExpr(node);
      case 'If':
        return this.visitIf(node);
      case 'For':
        // Processing For node
        return this.visitFor(node);
      case 'While':
        return this.visitWhile(node);
      case 'RepeatUntil':
        return this.visitRepeatUntil(node);
      case 'FunctionDef':
        // Processing FunctionDef node
        return this.visitFunctionDef(node);
      case 'Return':
        return this.visitReturn(node);
      case 'Comment':
        return this.visitComment(node);
      case 'AssignWithComment':
        return this.visitAssignWithComment(node);
      case 'ArrayInit':
        return this.visitArrayInit(node);
      case 'ArrayAssign':
        return this.visitArrayAssign(node);
      case 'ArrayAccess':
        return this.visitArrayAccess(node);
      case 'ArrayLiteral':
        return this.visitArrayLiteral(node);
      case 'Break':
        return this.visitBreak(node);
      case 'Attribute':
        return this.visitAttribute(node);
      case 'Else':
        return this.visitElse(node);
      default:
        this.addWarning(
          `Unsupported node type: ${node.type}`,
          'implicit_conversion',
          node.lineno
        );
        return this.createIRNode('statement', `// Unsupported: ${node.type}`);
    }
  }

  /**
   * Moduleノードの処理
   */
  private visitModule(node: ASTNode): IR {
    const children = node.body.map((child: ASTNode) => this.visitNode(child));
    return this.createIRNode('statement', '', children);
  }

  /**
   * 代入文の処理
   */
  private visitAssign(node: ASTNode): IR {
    const target = node.targets[0];
    const varName = target.id || target.name || 'unknown';
    
    // input関数の場合は特別な処理
    if (node.value.type === 'Call' && (node.value.func.id === 'input' || node.value.func.name === 'input')) {
      const prompt = node.value.args.length > 0 ? this.getValueString(node.value.args[0]) : '';
      
      // 変数を登録
      const dataType = 'STRING'; // inputは通常文字列を返す
      this.registerVariable(varName, dataType, node.lineno);
      
      // プロンプトがある場合は「INPUT プロンプト, 変数名」の形式
      if (prompt) {
        const inputMeta: IRMeta = {
          name: varName,
          dataType
        };
        if (node.lineno !== undefined) {
          inputMeta.lineNumber = node.lineno;
        }
        
        return this.createIRNode('input', `INPUT ${prompt}, ${varName}`, [], inputMeta);
      } else {
        // プロンプトがない場合は「INPUT 変数名」
        const inputMeta: IRMeta = {
          name: varName,
          dataType
        };
        if (node.lineno !== undefined) {
          inputMeta.lineNumber = node.lineno;
        }
        
        return this.createIRNode('input', `INPUT ${varName}`, [], inputMeta);
      }
    }
    
    // 配列リテラルの場合は特別な処理
    // Checking node.value.type
      if (node.value.type === 'ArrayLiteral') {
        // ArrayLiteral detected
      const elements = node.value.elements || [];
      let elementType = 'INTEGER';
      
      if (elements.length > 0) {
        const firstElement = elements[0];
        if (firstElement.type === 'Constant') {
          if (typeof firstElement.value === 'number') {
            elementType = Number.isInteger(firstElement.value) ? 'INTEGER' : 'REAL';
          } else if (typeof firstElement.value === 'string') {
            elementType = 'STRING';
          }
        }
      }
      
      // 配列変数を登録
      this.registerVariable(varName, 'ARRAY', node.lineno);
      
      // 配列宣言のIRを生成
       const size = elements.length;
       const declareText = `DECLARE ${varName} : ARRAY[1:${size}] OF ${elementType}`;
       
       // 配列のサイズ情報を保存（後でforループで使用）
       this.context.arrayInfo = this.context.arrayInfo || {};
       this.context.arrayInfo[varName] = { size, elementType };
      
      const declareMeta: IRMeta = {
        name: varName,
        dataType: 'ARRAY',
        size,
        elementType
      };
      if (node.lineno !== undefined) {
        declareMeta.lineNumber = node.lineno;
      }
      
      // 配列の初期化は個別の要素代入として生成
       const children: IR[] = [];
       
       // 宣言を追加
       const declareIR = this.createIRNode('array', declareText, [], declareMeta);
       children.push(declareIR);
       
       // 各要素の代入を追加
       elements.forEach((elem: any, index: number) => {
         const assignText = `${varName}[${index + 1}] ← ${elem.value}`;
         const assignMeta: IRMeta = {
           name: varName,
           index: index + 1
         };
         if (node.lineno !== undefined) {
           assignMeta.lineNumber = node.lineno;
         }
         const assignIR = this.createIRNode('assign', assignText, [], assignMeta);
         children.push(assignIR);
       });
       
       return this.createIRNode('block', '', children, declareMeta);
    }
    
    // 値とデータ型を取得
    let value: string;
    let actualValue: any;
    let dataType: IGCSEDataType;
    
    // visitAssign: node.value.type

    
    if (node.value.type === 'Constant') {
      // Constantノードの場合は直接値を取得
      actualValue = node.value.value;
      dataType = inferDataType(actualValue);
      
      // 文字列の場合のみ引用符を追加（ただし配列リテラルは除く）
      if (typeof actualValue === 'string') {
        // 配列リテラルの場合は引用符を付けない
        if (actualValue.startsWith('[') && actualValue.endsWith(']')) {
          value = actualValue;
        } else {
          value = `"${actualValue}"`;
        }
      } else {
        value = String(actualValue);
      }
    } else if (node.value.type === 'Call') {
      // 関数呼び出しの場合は、visitCallを使用してIRを生成し、そのtextを取得
      // Call node detected, calling visitCall
      const callIR = this.visitCall(node.value);
      
      // input関数の場合は特別な処理
      if (node.value.func && node.value.func.id === 'input') {
        if (callIR.meta?.hasPrompt && callIR.meta?.prompt) {
          // プロンプトがある場合: INPUT "プロンプト", 変数名
          const text = `INPUT ${callIR.meta.prompt}, ${varName}`;
          const meta: IRMeta = {
            name: varName,
            dataType: 'STRING'
          };
          if (node.lineno !== undefined) {
            meta.lineNumber = node.lineno;
          }
          this.registerVariable(varName, 'STRING', node.lineno);
          return this.createIRNode('input', text, [], meta);
        } else {
          // プロンプトがない場合: INPUT 変数名
          const text = `INPUT ${varName}`;
          const meta: IRMeta = {
            name: varName,
            dataType: 'STRING'
          };
          if (node.lineno !== undefined) {
            meta.lineNumber = node.lineno;
          }
          this.registerVariable(varName, 'STRING', node.lineno);
          return this.createIRNode('input', text, [], meta);
        }
      }
      
      value = callIR.text;
      dataType = 'STRING'; // デフォルトとして文字列型を設定
      actualValue = value;
    } else {
      // その他の場合は従来通り
      // Using getValueString
      value = this.getValueString(node.value);
      actualValue = value;
      dataType = inferDataType(actualValue);
    }
    this.registerVariable(varName, dataType, node.lineno);
    
    const text = `${varName} ← ${value}`;
    const meta: IRMeta = {
      name: varName,
      dataType
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    const assignMeta: IRMeta = {
      name: varName,
      dataType
    };
    if (node.lineno !== undefined) {
      assignMeta.lineNumber = node.lineno;
    }
    return this.createIRNode('assign', text, [], assignMeta);
  }

  /**
   * 式文の処理
   */
  private visitExpr(node: ASTNode): IR {
    // visitExpr called
    const value = node.value;
    
    if (value.type === 'Call') {
      // Calling visitCall for Call node
      return this.visitCall(value);
    } else {
      // Using getValueString for non-Call node
      const text = this.getValueString(value);
      return this.createIRNode('expression', text);
    }
  }

  /**
   * 関数呼び出しの処理
   */
  private visitCall(node: ASTNode, lineNumber?: number): IR {
    // メソッド呼び出しの場合（例: text.upper()）
    if (node.func.type === 'Attribute') {
      return this.visitAttribute(node.func);
    }
    
    const funcName = node.func.id || node.func.name;
    // visitCall called
    
    switch (funcName) {
      case 'print':
        // 引数を詳細に分析してIRArgument構造を作成
        const irArguments = node.args.map((arg: ASTNode) => this.analyzeArgument(arg));
        
        // 引数をカンマのみで連結（スペースは追加しない）
        const formattedArgs = irArguments.map((arg: IRArgument) => arg.value).join(',');
        
        const outputMeta: IRMeta = {
          arguments: irArguments
        };
        if (lineNumber !== undefined) {
          outputMeta.lineNumber = lineNumber;
        }
        return this.createIRNode('output', `OUTPUT ${formattedArgs}`, [], outputMeta);
        
      case 'input':
        // input関数は代入文の文脈で処理されるため、ここでは基本的な情報のみ返す
        const inputMeta: IRMeta = { 
          name: 'input',
          hasPrompt: node.args.length > 0
        };
        if (node.args.length > 0) {
          inputMeta.prompt = this.getValueString(node.args[0]);
        }
        if (lineNumber !== undefined) {
          inputMeta.lineNumber = lineNumber;
        }
        return this.createIRNode('input', 'INPUT', [], inputMeta);
        
      case 'len':
        // len()関数をLENGTH()に変換
        // Processing len() function
        const lenArgs = node.args.map((arg: any) => this.getValueString(arg));
        const lenMeta: IRMeta = { name: 'len' };
        if (lineNumber !== undefined) {
          lenMeta.lineNumber = lineNumber;
        }
        const lenResult = this.createIRNode('expression', `LENGTH(${lenArgs})`, [], lenMeta);
        // lenResult created
        return lenResult;
        
      default:
        const callArgs = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        // 関数名を適切に変換
        const convertedFuncName = this.convertFunctionName(funcName);
        const callText = `${convertedFuncName}(${callArgs})`;
        const exprMeta: IRMeta = { name: funcName };
        if (lineNumber !== undefined) {
          exprMeta.lineNumber = lineNumber;
        }
        return this.createIRNode('expression', callText, [], exprMeta);
    }
  }

  /**
   * IF文の処理
   */
  private visitIf(node: ASTNode): IR {
    const condition = this.getValueString(node.test);
    const ifText = `IF ${condition} THEN`;
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
    const allChildren: IR[] = [...bodyChildren];
    
    // else/elif文の処理
    if (node.orelse && node.orelse.length > 0) {
      const elseChildren = this.processElseChain(node.orelse);
      allChildren.push(...elseChildren);
    }
    
    // ENDIFを最後に追加
    const endifIR = this.createIRNode('endif', 'ENDIF');
    allChildren.push(endifIR);
    
    const meta: IRMeta = {
      condition: condition
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('if', ifText, allChildren, meta);
  }
  
  /**
   * elif/elseチェーンの処理
   */
  private processElseChain(orelse: ASTNode[]): IR[] {
    const result: IR[] = [];
    
    if (orelse.length > 0) {
      const firstElse = orelse[0];
      
      if (firstElse.type === 'If') {
        // elif文の場合
        const elifCondition = this.getValueString(firstElse.test);
        const elseIfIR = this.createIRNode('elseif', `ELSE IF ${elifCondition} THEN`);
        result.push(elseIfIR);
        
        this.increaseIndent();
        const elifBodyChildren = firstElse.body.map((child: ASTNode) => this.visitNode(child));
        this.decreaseIndent();
        result.push(...elifBodyChildren);
        
        // 再帰的に次のelif/elseを処理
        if (firstElse.orelse && firstElse.orelse.length > 0) {
          const nestedElseChildren = this.processElseChain(firstElse.orelse);
          result.push(...nestedElseChildren);
        }
      } else {
        // 最終的なelse文の場合
        const elseIR = this.createIRNode('else', 'ELSE');
        result.push(elseIR);
        
        this.increaseIndent();
        const elseBodyChildren = orelse.map((child: ASTNode) => this.visitNode(child));
        this.decreaseIndent();
        result.push(...elseBodyChildren);
      }
    }
    
    return result;
  }

  /**
   * FOR文の処理
   */
  private visitFor(node: ASTNode): IR {
    // visitFor function called
    const varName = node.target.id;
    const iter = node.iter;
    
    let startValue = '0';
    let endValue = '9';
    let stepValue = '1';
    
    if (iter.type === 'Call' && iter.func.id === 'range') {
      // Processing range() call
      this.debug(`Processing range() call with ${iter.args.length} arguments`);
      const args = iter.args;
      if (args.length === 1) {
        // range(n) -> 0 to n-1
        const n = this.getNumericValue(args[0]);
        
        // len()関数の場合はLENGTH()として出力し、1-basedにする
        if (args[0].type === 'Call' && args[0].func?.id === 'len') {
          const arrayName = args[0].args[0]?.id || 'array';
          startValue = '1';
          endValue = `LENGTH(${arrayName})`;
        } else {
          startValue = '0';
          endValue = (n - 1).toString();
        }
        
        // Range(n) processed
        this.debug(`Range(n): n=${n}, result: ${startValue} TO ${endValue}`);
      } else if (args.length === 2) {
        // range(start, end) の処理
        const { start, end, isEndLen } = this.parseRangeArgumentsNodes(args[0], args[1]);
        const [startIG, endIG] = this.transformRange(start, end, isEndLen, args[1]);
        startValue = startIG;
        endValue = endIG;
        // Range(start, end) processed
        this.debug(`Range(start, end): start=${start}, end=${end}, isEndLen=${isEndLen}, result: ${startValue} TO ${endValue}`);
      } else if (args.length === 3) {
        // range(start, end, step)
        startValue = this.getNumericValue(args[0]).toString();
        const end = this.getNumericValue(args[1]);
        stepValue = this.getNumericValue(args[2]).toString();
        const step = this.getNumericValue(args[2]);
        
        if (step > 0) {
          // 正のstep: 最後に到達する値を計算
          const start = this.getNumericValue(args[0]);
          const lastValue = start + Math.floor((end - start - 1) / step) * step;
          endValue = lastValue.toString();
        } else {
          // 負のstep: start to end+1
          endValue = (end + 1).toString();
        }
      }
    }
    
    let forText = `FOR ${varName} ← ${startValue} TO ${endValue}`;
    if (stepValue !== '1') {
      forText += ` STEP ${stepValue}`;
    }
    
    // 変数を登録
    this.registerVariable(varName, 'INTEGER', node.lineno);
    
    // forスコープを開始
    this.enterScope('for', 'for');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    this.exitScope();
    
    const nextIR = this.createIRNode('statement', `NEXT ${varName}`);
    const children = [...bodyChildren, nextIR];
    
    const meta: IRMeta = {
      name: varName,
      startValue,
      endValue,
      stepValue
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('for', forText, children, meta);
  }

  private parseRangeArgumentsNodes(startArg: ASTNode, endArg: ASTNode): { start: number; end: number; isEndLen: boolean } {
    const start = this.getNumericValue(startArg);
    const end = this.getNumericValue(endArg);
    
    // args[1] が Call ノードかつ func.id === 'len' なら isEndLen = true
    const isEndLen = endArg.type === 'Call' && endArg.func?.id === 'len';
    
    // parseRangeArguments called
    
    return { start, end, isEndLen };
  }

  private transformRange(start: number, end: number, isEndLen: boolean, endNode?: ASTNode): [string, string] {
    const startIG = (start + 1).toString();
    
    let endIG: string;
    if (isEndLen && endNode?.type === 'Call' && endNode.func?.id === 'len') {
      // len()関数の場合はLENGTH()として出力
      const arrayName = endNode.args[0]?.id || 'array';
      endIG = `LENGTH(${arrayName})`;
    } else if (isEndLen) {
      endIG = end.toString();               // len(array) → inclusive
    } else {
      endIG = (end - 1).toString();        // Python rangeのendはexclusive → inclusive補正
    }
    
    // transformRange processed
    
    return [startIG, endIG];
  }

  /**
   * WHILE文の処理
   */
  private visitWhile(node: ASTNode): IR {
    const condition = this.getValueString(node.test);
    const whileText = `WHILE ${condition}`;
    
    // whileスコープを開始
    this.enterScope('while', 'while');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    this.exitScope();
    
    const endwhileIR = this.createIRNode('endwhile', 'ENDWHILE');
    const children = [...bodyChildren, endwhileIR];
    
    const meta: IRMeta = {
      condition
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('while', whileText, children, meta);
  }

  /**
   * REPEAT-UNTIL文の処理
   */
  private visitRepeatUntil(node: ASTNode): IR {
    const condition = this.getValueString(node.test);
    const repeatText = 'REPEAT';
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
    const untilText = `UNTIL ${condition}`;
    const untilIR = this.createIRNode('until', untilText);
    const children = [...bodyChildren, untilIR];
    
    const meta: IRMeta = {
      condition
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('repeat', repeatText, children, meta);
  }

  /**
   * 関数定義の処理
   */
  private visitFunctionDef(node: ASTNode): IR {
    const funcName = node.name;
    const params = node.args.args.map((arg: ASTNode) => arg.arg);
    
    // 関数名を適切に変換（snake_caseをPascalCaseに、先頭文字を大文字に）
    const capitalizedFuncName = this.convertFunctionName(funcName);
    
    // パラメータ情報を作成
    const parameterInfo: ParameterInfo[] = params.map((param: string) => ({
      name: param,
      type: 'STRING', // デフォルト型
      byReference: false
    }));
    
    // 関数を登録（戻り値の有無は後で判定）
    this.registerFunction(funcName, parameterInfo, undefined, node.lineno);
    
    // パラメータに型注釈を追加
    const paramText = params.join(', ');
    
    this.enterScope(funcName, 'function');
    this.increaseIndent();
    
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    
    this.decreaseIndent();
    this.exitScope();
    
    // return文があるかチェック
    const hasReturn = this.hasReturnStatement(bodyChildren);
    
    let funcText: string;
    let endText: string;
    let irType: IRKind;
    
    if (hasReturn) {
      funcText = `FUNCTION ${capitalizedFuncName}(${paramText})`;
      endText = 'ENDFUNCTION';
      irType = 'function';
    } else {
      funcText = `PROCEDURE ${capitalizedFuncName}(${paramText})`;
      endText = 'ENDPROCEDURE';
      irType = 'procedure';
    }
    
    const endIR = this.createIRNode('statement', endText);
    const children = [...bodyChildren, endIR];
    
    const meta: IRMeta = {
      name: funcName,
      params,
      hasReturn
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode(irType, funcText, children, meta);
  }

  /**
   * RETURN文の処理
   */
  private visitReturn(node: ASTNode): IR {
    let value = '';
    if (node.value) {
      // RETURN文では引用符を追加しない特別な処理
      if (node.value.type === 'Constant') {
        value = String(node.value.value);
      } else if (node.value.type === 'Name') {
        value = node.value.id;
      } else if (node.value.type === 'Num') {
        value = String(node.value.n);
      } else if (node.value.type === 'Str') {
        // 文字列の場合も引用符を追加しない
        value = node.value.s;
      } else {
        // その他の場合は通常のgetValueStringを使用
        value = this.getValueString(node.value);
      }
    }
    const returnText = value ? `RETURN ${value}` : 'RETURN';
    
    // 現在の関数を関数として更新
    if (this.context.currentFunction) {
      this.context.currentFunction.isFunction = true;
      this.context.currentFunction.returnType = inferDataType(value);
    }
    
    const meta: IRMeta = {};
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('return', returnText, [], meta);
  }

  /**
   * コメントの処理
   */
  private visitComment(node: ASTNode): IR {
    const text = `// ${node.value}`;
    const meta: IRMeta = {};
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('comment', text, [], meta);
  }

  /**
   * インラインコメント付き代入文の処理
   */
  private visitAssignWithComment(node: ASTNode): IR {
    // 代入文とコメントを別々に処理
    const assignIR = this.visitAssign(node.assign);
    const commentIR = this.visitComment(node.comment);
    
    // 代入文のテキストにインラインコメントを追加
    const assignText = assignIR.text;
    const commentText = commentIR.text.replace('//', '  //');
    const combinedText = `${assignText}${commentText}`;
    
    return this.createIRNode('assign', combinedText, [], {
      ...assignIR.meta,
      hasInlineComment: true
    });
  }

  /**
   * Break文の処理
   */
  private visitBreak(node: ASTNode): IR {
    // 現在のスコープを確認してEXIT文を生成
    const currentScope = this.getCurrentLoopType();
    let breakText: string;
    
    if (currentScope === 'while') {
      breakText = 'EXIT WHILE';
    } else if (currentScope === 'for') {
      breakText = 'EXIT FOR';
    } else {
      // ループ外のbreak文は警告を出す
      this.addWarning(
        'Break statement outside of loop',
        'implicit_conversion',
        node.lineno
      );
      breakText = '// Break statement outside of loop';
    }
    
    const meta: IRMeta = {};
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('break', breakText, [], meta);
  }

  /**
   * Attributeノード（メソッド呼び出し）の処理
   */
  private visitAttribute(node: ASTNode): IR {
    const objName = this.getValueString(node.value);
    const methodName = node.attr;
    
    let text: string;
    switch (methodName) {
      case 'upper':
        text = `UCASE(${objName})`;
        break;
      case 'lower':
        text = `LCASE(${objName})`;
        break;
      default:
        text = `${objName}.${methodName}`;
        break;
    }
    
    const meta: IRMeta = { name: methodName };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('expression', text, [], meta);
  }

  /**
   * 配列初期化の処理
   */
  private visitArrayInit(node: ASTNode): IR {
    const arrayName = node.target.id;
    const size = node.size;
    const defaultValue = node.defaultValue;
    
    // データ型を推定
    const dataType = this.inferArrayDataType(defaultValue);
    
    // 配列を登録
    this.registerVariable(arrayName, 'ARRAY', node.lineno);
    
    const declareText = `DECLARE ${arrayName} : ARRAY[1:${size}] OF ${dataType}`;
    
    const meta: IRMeta = {
      name: arrayName,
      dataType: 'ARRAY',
      size
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('array', declareText, [], meta);
  }

  /**
   * 配列要素代入の処理
   */
  private visitArrayAssign(node: ASTNode): IR {
    const arrayName = node.target.id;
    const index = node.index + 1; // Pythonの0ベースからIGCSEの1ベースに変換
    const value = this.getValueString(node.value);
    
    const assignText = `${arrayName}[${index}] ← ${value}`;
    
    const meta: IRMeta = {
      name: arrayName,
      index: typeof node.index === 'number' ? node.index + 1 : node.index
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('assign', assignText, [], meta);
  }

  /**
   * 配列要素アクセスの処理
   */
  private visitArrayAccess(node: ASTNode): IR {
    const arrayName = node.array.id;
    let index: string;
    
    if (typeof node.index === 'number') {
      // 数値インデックスの場合、0-based to 1-based変換
      index = (node.index + 1).toString();
    } else {
      // 変数インデックスの場合、そのまま使用
      index = node.index.toString();
    }
    
    const accessText = `${arrayName}[${index}]`;
    
    const meta: IRMeta = {
      name: arrayName,
      index
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('expression', accessText, [], meta);
  }

  /**
   * 配列リテラルの処理
   */
  private visitArrayLiteral(node: ASTNode): IR {
    // 配列の要素から型を推定
    const elements = node.elements || [];
    let dataType = 'INTEGER';
    
    if (elements.length > 0) {
      const firstElement = elements[0];
      if (firstElement.type === 'Constant') {
        if (typeof firstElement.value === 'number') {
          dataType = Number.isInteger(firstElement.value) ? 'INTEGER' : 'REAL';
        } else if (typeof firstElement.value === 'string') {
          dataType = 'STRING';
        }
      }
    }
    
    // 配列の宣言文を生成
    const size = elements.length;
    const arrayText = `ARRAY[1:${size}] OF ${dataType}`;
    
    const meta: IRMeta = {
      dataType: 'ARRAY',
      size,
      elementType: dataType,
      elements: elements.map((elem: any) => elem.value)
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('array_literal', arrayText, [], meta);
  }

  /**
   * 配列のデータ型を推定
   */
  private inferArrayDataType(defaultValue: string): string {
    if (defaultValue === '0' || /^-?\d+$/.test(defaultValue)) {
      return 'INTEGER';
    } else if (/^-?\d*\.\d+$/.test(defaultValue)) {
      return 'REAL';
    } else if (defaultValue.startsWith('"') && defaultValue.endsWith('"')) {
      return 'STRING';
    } else {
      return 'INTEGER'; // デフォルト
    }
  }

  /**
   * 引数を分析してIRArgument構造を作成
   */
  private analyzeArgument(node: ASTNode): IRArgument {
    if (node.type === 'Constant') {
      if (typeof node.value === 'string') {
        // 文字列リテラル
        return {
          value: `"${node.value}"`,
          type: 'literal',
          dataType: 'STRING'
        };
      } else if (typeof node.value === 'number') {
        // 数値リテラル
        return {
          value: String(node.value),
          type: 'literal',
          dataType: Number.isInteger(node.value) ? 'INTEGER' : 'REAL'
        };
      } else {
        // その他の定数
        return {
          value: String(node.value),
          type: 'literal',
          dataType: 'STRING'
        };
      }
    } else if (node.type === 'Name') {
       // 変数
       return {
         value: node.id, // 大文字化しない
         type: 'variable',
         dataType: this.getVariableType(node.id)
       };
    } else {
      // その他の式
      return {
        value: this.getValueString(node),
        type: 'expression'
      };
    }
  }

   /**
     * 変数の型を取得（簡易実装）
     */
    private getVariableType(_variableName: string): IGCSEDataType {
      // 簡易的な型推定（実際のプロジェクトではより詳細な実装が必要）
      return 'STRING'; // デフォルトでSTRING型とする
    }

   /**
   * 数値を取得
   */
  private getNumericValue(node: ASTNode): number {
    if (!node) return 0;
    
    switch (node.type) {
      case 'Constant':
        if (typeof node.value === 'number') {
          return node.value;
        } else if (typeof node.value === 'string') {
          const parsed = parseFloat(node.value);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      case 'Num':
        return node.n;
      case 'Name':
        // 変数の場合は0を返す（実際の値は実行時に決まる）
        return 0;
      case 'Call':
        // len()関数の場合は配列サイズを返す
        if (node.func && node.func.id === 'len' && node.args && node.args.length > 0) {
          const arrayArg = node.args[0];
          if (arrayArg.type === 'Name') {
            const arrayName = arrayArg.id;
            // len() detected
            this.debug(`getNumericValue: len(${arrayName}) detected`);
            if (this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
              const size = this.context.arrayInfo[arrayName].size;
              // returning array size
              this.debug(`getNumericValue: returning array size ${size} for ${arrayName}`);
              return size;
            } else {
              // array info not found, returning default
              this.debug(`getNumericValue: array info not found for ${arrayName}, returning default 5`);
              return 5; // デフォルト
            }
          }
        }
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 値を文字列として取得
   */
  private getValueString(node: ASTNode): string {
    // getValueString called
    if (!node) return '';
    
    switch (node.type) {
      case 'Constant':
        // 文字列の場合は引用符を追加、数値の場合はそのまま
        if (typeof node.value === 'string') {
          const stringValue = node.value;
          // 配列リテラルの場合は引用符を付けない
          if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
            return stringValue;
          }
          // 既に引用符で囲まれている場合はそのまま、そうでなければ追加
          if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
            return stringValue;
          }
          return `"${stringValue}"`;
        } else if (typeof node.value === 'number') {
          return String(node.value);
        } else if (typeof node.value === 'boolean') {
          // ブール値の場合は大文字に変換
          return node.value ? 'TRUE' : 'FALSE';
        }
        return String(node.value);
      case 'Name':
        // TrueとFalseの特別処理
        if (node.id === 'True') {
          return 'TRUE';
        } else if (node.id === 'False') {
          return 'FALSE';
        }
        return node.id;
      case 'Str':
        return `"${node.s}"`;
      case 'Num':
        return String(node.n);
      case 'JoinedStr':
        // f-string処理
        const parts: string[] = [];
        for (const value of node.values) {
          if (value.type === 'Constant') {
            parts.push(`"${value.value}"`);
          } else if (value.type === 'FormattedValue') {
            const varName = this.getValueString(value.value);
            parts.push(varName);
          }
        }
        return parts.join(',');
      case 'Call':
        // Call case entered
        // 関数呼び出しノードは visitCall に委任して適切に処理
        const callResult = this.visitCall(node, undefined);
        return callResult.text;
      case 'Attribute':
        const objName = this.getValueString(node.value);
        const methodName = node.attr;
        switch (methodName) {
          case 'upper':
            return `UCASE(${objName})`;
          case 'lower':
            return `LCASE(${objName})`;
          default:
            return `${objName}.${methodName}`;
        }
      case 'BinOp':
        const left = this.getValueString(node.left);
        const right = this.getValueString(node.right);
        const op = this.getOperatorString(node.op);
        return `${left} ${op} ${right}`;
      case 'Compare':
        const leftComp = this.getValueString(node.left);
        const rightComp = this.getValueString(node.comparators[0]);
        const opComp = this.getOperatorString(node.ops[0]);
        return `${leftComp} ${opComp} ${rightComp}`;
      case 'ArrayAccess':
        const arrayName = node.array.id;
        let index: string;
        
        if (typeof node.index === 'number') {
          // 数値インデックスの場合、0-based to 1-based変換
          index = (node.index + 1).toString();
        } else {
          // 変数インデックスの場合、そのまま使用
          index = node.index.toString();
        }
        
        return `${arrayName}[${index}]`;
      default:
        // Default case
        return node.value || node.id || 'unknown';
    }
  }

  /**
   * range()の引数を正しく解析する（括弧の対応を考慮）
   */
  private parseRangeArguments(argsString: string): string[] {
    const args: string[] = [];
    let currentArg = '';
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentArg += char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        currentArg += char;
      } else if (!inString && char === '(') {
        parenDepth++;
        currentArg += char;
      } else if (!inString && char === ')') {
        parenDepth--;
        currentArg += char;
      } else if (!inString && char === ',' && parenDepth === 0) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }
    
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  /**
   * print文の引数を分割する（文字列内のカンマは無視）
   */
  private splitPrintArgs(content: string): string[] {
    const args: string[] = [];
    let currentArg = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentArg += char;
      } else if (inString && char === stringChar) {
        inString = false;
        currentArg += char;
      } else if (!inString && char === ',') {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }
    
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  /**
   * 演算子を文字列として取得
   */
  private getOperatorString(op: ASTNode): string {
    const opMap: Record<string, string> = {
      'Add': '+',
      'Sub': '-',
      'Mult': '*',
      'Div': '/',
      'FloorDiv': 'DIV',
      'Mod': 'MOD',
      'Pow': '^',
      'Eq': '==',
      'NotEq': '≠',
      'Lt': '<',
      'LtE': '≤',
      'Gt': '>',
      'GtE': '≥',
      'And': 'AND',
      'Or': 'OR',
      'Not': 'NOT'
    };
    
    return opMap[op.type] || op.type;
  }

  private hasReturnStatement(children: IR[]): boolean {
    return children.some((child: IR) => {
      if (child.kind === 'return') {
        return true;
      }
      // expression内にreturnが含まれているかチェック
      if (child.kind === 'expression' && child.text.includes('return')) {
        return true;
      }
      // 子要素も再帰的にチェック
      if (child.children && child.children.length > 0) {
        return this.hasReturnStatement(child.children);
      }
      return false;
    });
  }

  /**
   * 関数名を適切に変換（元の名前を保持）
   */
  private convertFunctionName(funcName: string): string {
    // 元の関数名をそのまま保持
    return funcName;
  }

  /**
   * 比較演算子をASTタイプにマッピング
   */
  private mapCompareOp(op: string): string {
    const opMap: Record<string, string> = {
      '<=': 'LtE',
      '>=': 'GtE', 
      '==': 'Eq',
      '!=': 'NotEq',
      '<': 'Lt',
      '>': 'Gt'
    };
    
    return opMap[op] || 'Eq';
  }

  /**
   * Elseノードの処理
   */
  private visitElse(node: ASTNode): IR {
    this.increaseIndent();
    const bodyChildren = node.body ? node.body.map((child: ASTNode) => this.visitNode(child)) : [];
    this.decreaseIndent();
    
    return this.createIRNode('else', 'ELSE', bodyChildren);
  }
}