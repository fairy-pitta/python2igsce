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
              
              // IF文の場合、特別な処理を行う
              if (bodyNode.type === 'If') {
                i++;
                const ifBodyNodes: ASTNode[] = [];
                
                // 現在のIF文のインデントレベルを取得
                const currentLine = lines[i - 1];
                const ifIndentLevel = currentLine.length - currentLine.trimStart().length;
                const expectedIfBodyIndent = ifIndentLevel + 4;
                
                // IF文の本体を収集
                while (i < lines.length && !lines[i].trim().startsWith('elif') && !lines[i].trim().startsWith('else')) {
                  const ifLine = lines[i];
                  const ifLineIndentLevel = ifLine.length - ifLine.trimStart().length;
                  
                  // 空行はスキップ
                  if (!ifLine.trim()) {
                    i++;
                    continue;
                  }
                  
                  // IF文の本体より浅いインデントの場合は終了
                  if (ifLineIndentLevel <= ifIndentLevel) {
                    break;
                  }
                  
                  // IF文の本体として収集
                  if (ifLineIndentLevel >= expectedIfBodyIndent) {
                    const ifBodyNode = this.parseLineToAST(ifLine, i + 1);
                    ifBodyNodes.push(ifBodyNode);
                  }
                  
                  i++;
                }
                
                bodyNode.body = ifBodyNodes;
                
                // ELSE文の処理
                if (i < lines.length && lines[i].trim() === 'else:') {
                  i++; // else行をスキップ
                  
                  const elseBodyNodes: ASTNode[] = [];
                  while (i < lines.length && lines[i].startsWith('    ')) {
                    const elseLine = lines[i];
                    if (elseLine.trim()) {
                      const elseNode = this.parseLineToAST(elseLine, i + 1);
                      elseBodyNodes.push(elseNode);
                    }
                    i++;
                  }
                  
                  bodyNode.orelse = elseBodyNodes;
                }
                
                i--; // 次のループで正しい行を処理するため
              }
              
              bodyNodes.push(bodyNode);
            }
            i++;
          }
          
          node.body = bodyNodes;
          i--; // 次のループで正しい行を処理するため
        }
        // クラス定義の場合、次の行からインデントされた行を本体として追加
        else if (node.type === 'ClassDef') {
          i++;
          const bodyNodes: ASTNode[] = [];
          
          // クラス定義のインデントレベルを取得
          const classLine = lines[i - 1];
          const classIndentLevel = classLine.length - classLine.trimStart().length;
          const expectedBodyIndent = classIndentLevel + 4; // クラスの本体は4スペース深い
          
          // インデントされた行をクラスの本体として収集
          while (i < lines.length) {
            const line = lines[i];
            const lineIndentLevel = line.length - line.trimStart().length;
            
            // 空行はスキップ
            if (!line.trim()) {
              i++;
              continue;
            }
            
            // クラスの本体より浅いインデントの場合は終了
            if (lineIndentLevel <= classIndentLevel) {
              break;
            }
            
            // クラスの本体として処理
            if (lineIndentLevel >= expectedBodyIndent || line.trim()) {
              const bodyNode = this.parseLineToAST(line, i + 1);
              
              // メソッド定義の場合、メソッドの本体も処理
              if (bodyNode.type === 'FunctionDef') {
                i++;
                const methodBodyNodes: ASTNode[] = [];
                
                // メソッド定義のインデントレベルを取得
                const methodLine = lines[i - 1];
                const methodIndentLevel = methodLine.length - methodLine.trimStart().length;
                const expectedMethodBodyIndent = methodIndentLevel + 4;
                
                // メソッドの本体を収集
                while (i < lines.length) {
                  const methodBodyLine = lines[i];
                  const methodBodyIndentLevel = methodBodyLine.length - methodBodyLine.trimStart().length;
                  
                  // 空行はスキップ
                  if (!methodBodyLine.trim()) {
                    i++;
                    continue;
                  }
                  
                  // メソッドの本体より浅いインデントの場合は終了
                  if (methodBodyIndentLevel <= methodIndentLevel) {
                    break;
                  }
                  
                  // メソッドの本体として処理
                  if (methodBodyIndentLevel >= expectedMethodBodyIndent) {
                    const methodBodyNode = this.parseLineToAST(methodBodyLine, i + 1);
                    methodBodyNodes.push(methodBodyNode);
                  }
                  
                  i++;
                }
                
                bodyNode.body = methodBodyNodes;
                i--; // 次のループで正しい行を処理するため
              }
              
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
          const expectedBodyIndent = ifIndentLevel + 4; // IF文の本体は4スペース深い
          
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
              
              // IF文の場合、その本体も処理
              if (bodyNode.type === 'If') {
                i++;
                const ifBodyNodes: ASTNode[] = [];
                
                // IF文の本体として、より深いインデントの行を収集
                while (i < lines.length && lines[i].startsWith('        ')) {
                  if (lines[i].trim()) {
                    const ifBodyNode = this.parseLineToAST(lines[i], i + 1);
                    ifBodyNodes.push(ifBodyNode);
                  }
                  i++;
                }
                
                bodyNode.body = ifBodyNodes;
                i--; // 次のループで正しい行を処理するため
              }
              
              bodyNodes.push(bodyNode);
            }
            i++;
          }
          
          node.body = bodyNodes;
          
          // REPEAT-UNTILパターンの検出は無効化
          // テストではwhile TrueはWHILE TRUEとして期待されている
          // if (node.test && node.test.type === 'Name' && node.test.id === 'True') {
          //   // while True: の場合、本体内でif condition: break パターンを探す
          //   const repeatUntilNode = this.detectRepeatUntilPattern(node, bodyNodes);
          //   if (repeatUntilNode) {
          //     // REPEAT-UNTILパターンが検出された場合、そのノードを追加
          //     nodes.push(repeatUntilNode);
          //     i--; // 次のループで正しい行を処理するため
          //     continue;
          //   }
          // }
          
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
  // private detectRepeatUntilPattern(whileNode: ASTNode, bodyNodes: ASTNode[]): ASTNode | null {
  //   // 最後のノードがif文でbreakを含むかチェック
  //   for (let i = bodyNodes.length - 1; i >= 0; i--) {
  //     const node = bodyNodes[i];
  //     
  //     if (node.type === 'If') {
  //       // if文の本体にbreakがあるかチェック
  //       const hasBreak = this.hasBreakStatement(node);
  //       
  //       if (hasBreak) {
  //         // REPEAT-UNTILノードを作成
  //         const repeatBody = bodyNodes.slice(0, i); // breakのif文より前の部分
  //         return {
  //           type: 'RepeatUntil',
  //           body: repeatBody,
  //           test: node.test, // if文の条件をUNTIL条件として使用
  //           lineno: whileNode.lineno || 0
  //         };
  //       }
  //     }
  //   }
  //   return null;
  // }

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
    
    // childrenプロパティもチェック
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
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
    
    // 型注釈付きの代入文（例: items: list[str] = []）
    if (trimmed.includes(':') && trimmed.includes('=') && trimmed.includes('list[')) {
      const colonIndex = trimmed.indexOf(':');
      const equalIndex = trimmed.indexOf('=');
      
      if (colonIndex < equalIndex) {
        const varName = trimmed.substring(0, colonIndex).trim();
        const typeAnnotation = trimmed.substring(colonIndex + 1, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        
        // list[type] から型を抽出
        const typeMatch = typeAnnotation.match(/list\[([^\]]+)\]/);
        if (typeMatch) {
          const elementType = typeMatch[1];
          
          // 空配列の場合
          if (value === '[]') {
            return {
              type: 'Assign',
              targets: [{ type: 'Name', id: varName }],
              value: {
                type: 'ArrayLiteral',
                elements: [],
                elementType: elementType
              },
              lineno: lineNumber
            };
          }
        }
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
    
    // 複合代入演算子（+=, -=, *=, /=）
    if (trimmed.includes('+=') || trimmed.includes('-=') || trimmed.includes('*=') || trimmed.includes('/=')) {
      let operator = '';
      let left = '';
      let right = '';
      
      if (trimmed.includes('+=')) {
        [left, right] = trimmed.split('+=', 2);
        operator = '+';
      } else if (trimmed.includes('-=')) {
        [left, right] = trimmed.split('-=', 2);
        operator = '-';
      } else if (trimmed.includes('*=')) {
        [left, right] = trimmed.split('*=', 2);
        operator = '*';
      } else if (trimmed.includes('/=')) {
        [left, right] = trimmed.split('/=', 2);
        operator = '/';
      }
      
      const varName = left.trim();
      const rightValue = right.trim();
      
      // 右辺の値を解析
      let rightNode: ASTNode;
      if (/^-?\d+(\.\d+)?$/.test(rightValue)) {
        rightNode = { type: 'Constant', value: Number(rightValue) };
      } else {
        rightNode = { type: 'Name', id: rightValue };
      }
      
      // i += 1 を i = i + 1 に変換
      return {
        type: 'Assign',
        targets: [{ type: 'Name', id: varName }],
        value: {
          type: 'BinOp',
          left: { type: 'Name', id: varName },
          op: { type: operator },
          right: rightNode
        },
        lineno: lineNumber
      };
    }
    
    // 代入文（比較演算子を除外）
    if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=') && !trimmed.includes('<=') && !trimmed.includes('>=')) {
      const [left, right] = trimmed.split('=', 2);
      // インラインコメントを除去
      const rightWithoutComment = right.includes('#') ? right.split('#')[0] : right;
      const rightTrimmed = rightWithoutComment.trim();
      
      // 右辺の式を解析
      let valueNode: ASTNode | undefined = undefined;
      
      // 複雑な式の解析
       const parsedExpression = this.parseExpression(rightTrimmed);
       if (parsedExpression) {
         valueNode = parsedExpression;
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
          const innerContent = rightTrimmed.slice(1, -1).trim();
          let elements: any[] = [];
          
          // 空配列でない場合のみ要素を解析
          if (innerContent.length > 0) {
            elements = innerContent.split(',').map((elem: string) => {
               const trimmedElem = elem.trim();
               if (/^-?\d+(\.\d+)?$/.test(trimmedElem)) {
                 return { type: 'Constant', value: Number(trimmedElem) };
               } else {
                 return { type: 'Constant', value: trimmedElem };
               }
             });
          }
          
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
          // 関数呼び出し（例: len(array), max(array), Calculator()）
          else if (rightTrimmed.includes('(') && rightTrimmed.includes(')')) {
            const funcCallMatch = rightTrimmed.match(/(\w+)\(([^)]*)\)/);
            if (funcCallMatch) {
              const [, funcName, argsString] = funcCallMatch;
              // Function call detected
              
              // 引数を解析
              const args = [];
              if (argsString.trim()) {
                const argList = argsString.split(',').map(arg => arg.trim());
                for (const arg of argList) {
                  if (/^-?\d+(\.\d+)?$/.test(arg)) {
                    args.push({ type: 'Constant', value: Number(arg) });
                  } else {
                    args.push({ type: 'Name', id: arg });
                  }
                }
              }
              
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
          // メソッド呼び出し（例: text.upper(), text.lower(), calc.add(5, 7)）
          else if (rightTrimmed.includes('.')) {
            const methodMatch = rightTrimmed.match(/(\w+)\.(\w+)\(([^)]*)\)/);
            if (methodMatch) {
              const [, objName, methodName, argsString] = methodMatch;
              
              // 引数を解析
              const args = [];
              if (argsString.trim()) {
                const argList = argsString.split(',').map(arg => arg.trim());
                for (const arg of argList) {
                  if (/^-?\d+(\.\d+)?$/.test(arg)) {
                    args.push({ type: 'Constant', value: Number(arg) });
                  } else {
                    args.push({ type: 'Name', id: arg });
                  }
                }
              }
              
              isVariable = true;
              valueNode = {
                type: 'Call',
                func: {
                  type: 'Attribute',
                  value: { type: 'Name', id: objName },
                  attr: methodName
                },
                args: args
              };
            } else {
              parsedValue = rightTrimmed;
            }
          }
          // 変数名（関数呼び出しでない場合のみ）
          else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rightTrimmed) && !rightTrimmed.includes('(')) {
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
        valueNode = { type: 'Name', id: rightTrimmed };
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
      // コメントがある場合は、最初の閉じ括弧を見つける
      let endParen = trimmed.indexOf(')', 6);
      if (endParen === -1) {
        endParen = trimmed.length;
      }
      const content = trimmed.slice(6, endParen); // print( と ) を除去
      
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
          // 文字列連結や変数名の処理
          const binOpMatch = trimmedArg.match(/(.+?)\s*\+\s*(.+)/);
          if (binOpMatch) {
            const [, left, right] = binOpMatch;
            const leftTrimmed = left.trim();
            const rightTrimmed = right.trim();
            
            // 左辺の解析
            let leftNode: ASTNode;
            if (leftTrimmed.startsWith('self.')) {
              leftNode = {
                type: 'Attribute',
                value: { type: 'Name', id: 'self' },
                attr: leftTrimmed.slice(5)
              };
            } else if (leftTrimmed.startsWith('"') && leftTrimmed.endsWith('"')) {
              leftNode = { type: 'Constant', value: leftTrimmed.slice(1, -1) };
            } else {
              leftNode = { type: 'Name', id: leftTrimmed };
            }
            
            // 右辺の解析
            let rightNode: ASTNode;
            if (rightTrimmed.startsWith('"') && rightTrimmed.endsWith('"')) {
              rightNode = { type: 'Constant', value: rightTrimmed.slice(1, -1) };
            } else {
              rightNode = { type: 'Name', id: rightTrimmed };
            }
            
            args.push({
              type: 'BinOp',
              left: leftNode,
              op: { type: 'Add' },
              right: rightNode
            });
          } else {
            // 単純な変数名
            args.push({ type: 'Name', id: trimmedArg });
          }
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
      
      // for item in list の形式をチェック
      const forInMatch = trimmed.match(/for\s+(\w+)\s+in\s+(\w+):?/);
      if (forInMatch) {
        const [, varName, iterName] = forInMatch;
        return {
          type: 'For',
          target: { type: 'Name', id: varName },
          iter: { type: 'Name', id: iterName },
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

    // クラス定義
    if (trimmed.startsWith('class ')) {
      const match = trimmed.match(/class\s+(\w+)(?:\(([^)]*)\))?:?/);
      if (match) {
        const className = match[1];
        const bases = match[2] ? [{ type: 'Name', id: match[2].trim() }] : [];
        return {
          type: 'ClassDef',
          name: className,
          bases: bases,
          body: [],
          lineno: lineNumber
        };
      }
    }

    // 関数定義
    if (trimmed.startsWith('def ')) {
      // 戻り値の型注釈を含む関数定義をパース (例: def func(a: int, b: int) -> int:)
      const match = trimmed.match(/def\s+(\w+)\(([^)]*)\)(?:\s*->\s*([^:]+))?:?/);
      if (match) {
        const [, funcName, paramsStr, returnType] = match;
        const params = paramsStr ? paramsStr.split(',').map(p => p.trim()) : [];
        
        const functionNode: ASTNode = {
          type: 'FunctionDef',
          name: funcName,
          args: {
            args: params.map(p => ({ type: 'arg', arg: p }))
          },
          body: [],
          lineno: lineNumber
        };
        
        // 戻り値の型注釈がある場合は追加
        if (returnType) {
          functionNode.returns = {
            type: 'Name',
            id: returnType.trim()
          };
        }
        
        return functionNode;
      }
    }
    
    // メソッド呼び出し（単独の文として）
    if (trimmed.includes('(') && trimmed.includes(')') && !trimmed.includes('=')) {
      // メソッド呼び出し（例: my_greeter.greet()）
      const methodCallMatch = trimmed.match(/(\w+)\.(\w+)\(([^)]*)\)/);
      if (methodCallMatch) {
        const [, objName, methodName, argsString] = methodCallMatch;
        
        // 引数を解析
        const args = [];
        if (argsString.trim()) {
          const argParts = argsString.split(',').map(arg => arg.trim());
          for (const arg of argParts) {
            // 文字列リテラル
            if ((arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith("'") && arg.endsWith("'"))) {
              args.push({ type: 'Constant', value: arg.slice(1, -1) });
            }
            // 数値
            else if (/^-?\d+(\.\d+)?$/.test(arg)) {
              args.push({ type: 'Constant', value: Number(arg) });
            }
            // 変数名
            else {
              args.push({ type: 'Name', id: arg });
            }
          }
        }
        
        return {
          type: 'Expr',
          value: {
            type: 'Call',
            func: {
              type: 'Attribute',
              value: { type: 'Name', id: objName },
              attr: methodName
            },
            args: args
          },
          lineno: lineNumber
        };
      }
      
      // 通常の関数呼び出し（例: print(), len()）
      const funcCallMatch = trimmed.match(/(\w+)\(([^)]*)\)/);
      if (funcCallMatch) {
        const [, funcName, argsString] = funcCallMatch;
        
        // 引数を解析
        const args = [];
        if (argsString.trim()) {
          const argParts = argsString.split(',').map(arg => arg.trim());
          for (const arg of argParts) {
            // 文字列リテラル
            if ((arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith("'") && arg.endsWith("'"))) {
              args.push({ type: 'Constant', value: arg.slice(1, -1) });
            }
            // 数値
            else if (/^-?\d+(\.\d+)?$/.test(arg)) {
              args.push({ type: 'Constant', value: Number(arg) });
            }
            // 変数名
            else {
              args.push({ type: 'Name', id: arg });
            }
          }
        }
        
        return {
          type: 'Expr',
          value: {
            type: 'Call',
            func: { type: 'Name', id: funcName },
            args: args
          },
          lineno: lineNumber
        };
      }
    }
    
    // デフォルト（式として扱う）
    // 比較演算子を含む式かどうかをチェック
    const compareMatch = trimmed.match(/(.*?)\s*(<=|>=|==|!=|<|>)\s*(.*)/); 
    if (compareMatch) {
      const [, left, op, right] = compareMatch;
      const leftValue = left.trim();
      const rightValue = right.trim();
      
      // 左辺の解析
      let leftNode: ASTNode;
      if (/^-?\d+(\.\d+)?$/.test(leftValue)) {
        leftNode = { type: 'Constant', value: Number(leftValue) };
      } else {
        // BinOp（例: x % 2）の解析
        const binOpMatch = leftValue.match(/(\w+)\s*(\+|-|\*|\/|%|\*\*|\/\/)\s*(\w+)/);
        if (binOpMatch) {
          const [, leftOp, operator, rightOp] = binOpMatch;
          leftNode = {
            type: 'BinOp',
            left: { type: 'Name', id: leftOp },
            op: { type: this.mapBinOp(operator) },
            right: /^-?\d+(\.\d+)?$/.test(rightOp) ? 
              { type: 'Constant', value: Number(rightOp) } : 
              { type: 'Name', id: rightOp }
          };
        } else {
          leftNode = { type: 'Name', id: leftValue };
        }
      }
      
      // 右辺の解析
      let rightNode: ASTNode;
      if (/^-?\d+(\.\d+)?$/.test(rightValue)) {
        rightNode = { type: 'Constant', value: Number(rightValue) };
      } else {
        rightNode = { type: 'Name', id: rightValue };
      }
      
      return {
        type: 'Expr',
        value: {
          type: 'Compare',
          left: leftNode,
          ops: [{ type: this.mapCompareOp(op) }],
          comparators: [rightNode]
        },
        lineno: lineNumber
      };
    }
    
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
    // console.log(`visitNode: ${node.type}`);
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
      case 'ClassDef':
        // Processing ClassDef node
        return this.visitClassDef(node);
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
    let varName = target.id || target.name || 'unknown';
    
    // self.nameの場合はnameに変換
    if (target.type === 'Attribute' && target.value && target.value.id === 'self') {
      varName = target.attr;
    } else if (target.type === 'Name' && target.id && target.id.startsWith('self.')) {
      // self.nameが単一のNameノードとして解析された場合
      varName = target.id.substring(5); // 'self.'を除去
    }
    
    // input関数の場合は特別な処理
    if (node.value.type === 'Call' && (node.value.func.id === 'input' || node.value.func.name === 'input')) {
      const prompt = node.value.args.length > 0 ? this.getValueString(node.value.args[0]) : '';
      
      // 変数を登録
      const dataType = 'STRING'; // inputは通常文字列を返す
      this.registerVariable(varName, dataType, node.lineno);
      
      // プロンプトがある場合は、OUTPUT文とINPUT文を分けて生成
       if (prompt) {
         const outputMeta: IRMeta = {};
         if (node.lineno !== undefined) {
           outputMeta.lineNumber = node.lineno;
         }
         
         const inputMeta: IRMeta = {
           name: varName,
           dataType
         };
         if (node.lineno !== undefined) {
           inputMeta.lineNumber = node.lineno;
         }
         
         const outputNode = this.createIRNode('output', `OUTPUT ${prompt}`, [], outputMeta);
         const inputNode = this.createIRNode('input', `INPUT ${varName}`, [], inputMeta);
         
         // 複数のIRノードを返すため、親ノードを作成
         const blockMeta: IRMeta = {};
         if (node.lineno !== undefined) {
           blockMeta.lineNumber = node.lineno;
         }
         
         return this.createIRNode('block', '', [outputNode, inputNode], blockMeta);
      } else {
        // プロンプトがない場合は従来通り
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
      
      // 型注釈から型を取得（空配列の場合）
      if (elements.length === 0) {
        if (node.value.elementType) {
          switch (node.value.elementType) {
            case 'str':
              elementType = 'STRING';
              break;
            case 'int':
              elementType = 'INTEGER';
              break;
            case 'float':
              elementType = 'REAL';
              break;
            default:
              elementType = 'STRING';
          }
        } else {
          // 型注釈がない場合はSTRINGをデフォルトとする
          elementType = 'STRING';
        }
      } else if (elements.length > 0) {
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
       let declareText;
       if (size === 0) {
         // 空配列の場合は適切なサイズで宣言（appendを想定して100要素）
         declareText = `DECLARE ${varName} : ARRAY[1:100] OF ${elementType}`;
       } else {
         declareText = `DECLARE ${varName} : ARRAY[1:${size}] OF ${elementType}`;
       }
       
       // 配列のサイズ情報を保存（後でforループで使用）
       this.context.arrayInfo = this.context.arrayInfo || {};
       this.context.arrayInfo[varName] = { size: size === 0 ? 0 : size, elementType, currentIndex: 0 };
      
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
       
       // 各要素の代入を追加（空配列の場合はスキップ）
       if (elements.length > 0) {
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
       }
       
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
      // 関数呼び出しの場合
      const funcName = node.value.func.id || node.value.func.name;
      // console.log(`visitAssign: funcName=${funcName}, isClassConstructor=${this.isClassConstructor(funcName)}`);
      
      // クラスのコンストラクタ呼び出しかどうかを判定
      if (this.isClassConstructor(funcName)) {
        // オブジェクトのインスタンス化
        const args = node.value.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        
        // DECLARE文とNEW文を生成
        const declareText = `DECLARE ${varName} : ${funcName}`;
        const newText = `${varName} ← NEW ${funcName}(${args})`;
        
        dataType = funcName as IGCSEDataType; // クラス名をデータ型として使用
        this.registerVariable(varName, dataType, node.lineno);
        
        // 複数のIRノードを返すため、親ノードを作成
        const declareMeta: IRMeta = {
          name: varName,
          dataType
        };
        if (node.lineno !== undefined) {
          declareMeta.lineNumber = node.lineno;
        }
        
        const assignMeta: IRMeta = {
          name: varName,
          dataType
        };
        if (node.lineno !== undefined) {
          assignMeta.lineNumber = node.lineno;
        }
        
        const declareIR = this.createIRNode('statement', declareText, [], declareMeta);
        const assignIR = this.createIRNode('assign', newText, [], assignMeta);
        
        const blockMeta: IRMeta = {};
        if (node.lineno !== undefined) {
          blockMeta.lineNumber = node.lineno;
        }
        
        return this.createIRNode('block', '', [declareIR, assignIR], blockMeta);
      } else {
        // 通常の関数呼び出し
        const callIR = this.visitCall(node.value, node.lineno, true);
        value = callIR.text;
        dataType = 'STRING'; // デフォルトとして文字列型を設定
        actualValue = value;
      }
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
    // console.log("visitExpr called with node:", JSON.stringify(node, null, 2)); console.log("node.value.type:", node.value.type);
    const value = node.value;
    
    if (value.type === 'Call') {
      // Calling visitCall for Call node
      // visitCallが正しいkindを返すのでそのまま使用
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
  private visitCall(node: ASTNode, lineNumber?: number, isAssignmentContext: boolean = false): IR {
    let funcName: string;
    let isMethodCall = false;
    let objectName = '';
    
    // メソッド呼び出しかどうかを判定
    if (node.func.type === 'Attribute') {
      // object.method() の形式
      objectName = this.getValueString(node.func.value);
      funcName = node.func.attr;
      isMethodCall = true;
    } else {
      // 通常の関数呼び出し
      funcName = node.func.id || node.func.name;
    }
    
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
        // プロンプトがある場合は、まずOUTPUTでプロンプトを表示
        if (node.args.length > 0) {
          const prompt = this.getValueString(node.args[0]);
          // プロンプトのOUTPUT文を作成
          const outputMeta: IRMeta = {};
          if (lineNumber !== undefined) {
            outputMeta.lineNumber = lineNumber;
          }
          const outputIR = this.createIRNode('output', `OUTPUT ${prompt}`, [], outputMeta);
          
          // INPUT文を作成
          const inputMeta: IRMeta = {};
          if (lineNumber !== undefined) {
            inputMeta.lineNumber = lineNumber;
          }
          const inputIR = this.createIRNode('input', 'INPUT', [], inputMeta);
          
          // 複合文として返す
          const compoundMeta: IRMeta = {};
          if (lineNumber !== undefined) {
            compoundMeta.lineNumber = lineNumber;
          }
          return this.createIRNode('compound', '', [outputIR, inputIR], compoundMeta);
        } else {
          // プロンプトなしの場合
          const inputMeta: IRMeta = {};
          if (lineNumber !== undefined) {
            inputMeta.lineNumber = lineNumber;
          }
          return this.createIRNode('input', 'INPUT', [], inputMeta);
        }
        
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
        
      case 'super':
        // super().__init__の処理
        const superMeta: IRMeta = { name: 'super' };
        if (lineNumber !== undefined) {
          superMeta.lineNumber = lineNumber;
        }
        
        // super()の引数を処理
        const superArgs = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        return this.createIRNode('statement', `CALL SUPER.NEW(${superArgs})`, [], superMeta);
        
      default:
        const callArgs = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        
        if (isMethodCall) {
          // メソッド呼び出しの場合
          let callText: string;
          let irKind: IRKind;
          
          // appendメソッドの特別処理
          if (funcName === 'append' && objectName) {
            // 配列情報を取得
            const arrayInfo = this.getArrayInfo(objectName);
            if (arrayInfo) {
              const currentIndex = arrayInfo.currentIndex + 1;
              const value = callArgs;
              callText = `${objectName}[${currentIndex}] ← ${value}`;
              
              // 配列情報を更新
              arrayInfo.currentIndex = currentIndex;
              arrayInfo.size = Math.max(arrayInfo.size, currentIndex);
              
              const assignMeta: IRMeta = { 
                name: objectName,
                index: currentIndex
              };
              if (lineNumber !== undefined) {
                assignMeta.lineNumber = lineNumber;
              }
              return this.createIRNode('assign', callText, [], assignMeta);
            }
          }
          
          // メソッド名に基づいて戻り値があるかを判定
          const hasReturn = this.methodHasReturn(funcName);
          
          if (hasReturn) {
            // 戻り値がある場合（関数）
            // メソッド名の変換を適用
            let convertedMethod: string;
            switch (funcName) {
              case 'upper':
                convertedMethod = 'UCASE';
                break;
              case 'lower':
                convertedMethod = 'LCASE';
                break;
              default:
                convertedMethod = funcName;
                break;
            }
            
            if (funcName === 'upper' || funcName === 'lower') {
              callText = `${convertedMethod}(${objectName})`;
            } else {
              callText = `${objectName}.${convertedMethod}(${callArgs})`;
            }
            irKind = 'expression';
          } else {
            // 戻り値がない場合（プロシージャ）
            // objectNameが空の場合はfuncNameのみ使用
            if (objectName) {
              callText = `CALL ${objectName}.${funcName}(${callArgs})`;
            } else {
              callText = `CALL ${funcName}(${callArgs})`;
            }
            irKind = 'statement';
          }
          
          const exprMeta: IRMeta = { name: funcName };
          if (lineNumber !== undefined) {
            exprMeta.lineNumber = lineNumber;
          }
          return this.createIRNode(irKind, callText, [], exprMeta);
        } else {
          // 通常の関数呼び出し
          // 関数かプロシージャかを判定（元の名前で検索）
          const functionInfo = this.findFunction(funcName);
          let callText: string;
          let irKind: IRKind;
          
          if (functionInfo && functionInfo.hasReturn) {
            // 関数の場合はそのまま（元の名前を使用）
            callText = `${funcName}(${callArgs})`;
            irKind = 'expression';
          } else if (functionInfo && !functionInfo.hasReturn) {
            // プロシージャの場合
            const convertedName = this.capitalizeFirstLetter(funcName);
            callText = `CALL ${convertedName}(${callArgs})`;
            irKind = 'statement';
          } else {
            // 関数が見つからない場合は、コンテキストに応じて判定
            if (isAssignmentContext) {
              // 代入文の右辺では関数として扱う（元の名前を使用）
              callText = `${funcName}(${callArgs})`;
              irKind = 'expression';
            } else {
              // 単独の文として使われる場合はプロシージャとして扱う
              const convertedName = this.capitalizeFirstLetter(funcName);
              callText = `CALL ${convertedName}(${callArgs})`;
              irKind = 'statement';
            }
          }
          
          const exprMeta: IRMeta = { name: funcName };
          if (lineNumber !== undefined) {
            exprMeta.lineNumber = lineNumber;
          }
          return this.createIRNode(irKind, callText, [], exprMeta);
        }
    }
  }

  /**
   * クラスのコンストラクタ呼び出しかどうかを判定
   */
  private isClassConstructor(funcName: string): boolean {
    // 一般的なクラス名のパターン（大文字で始まる）
    return /^[A-Z][a-zA-Z0-9]*$/.test(funcName);
  }

  /**
   * メソッドが戻り値を持つかどうかを判定
   */
  private methodHasReturn(methodName: string): boolean {
    // 一般的に戻り値を持つメソッド
    const returningMethods = [
      'add', 'subtract', 'multiply', 'divide',
      'get', 'calculate', 'compute', 'find',
      'length', 'size', 'count', 'sum',
      'upper', 'lower', 'substring', 'charAt'
    ];
    
    // 一般的に戻り値を持たないメソッド（プロシージャ）
    const nonReturningMethods = [
      'print', 'display', 'show', 'output',
      'set', 'update', 'insert', 'delete',
      'clear', 'reset', 'initialize',
      'greet', 'speak', 'move', 'run',
      'append', 'extend', 'remove', 'pop'
    ];
    
    if (returningMethods.includes(methodName)) {
      return true;
    }
    
    if (nonReturningMethods.includes(methodName)) {
      return false;
    }
    
    // デフォルトはプロシージャとして扱う
    return false;
  }

  /**
   * IF文の処理
   * 構造化されたconsequent/alternateフィールドでIF/ELSE/ENDIFをグループ化
   */
  private visitIf(node: ASTNode): IR {
    const condition = this.getValueString(node.test);
    const ifText = node.is_elif ? `ELSE IF ${condition} THEN` : `IF ${condition} THEN`;
    
    // THEN側のステートメント（consequent）
    this.increaseIndent();
    const consequent = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
    // ELSE側のステートメント（alternate）
    let alternate: IR[] = [];
    if (node.orelse && node.orelse.length > 0) {
      alternate = this.processElseChain(node.orelse);
    }
    
    const meta: IRMeta = {
      condition: condition,
      consequent: consequent
    };
    
    if (alternate.length > 0) {
      meta.alternate = alternate;
    }
    
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    // ENDIFはツリー上のノードとして残さず、emitter側で制御
    // hasReturnStatementのために子要素も設定
    const children = [...consequent, ...alternate];
    return this.createIRNode('if', ifText, children, meta);
  }
  
  /**
   * elif/elseチェーンの処理
   * 新しい構造化されたIF文に対応
   */
  private processElseChain(orelse: ASTNode[]): IR[] {
    const result: IR[] = [];
    
    if (orelse.length > 0) {
      const firstElse = orelse[0];
      
      if (firstElse.type === 'If') {
        // elif文の場合 - 再帰的にvisitIfを呼び出して構造化されたIF文として処理
        const elifIR = this.visitIf(firstElse);
        result.push(elifIR);
      } else {
        // 最終的なelse文の場合
        this.increaseIndent();
        const elseBodyChildren = orelse.map((child: ASTNode) => this.visitNode(child));
        this.decreaseIndent();
        
        const meta: IRMeta = {
          consequent: elseBodyChildren
        };
        
        const elseIR = this.createIRNode('else', 'ELSE', [], meta);
        result.push(elseIR);
      }
    }
    
    return result;
  }

  /**
   * FOR文の処理
   */
  private visitFor(node: ASTNode): IR {
    // visitFor function called
    this.debug(`visitFor called with target: ${node.target?.id}, iter type: ${node.iter?.type}, iter id: ${node.iter?.id}`);
    const varName = node.target.id;
    const iter = node.iter;
    
    let startValue = '0';
    let endValue = '9';
    let stepValue = '1';
    
    // for item in list の形式を最初にチェック
    if (iter.type === 'Name') {
      // for item in list の形式
      const arrayName = iter.id;
      this.debug(`Processing for-in loop: ${varName} in ${arrayName}`);
      
      // 配列の情報を取得
      const arrayInfo = this.getArrayInfo(arrayName);
      if (arrayInfo) {
        startValue = '1';
        if (arrayInfo.size > 0) {
          endValue = arrayInfo.size.toString();
        } else {
          // 空配列でappendされた要素がある場合はcurrentIndexを使用
          endValue = arrayInfo.currentIndex > 0 ? arrayInfo.currentIndex.toString() : '0';
        }
      } else {
        // 配列情報が不明な場合はLENGTH()を使用
        startValue = '1';
        endValue = `LENGTH(${arrayName})`;
      }
      
      // ループ変数をインデックス変数に変更し、配列要素へのアクセスに変換
      const indexVar = 'i';
      
      let forText = `FOR ${indexVar} ← ${startValue} TO ${endValue}`;
      
      // 変数を登録
      this.registerVariable(indexVar, 'INTEGER', node.lineno);
      
      // forスコープを開始
      this.enterScope('for', 'for');
      this.increaseIndent();
      
      // ボディ内でvarNameをarrayName[indexVar]に置換
      const bodyChildren = node.body.map((child: ASTNode) => {
        // print(varName) -> OUTPUT arrayName[indexVar] に変換
        if (child.type === 'Expr' && child.value.type === 'Call' && 
            child.value.func.id === 'print' && child.value.args.length === 1 &&
            child.value.args[0].type === 'Name' && child.value.args[0].id === varName) {
          const outputMeta: IRMeta = {};
          if (child.lineno !== undefined) {
            outputMeta.lineNumber = child.lineno;
          }
          return this.createIRNode('output', `OUTPUT ${arrayName}[${indexVar}]`, [], outputMeta);
        }
        return this.visitNode(child);
      });
      
      this.decreaseIndent();
      this.exitScope();
      
      const nextIR = this.createIRNode('statement', `NEXT ${indexVar}`);
      const children = [...bodyChildren, nextIR];
      
      const meta: IRMeta = {
        name: indexVar,
        startValue,
        endValue,
        stepValue: '1'
      };
      if (node.lineno !== undefined) {
        meta.lineNumber = node.lineno;
      }
      return this.createIRNode('for', forText, children, meta);
    }
    
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
    const startIG = start.toString();
    
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
    
    const bodyChildren: IR[] = [];
    let exitWhileIR: IR | null = null;
    
    // 各子ノードを処理し、break文を含むif文を特別に処理
    for (const child of node.body) {
      if (child.type === 'If' && this.hasBreakStatement(child)) {
        // break文を含むif文の場合、条件部分のみを処理してEXIT WHILEを外に出す
        const ifCondition = this.getValueString(child.test);
        const ifText = `IF ${ifCondition} THEN`;
        const ifIR = this.createIRNode('if', ifText, [], { condition: ifCondition });
        bodyChildren.push(ifIR);
        
        // EXIT WHILEを作成
        exitWhileIR = this.createIRNode('break', 'EXIT WHILE');
      } else {
        bodyChildren.push(this.visitNode(child));
      }
    }
    
    this.decreaseIndent();
    this.exitScope();
    
    // EXIT WHILEがある場合は追加
    if (exitWhileIR) {
      bodyChildren.push(exitWhileIR);
    }
    
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
    // break文を含むif文は除外して本体のみを処理
    const bodyChildren = node.body
      .filter((child: ASTNode) => {
        // break文を含むif文は除外
        if (child.type === 'If' && this.hasBreakStatement(child)) {
          return false;
        }
        return true;
      })
      .map((child: ASTNode) => this.visitNode(child));
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
    const funcName = node.name; // 元の名前で登録
    const displayName = this.capitalizeFirstLetter(node.name); // 表示用の名前
    const params = node.args.args.map((arg: ASTNode) => {
      // 型注釈を除去してパラメータ名のみを取得
      const paramName = arg.arg;
      return paramName.includes(':') ? paramName.split(':')[0].trim() : paramName;
    });
    
    // パラメータ情報を作成
    const parameterInfo: ParameterInfo[] = params.map((param: string) => ({
      name: param,
      type: 'STRING', // デフォルト型
      byReference: false
    }));
    
    // パラメータ（型注釈付き）
    const paramText = params.map((param: string) => `${param} : STRING`).join(', ');
    
    // 関数を現在のスコープに登録してからスコープを作成
    // これにより関数呼び出し時にfindFunctionで見つけられる
    this.registerFunction(funcName, parameterInfo, undefined, node.lineno);
    
    this.enterScope(funcName, 'function');
    this.increaseIndent();
    
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    
    this.decreaseIndent();
    this.exitScope();
    
    // return文があるかチェック
    const hasReturn = this.hasReturnStatement(bodyChildren);
    
    // 戻り値の型を推定（型注釈から）
    let returnType: IGCSEDataType = 'ANY';
    if (hasReturn && node.returns) {
      returnType = this.mapPythonTypeToIGCSE(node.returns);
    } else if (hasReturn) {
      returnType = this.inferReturnType(bodyChildren);
    }
    
    // 関数情報を更新（戻り値の有無を正しく設定）
    // 親スコープから関数を検索（現在のスコープは関数内部）
    const parentScope = this.context.currentScope.parent;
    const functionInfo = parentScope?.functions.get(funcName);
    if (functionInfo) {
      functionInfo.hasReturn = hasReturn;
      functionInfo.isFunction = hasReturn;
      functionInfo.returnType = hasReturn ? returnType : undefined;
    }
    
    // currentFunctionも更新（visitReturnとの整合性のため）
    if (this.context.currentFunction && this.context.currentFunction.name === funcName) {
      this.context.currentFunction.hasReturn = hasReturn;
      this.context.currentFunction.isFunction = hasReturn;
      this.context.currentFunction.returnType = hasReturn ? returnType : undefined;
    }
    
    let funcText: string;
    let endText: string;
    let irType: IRKind;
    
    if (hasReturn) {
      funcText = `FUNCTION ${displayName}(${paramText}) RETURNS ${returnType}`;
      endText = 'ENDFUNCTION';
      irType = 'function';
    } else {
      funcText = `PROCEDURE ${displayName}(${paramText})`;
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
   * クラス定義の処理
   */
  private visitClassDef(node: ASTNode): IR {
    const className = node.name;
    const baseClass = node.bases && node.bases.length > 0 ? node.bases[0].id : null;
    
    // クラスを登録
    this.registerClass(className, node.lineno);
    
    this.enterScope(className, 'class');
    this.increaseIndent();
    
    // クラス内のメンバーを処理
    const members: IR[] = [];
    const attributes: string[] = [];
    
    // まずコンストラクタから属性を抽出
    const constructor = node.body.find((item: ASTNode) => item.type === 'FunctionDef' && item.name === '__init__');
    if (constructor) {
      // コンストラクタ内のself.attribute代入を探す
      for (const stmt of constructor.body) {
        if (stmt.type === 'Assign' || stmt.type === 'AssignWithComment') {
          // AssignWithCommentの場合はassignプロパティから取得
          const assignNode = stmt.type === 'AssignWithComment' ? stmt.assign : stmt;
          const target = assignNode.targets[0];
          if (target.type === 'Attribute' && target.value && target.value.id === 'self') {
            // self.attributeの形式
            const attrName = target.attr;
            const attrType = 'STRING'; // デフォルト型
            attributes.push(`PRIVATE ${attrName} : ${attrType}`);
          } else if (target.type === 'Name' && target.id && target.id.startsWith('self.')) {
            // self.attributeが単一のNameノードとして解析された場合
            const attrName = target.id.substring(5); // 'self.'を除去
            const attrType = 'STRING'; // デフォルト型
            attributes.push(`PRIVATE ${attrName} : ${attrType}`);
          }
        }
      }
    }
    
    for (const item of node.body) {
      if (item.type === 'FunctionDef') {
        // メソッドの処理
        if (item.name === '__init__') {
          // コンストラクタをNEWプロシージャに変換
          const constructorIR = this.visitConstructor(item);
          members.push(constructorIR);
        } else {
          // 通常のメソッド
          const methodIR = this.visitMethod(item);
          members.push(methodIR);
        }
      } else if (item.type === 'Assign') {
        // クラス属性の処理
        const attrName = item.targets[0].id;
        let attrType: IGCSEDataType;
        let attrValue: string;
        
        // 値の型を推定
        if (item.value.type === 'Constant') {
          if (typeof item.value.value === 'number') {
            attrType = this.inferNumericType(item.value.value);
            attrValue = item.value.value.toString();
          } else if (typeof item.value.value === 'string') {
            attrType = 'STRING';
            attrValue = `"${item.value.value}"`;
          } else if (typeof item.value.value === 'boolean') {
            attrType = 'BOOLEAN';
            attrValue = item.value.value ? 'TRUE' : 'FALSE';
          } else {
            attrType = 'STRING';
            attrValue = `"${item.value.value}"`;
          }
        } else {
          attrType = inferDataType(item.value);
          const valueIR = this.visitNode(item.value);
          attrValue = valueIR.text;
        }
        
        // 型宣言と初期値代入の両方を追加
        attributes.push(`PRIVATE ${attrName} : ${attrType}`);
        attributes.push(`${attrName} ← ${attrValue}`);
      }
    }
    
    this.decreaseIndent();
    this.exitScope();
    
    // クラス定義のテキストを構築
    let classText: string;
    if (baseClass) {
      classText = `CLASS ${className} INHERITS ${baseClass}`;
    } else {
      classText = `CLASS ${className}`;
    }
    
    // 属性をメンバーの最初に追加
    const attributeIRs = attributes.map(attr => this.createIRNode('statement', attr));
    const allMembers = [...attributeIRs, ...members];
    
    const endClassIR = this.createIRNode('statement', 'ENDCLASS');
    const children = [...allMembers, endClassIR];
    
    const meta: IRMeta = {
      name: className,
      baseClass
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    
    return this.createIRNode('class', classText, children, meta);
  }
  
  /**
   * コンストラクタの処理
   */
  private visitConstructor(node: ASTNode): IR {
    const params = node.args.args.slice(1).map((arg: ASTNode) => {
      // selfを除外し、型注釈を除去
      const paramName = arg.arg;
      return paramName.includes(':') ? paramName.split(':')[0].trim() : paramName;
    });
    
    const paramText = params.map((param: string) => `initial${param.charAt(0).toUpperCase() + param.slice(1)} : STRING`).join(', ');
    
    // パラメータマッピングを設定（self.name = name → name ← initialName）
    this.context.parameterMapping = {};
    params.forEach((param: string) => {
      this.context.parameterMapping[param] = `initial${param.charAt(0).toUpperCase() + param.slice(1)}`;
    });
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
    const constructorText = `PUBLIC PROCEDURE NEW(${paramText})`;
    const endProcedureIR = this.createIRNode('statement', 'ENDPROCEDURE');
    const children = [...bodyChildren, endProcedureIR];
    
    // パラメータマッピングをクリア
    this.context.parameterMapping = {};
    
    return this.createIRNode('procedure', constructorText, children);
  }
  
  /**
   * メソッドの処理
   */
  private visitMethod(node: ASTNode): IR {
    const methodName = node.name;
    const params = node.args.args.slice(1).map((arg: ASTNode) => {
      // selfを除外し、型注釈を除去
      const paramName = arg.arg;
      return paramName.includes(':') ? paramName.split(':')[0].trim() : paramName;
    });
    
    const paramText = params.join(', ');
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
    // return文があるかチェック
    const hasReturn = this.hasReturnStatement(bodyChildren);
    
    let methodText: string;
    let endText: string;
    let irType: IRKind;
    
    if (hasReturn) {
      const returnType = this.inferReturnType(bodyChildren);
      methodText = `PUBLIC FUNCTION ${methodName}(${paramText}) RETURNS ${returnType}`;
      endText = 'ENDFUNCTION';
      irType = 'function';
    } else {
      methodText = `PUBLIC PROCEDURE ${methodName}(${paramText})`;
      endText = 'ENDPROCEDURE';
      irType = 'procedure';
    }
    
    const endIR = this.createIRNode('statement', endText);
    const children = [...bodyChildren, endIR];
    
    return this.createIRNode(irType, methodText, children);
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
    const attrName = node.attr;
    
    // self.attributeの場合は属性名のみを返す
    if (objName === 'self') {
      const meta: IRMeta = { name: attrName };
      if (node.lineno !== undefined) {
        meta.lineNumber = node.lineno;
      }
      return this.createIRNode('expression', attrName, [], meta);
    }
    
    // メソッド呼び出しの場合
    let convertedMethod: string;
    switch (attrName) {
      case 'upper':
        convertedMethod = 'UCASE';
        break;
      case 'lower':
        convertedMethod = 'LCASE';
        break;
      default:
        convertedMethod = attrName;
        break;
    }
    
    const text = `${convertedMethod}(${objName})`;
    const meta: IRMeta = { name: attrName };
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
        
        // パラメータマッピングがある場合は変換
        if (this.context.parameterMapping && this.context.parameterMapping[node.id]) {
          return this.context.parameterMapping[node.id];
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
        // console.log("getValueString Call case called");
        const callResult = this.visitCall(node, undefined);
        // CALLキーワードを除去して関数呼び出し部分のみを返す
        return callResult.text.replace(/^CALL /, '');
      case 'Attribute':
        const objName = this.getValueString(node.value);
        const attrName = node.attr;
        
        // selfの属性アクセスの場合は特別処理
        if (objName === 'self') {
          // コンストラクタ内でのself.nameはnameに変換
          return attrName;
        }
        
        // メソッド呼び出しの場合
        switch (attrName) {
          case 'upper':
            return `UCASE(${objName})`;
          case 'lower':
            return `LCASE(${objName})`;
          default:
            return `${objName}.${attrName}`;
        }
      case 'BinOp':
        const left = this.getValueString(node.left);
        const right = this.getValueString(node.right);
        const op = this.getOperatorString(node.op, node.left, node.right);
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
   * print文の引数を分割する（文字列内のカンマは無視、コメントで終了）
   */
  private splitPrintArgs(content: string): string[] {
    const args: string[] = [];
    let currentArg = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      // コメントが始まったら処理を終了（文字列内でない場合のみ）
      if (char === '#' && !inString) {
        break;
      }
      
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
   * 式を解析してASTノードを作成
   */
  private parseExpression(expr: string): ASTNode | null {
    const trimmed = expr.trim();
    
    // 比較演算子を含む式の解析（優先度が高い）
    const compareOperators = ['<=', '>=', '==', '!=', '<', '>'];
    
    for (const op of compareOperators) {
      const parts = this.splitByOperator(trimmed, op);
      if (parts.length > 1) {
        const leftPart = parts[0].trim();
        const rightPart = parts.slice(1).join(op).trim();
        
        return {
          type: 'Compare',
          left: this.parseSimpleValue(leftPart),
          ops: [{ type: this.mapCompareOp(op) }],
          comparators: [this.parseSimpleValue(rightPart)]
        };
      }
    }
    
    // 二項演算子を含む式の解析（優先度を考慮）
    // 注意: '//'は'/'より先に処理する必要がある
    const operators = ['+', '-', '*', '//', '/', '%', '**'];
    
    for (const op of operators) {
      const parts = this.splitByOperator(trimmed, op);
      if (parts.length > 1) {
        // 左結合で処理（最初の演算子から処理）
        const leftPart = parts[0].trim();
        const rightParts = parts.slice(1);
        const rightPart = rightParts.join(op).trim();
        
        const opTypeMap: Record<string, string> = {
          '+': 'Add',
          '-': 'Sub',
          '*': 'Mult',
          '/': 'Div',
          '//': 'FloorDiv',
          '%': 'Mod',
          '**': 'Pow'
        };
        
        return {
          type: 'BinOp',
          left: this.parseSimpleValue(leftPart),
          op: { type: opTypeMap[op] },
          right: this.parseExpression(rightPart) || this.parseSimpleValue(rightPart)
        };
      }
    }
    
    // 単純な値として解析
    return this.parseSimpleValue(trimmed);
  }

  /**
   * 演算子で文字列を分割（文字列リテラル内の演算子は無視）
   */
  private splitByOperator(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let currentPart = '';
    let inString = false;
    let stringChar = '';
    let i = 0;
    
    while (i < expr.length) {
      const char = expr[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentPart += char;
      } else if (inString && char === stringChar) {
        inString = false;
        currentPart += char;
      } else if (!inString && expr.substr(i, operator.length) === operator) {
        parts.push(currentPart);
        currentPart = '';
        i += operator.length - 1;
      } else {
        currentPart += char;
      }
      i++;
    }
    
    if (currentPart) {
      parts.push(currentPart);
    }
    
    return parts;
  }

  /**
   * 単純な値を解析してASTノードを作成
   */
  private parseSimpleValue(value: string): ASTNode {
    const trimmed = value.trim();
    
    // 文字列リテラル
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return {
        type: 'Constant',
        value: trimmed.slice(1, -1)
      };
    }
    
    // 数値
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return {
        type: 'Constant',
        value: Number(trimmed)
      };
    }
    
    // 配列リテラル
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const innerContent = trimmed.slice(1, -1).trim();
      let elements: any[] = [];
      
      // 空配列でない場合のみ要素を解析
      if (innerContent.length > 0) {
        elements = innerContent.split(',').map((elem: string) => {
          const trimmedElem = elem.trim();
          if (/^-?\d+(\.\d+)?$/.test(trimmedElem)) {
            return { type: 'Constant', value: Number(trimmedElem) };
          } else if ((trimmedElem.startsWith('"') && trimmedElem.endsWith('"')) ||
                     (trimmedElem.startsWith("'") && trimmedElem.endsWith("'"))) {
            return { type: 'Constant', value: trimmedElem.slice(1, -1) };
          } else {
            return { type: 'Name', id: trimmedElem };
          }
        });
      }
      
      return {
        type: 'ArrayLiteral',
        elements: elements
      };
    }
    
    // メソッド呼び出し（object.method()形式）
    const methodCallMatch = trimmed.match(/(\w+)\.(\w+)\(([^)]*)\)/);
    if (methodCallMatch) {
      const [, objectName, methodName, argsString] = methodCallMatch;
      
      // 引数を解析
      const args = [];
      if (argsString.trim()) {
        const argList = argsString.split(',').map(arg => arg.trim());
        for (const arg of argList) {
          if (/^-?\d+(\.\d+)?$/.test(arg)) {
            args.push({ type: 'Constant', value: Number(arg) });
          } else {
            args.push({ type: 'Name', id: arg });
          }
        }
      }
      
      return {
        type: 'Call',
        func: {
          type: 'Attribute',
          value: { type: 'Name', id: objectName },
          attr: methodName
        },
        args: args
      };
    }
    
    // 関数呼び出し（通常の関数）
    const funcCallMatch = trimmed.match(/(\w+)\(([^)]*)\)/);
    if (funcCallMatch) {
      const [, funcName, argsString] = funcCallMatch;
      
      // 引数を解析
      const args = [];
      if (argsString.trim()) {
        const argList = argsString.split(',').map(arg => arg.trim());
        for (const arg of argList) {
          if (/^-?\d+(\.\d+)?$/.test(arg)) {
            args.push({ type: 'Constant', value: Number(arg) });
          } else {
            args.push({ type: 'Name', id: arg });
          }
        }
      }
      
      return {
        type: 'Call',
        func: { type: 'Name', id: funcName },
        args: args
      };
    }

    // 配列アクセス
    const arrayAccessMatch = trimmed.match(/^(\w+)\[([\w\d]+)\]$/);
    if (arrayAccessMatch) {
      const [, arrayName, index] = arrayAccessMatch;
      return {
        type: 'ArrayAccess',
        array: { type: 'Name', id: arrayName },
        index: isNaN(parseInt(index)) ? index : parseInt(index)
      };
    }

    // 変数名
    return {
      type: 'Name',
      id: trimmed
    };
  }

  /**
   * オペランドが文字列かどうかを判定
   */
  private isStringOperand(node: ASTNode): boolean {
    if (!node) return false;
    
    switch (node.type) {
      case 'Constant':
        return typeof node.value === 'string';
      case 'Str':
        return true;
      case 'Name':
        // 変数の場合は登録された型情報を確認
        const varInfo = this.context.currentScope.variables.get(node.id);
        return varInfo ? varInfo.type === 'STRING' : false;
      case 'BinOp':
        // BinOpノードの場合、左右のオペランドをチェック
        return this.isStringOperand(node.left) || this.isStringOperand(node.right);
      default:
        return false;
    }
  }

  /**
   * 演算子を文字列として取得
   */
  private getOperatorString(op: ASTNode, left?: ASTNode, right?: ASTNode): string {
    // 文字列連結の場合は & を使用
    if (op.type === 'Add' && left && right) {
      const isLeftString = this.isStringOperand(left);
      const isRightString = this.isStringOperand(right);
      if (isLeftString || isRightString) {
        return '&';
      }
    }
    
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
      // 子要素も再帰的にチェック（IF文、ELSE文、その他の構造も含む）
      if (child.children && child.children.length > 0) {
        return this.hasReturnStatement(child.children);
      }
      return false;
    });
  }



  /**
   * 戻り値の型を推定
   */
  private inferReturnType(bodyChildren: IR[]): IGCSEDataType {
    // 簡単な実装：return文の値から型を推定
    for (const child of bodyChildren) {
      if (child.kind === 'return' || child.text.includes('RETURN')) {
        const returnValue = child.text.replace('RETURN ', '').trim();
        // 数値演算（乗算、除算、小数点を含む）かどうかチェック
        if (returnValue.includes('*') || returnValue.includes('/') || returnValue.includes('.')) {
          return 'REAL';
        }
        // 整数のみの場合
        if (/^\d+$/.test(returnValue) || (returnValue.includes('+') || returnValue.includes('-')) && !returnValue.includes('*') && !returnValue.includes('/')) {
          return 'INTEGER';
        }
        // 文字列かどうかチェック
        if (returnValue.startsWith('"') && returnValue.endsWith('"')) {
          return 'STRING';
        }
        // ブール値かどうかチェック
        if (returnValue === 'TRUE' || returnValue === 'FALSE') {
          return 'BOOLEAN';
        }
      }
      // 子要素も再帰的にチェック
      if (child.children && child.children.length > 0) {
        const childType = this.inferReturnType(child.children);
        if (childType !== 'STRING') {
          return childType;
        }
      }
    }
    // デフォルトはSTRING
    return 'STRING';
  }

  /**
   * Python型注釈をIGCSE型にマッピング
   */
  private mapPythonTypeToIGCSE(typeNode: any): IGCSEDataType {
    if (!typeNode) return 'STRING';
    
    if (typeNode.type === 'Name') {
      switch (typeNode.id) {
        case 'int': return 'INTEGER';
        case 'str': return 'STRING';
        case 'bool': return 'BOOLEAN';
        case 'float': return 'REAL';
        default: return 'STRING';
      }
    }
    
    return 'STRING';
  }

  /**
   * 数値リテラルの型を推定
   */
  private inferNumericType(value: any): IGCSEDataType {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    }
    return 'REAL';
  }

  /**
   * 配列情報を取得
   */
  private getArrayInfo(arrayName: string): any {
    if (!this.context.arrayInfo) {
      return null;
    }
    return this.context.arrayInfo[arrayName] || null;
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
   * 二項演算子をASTタイプにマッピング
   */
  private mapBinOp(op: string): string {
    const opMap: Record<string, string> = {
      '+': 'Add',
      '-': 'Sub',
      '*': 'Mult',
      '/': 'Div',
      '//': 'FloorDiv',
      '%': 'Mod',
      '**': 'Pow'
    };
    
    return opMap[op] || 'Add';
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

  /**
   * 文字列の最初の文字を大文字にする
   */
  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}