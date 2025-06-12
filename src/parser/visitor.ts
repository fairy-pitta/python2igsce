// Python ASTビジターパターンの実装
import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { BaseParser } from './base-parser';
import { inferDataType } from '../types/igcse';
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
          
          // インデントされた行を関数の本体として収集
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
        return {
          type: 'If',
          test: {
            type: 'Compare',
            left: { type: 'Name', id: left.trim() },
            ops: [{ type: this.mapCompareOp(op) }],
            comparators: [{ type: 'Constant', value: right.trim() }]
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
        return {
          type: 'If',
          test: {
            type: 'Compare',
            left: { type: 'Name', id: left.trim() },
            ops: [{ type: this.mapCompareOp(op) }],
            comparators: [{ type: 'Constant', value: right.trim() }]
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
    
    // 配列要素への代入（例: numbers[0] = 10）
    if (trimmed.includes('=') && trimmed.includes('[') && trimmed.includes(']') && !trimmed.includes('==')) {
      const match = trimmed.match(/(\w+)\[(\d+)\]\s*=\s*(.+)/);
      if (match) {
        const [, arrayName, index, value] = match;
        return {
          type: 'ArrayAssign',
          target: { type: 'Name', id: arrayName },
          index: parseInt(index),
          value: { type: 'Constant', value: value.trim() },
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
      const rightTrimmed = right.trim();
      
      // 右辺の式を解析
      let valueNode: ASTNode;
      
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
        // 単純な値
        valueNode = { type: 'Constant', value: rightTrimmed };
      }
      
      return {
        type: 'Assign',
        targets: [{ type: 'Name', id: left.trim() }],
        value: valueNode,
        lineno: lineNumber
      };
    }
    
    // print文
    if (trimmed.startsWith('print(')) {
      const content = trimmed.slice(6, -1); // print( と ) を除去
      
      let arg;
      
      // 配列アクセスを含むprint文の処理
      const arrayAccessMatch = content.match(/(\w+)\[(\d+)\]/);
      if (arrayAccessMatch) {
        const [, arrayName, index] = arrayAccessMatch;
        arg = {
          type: 'ArrayAccess',
          array: { type: 'Name', id: arrayName },
          index: parseInt(index)
        };
      } else if (content.startsWith('f"') && content.endsWith('"')) {
        // f-string処理
        const fStringContent = content.slice(2, -1); // f" と " を除去
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
        
        arg = {
          type: 'JoinedStr',
          values: parts
        };
      } else {
        arg = { type: 'Constant', value: content };
      }
      
      return {
        type: 'Expr',
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'print' },
          args: [arg]
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
      const match = trimmed.match(/for\s+(\w+)\s+in\s+range\(([^)]+)\)/);
      if (match) {
        const args = match[2].split(',').map(arg => ({
          type: 'Constant',
          value: arg.trim()
        }));
        
        return {
          type: 'For',
          target: { type: 'Name', id: match[1] },
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
        return this.visitFor(node);
      case 'While':
        return this.visitWhile(node);
      case 'RepeatUntil':
        return this.visitRepeatUntil(node);
      case 'FunctionDef':
        return this.visitFunctionDef(node);
      case 'Return':
        return this.visitReturn(node);
      case 'Comment':
        return this.visitComment(node);
      case 'ArrayInit':
        return this.visitArrayInit(node);
      case 'ArrayAssign':
        return this.visitArrayAssign(node);
      case 'ArrayAccess':
        return this.visitArrayAccess(node);
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
      
      // INPUT文のテキストを作成
      const inputText = prompt ? `INPUT ${prompt}, ${varName}` : `INPUT ${varName}`;
      
      const inputMeta: IRMeta = {
        name: varName,
        dataType
      };
      if (node.lineno !== undefined) {
        inputMeta.lineNumber = node.lineno;
      }
      
      return this.createIRNode('input', inputText, [], inputMeta);
    }
    
    const value = this.getValueString(node.value);
    
    // 変数を登録
    const dataType = inferDataType(value);
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
    const value = node.value;
    
    if (value.type === 'Call') {
      return this.visitCall(value, node.lineno);
    }
    
    const text = this.getValueString(value);
    return this.createIRNode('expression', text);
  }

  /**
   * 関数呼び出しの処理
   */
  private visitCall(node: ASTNode, lineNumber?: number): IR {
    const funcName = node.func.id || node.func.name;
    
    switch (funcName) {
      case 'print':
        const args = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        const outputMeta: IRMeta = {};
        if (lineNumber !== undefined) {
          outputMeta.lineNumber = lineNumber;
        }
        return this.createIRNode('output', `OUTPUT ${args}`, [], outputMeta);
        
      case 'input':
        const prompt = node.args.length > 0 ? this.getValueString(node.args[0]) : '';
        const inputText = prompt ? `INPUT ${prompt}` : 'INPUT';
        const inputMeta: IRMeta = {};
        if (lineNumber !== undefined) {
          inputMeta.lineNumber = lineNumber;
        }
        return this.createIRNode('input', inputText, [], inputMeta);
        
      default:
        const callArgs = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        const callText = `${funcName}(${callArgs})`;
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
    
    const elseChildren: IR[] = [];
    if (node.orelse && node.orelse.length > 0) {
      // orelse配列の最初の要素をチェック
      const firstElse = node.orelse[0];
      
      if (firstElse.type === 'If') {
        // elif文の場合: "ELSE IF" として処理
        const elifCondition = this.getValueString(firstElse.test);
        const elseIfIR = this.createIRNode('elseif', `ELSE IF ${elifCondition} THEN`);
        const elifBodyChildren = firstElse.body.map((child: ASTNode) => this.visitNode(child));
        elseChildren.push(elseIfIR, ...elifBodyChildren);
        
        // 再帰的にelif/elseチェーンを処理
        if (firstElse.orelse && firstElse.orelse.length > 0) {
          const nestedElseChildren = this.processElseChain(firstElse.orelse);
          elseChildren.push(...nestedElseChildren);
        }
      } else {
        // 通常のelse文の場合
        const elseIR = this.createIRNode('else', 'ELSE');
        const elseBodyChildren = node.orelse.map((child: ASTNode) => this.visitNode(child));
        elseChildren.push(elseIR, ...elseBodyChildren);
      }
    }
    
    this.decreaseIndent();
    const endifIR = this.createIRNode('endif', 'ENDIF');
    
    const children = [...bodyChildren, ...elseChildren, endifIR];
    
    const meta: IRMeta = {
      condition
    };
    if (node.lineno !== undefined) {
      meta.lineNumber = node.lineno;
    }
    return this.createIRNode('if', ifText, children, meta);
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
        const elifBodyChildren = firstElse.body.map((child: ASTNode) => this.visitNode(child));
        result.push(elseIfIR, ...elifBodyChildren);
        
        // 再帰的に次のelif/elseを処理
        if (firstElse.orelse && firstElse.orelse.length > 0) {
          const nestedElseChildren = this.processElseChain(firstElse.orelse);
          result.push(...nestedElseChildren);
        }
      } else {
        // 最終的なelse文の場合
        const elseIR = this.createIRNode('else', 'ELSE');
        const elseBodyChildren = orelse.map((child: ASTNode) => this.visitNode(child));
        result.push(elseIR, ...elseBodyChildren);
      }
    }
    
    return result;
  }

  /**
   * FOR文の処理
   */
  private visitFor(node: ASTNode): IR {
    const varName = node.target.id;
    const iter = node.iter;
    
    let startValue = '0';
    let endValue = '9';
    let stepValue = '1';
    
    if (iter.type === 'Call' && iter.func.id === 'range') {
      const args = iter.args;
      if (args.length === 1) {
        // range(n) -> 0 to n-1
        startValue = '0';
        const n = parseInt(this.getValueString(args[0]));
        endValue = (n - 1).toString();
      } else if (args.length === 2) {
        // range(start, end) -> start to end-1
        startValue = this.getValueString(args[0]);
        const end = parseInt(this.getValueString(args[1]));
        endValue = (end - 1).toString();
      } else if (args.length === 3) {
        // range(start, end, step)
        startValue = this.getValueString(args[0]);
        const end = parseInt(this.getValueString(args[1]));
        stepValue = this.getValueString(args[2]);
        const step = parseInt(stepValue);
        
        if (step > 0) {
          // 正のstep: start to end-1
          endValue = (end - 1).toString();
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
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
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

  /**
   * WHILE文の処理
   */
  private visitWhile(node: ASTNode): IR {
    const condition = this.getValueString(node.test);
    const whileText = `WHILE ${condition}`;
    
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => this.visitNode(child));
    this.decreaseIndent();
    
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
    
    // パラメータ情報を作成
    const parameterInfo: ParameterInfo[] = params.map((param: string) => ({
      name: param,
      type: 'STRING', // デフォルト型
      byReference: false
    }));
    
    // 関数を登録（戻り値の有無は後で判定）
    this.registerFunction(funcName, parameterInfo, undefined, node.lineno);
    
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
      funcText = `FUNCTION ${funcName}(${paramText}) RETURNS INTEGER`;
      endText = 'ENDFUNCTION';
      irType = 'function';
    } else {
      funcText = `PROCEDURE ${funcName}(${paramText})`;
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
    const value = node.value ? this.getValueString(node.value) : '';
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
      index
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
    const index = node.index + 1; // Pythonの0ベースからIGCSEの1ベースに変換
    
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
   * 値を文字列として取得
   */
  private getValueString(node: ASTNode): string {
    if (!node) return '';
    
    switch (node.type) {
      case 'Constant':
        return String(node.value);
      case 'Name':
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
        return parts.join(', ');
      case 'Call':
        const funcName = node.func.id || node.func.name;
        if (funcName === 'input') {
          const prompt = node.args.length > 0 ? this.getValueString(node.args[0]) : '';
          return prompt ? `INPUT(${prompt})` : 'INPUT()';
        }
        const args = node.args.map((arg: ASTNode) => this.getValueString(arg)).join(', ');
        return `${funcName}(${args})`;
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
        const index = node.index + 1; // Pythonの0ベースからIGCSEの1ベースに変換
        return `${arrayName}[${index}]`;
      default:
        return node.value || node.id || 'unknown';
    }
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
      'Eq': '=',
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
}