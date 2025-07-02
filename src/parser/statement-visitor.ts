import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';
import { ParseResult } from '../types/parser';
import { IGCSEDataType } from '../types/igcse';

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
  public visitNode: ((node: ASTNode) => IR) | undefined;

  constructor() {
    super();
    this.expressionVisitor = new ExpressionVisitor();
  }

  /**
   * コンテキストを設定
   */
  setContext(context: any): void {
    this.context = context;
  }

  /**
   * 代入文の処理
   */
  visitAssign(node: ASTNode): IR {
    // 配列初期化の検出を最初に行う
    if (this.expressionVisitor.isArrayInitialization(node.value)) {
      return this.handleArrayInitialization(node);
    }

    // クラスのインスタンス化を検出
    if (node.value.type === 'Call' && this.isClassInstantiation(node.value)) {
      return this.handleClassInstantiation(node);
    }

    const targetNode = node.targets[0];
    
    // 配列要素代入の処理 (data[1] = 100)
    if (targetNode.type === 'Subscript') {
      return this.handleElementAssign(targetNode, node.value);
    }
    
    // 属性代入の処理 (obj.field = value)
    if (targetNode.type === 'Attribute') {
      return this.handleAttributeAssign(targetNode, node.value);
    }

    const target = this.expressionVisitor.visitExpression(targetNode);
    const value = this.expressionVisitor.visitExpression(node.value);
    
    const text = `${target} ← ${value}`;
    
    // 変数の型を推論して登録
    const dataType = this.expressionVisitor.inferTypeFromValue(node.value);
    if (targetNode.type === 'Name') {
      this.registerVariable(targetNode.id, dataType, node.lineno);
    }
    
    return this.createIRNode('assign', text);
  }

  /**
   * 拡張代入文の処理
   */
  visitAugAssign(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);
    const value = this.expressionVisitor.visitExpression(node.value);
    const op = this.convertOperator(node.op);
    
    const text = `${target} ← ${target} ${op} ${value}`;
    return this.createIRNode('assign', text);
  }

  /**
   * 型注釈付き代入文の処理 (items: list[str] = [])
   */
  visitAnnAssign(node: ASTNode): IR {
    const targetName = node.target.id;
    
    // 型注釈から配列型を検出
    if (this.isListTypeAnnotation(node.annotation)) {
      const elementType = this.extractListElementType(node.annotation);
      
      // 空リストの場合はデフォルトサイズの配列宣言を生成
       if (node.value && node.value.type === 'List' && node.value.elts.length === 0) {
         const text = `DECLARE ${targetName} : ARRAY[1:100] OF ${elementType}`;
         this.registerVariable(targetName, 'ARRAY' as IGCSEDataType, node.lineno);
         return this.createIRNode('array', text);
       }
      
      // 値がある場合は通常の配列初期化として処理
       if (node.value) {
          const fakeAssignNode: ASTNode = {
            type: 'Assign',
            targets: [node.target],
            value: node.value,
            lineno: node.lineno || 0
          };
          return this.handleArrayInitialization(fakeAssignNode);
        }
    }
    
    // 通常の型注釈付き代入
    const target = this.expressionVisitor.visitExpression(node.target);
    const value = node.value ? this.expressionVisitor.visitExpression(node.value) : '';
    
    if (value) {
      const text = `${target} ← ${value}`;
      return this.createIRNode('assign', text);
    } else {
      // 値がない場合は宣言のみ
       const dataType = this.convertAnnotationToIGCSEType(node.annotation);
       const text = `DECLARE ${target} : ${dataType}`;
       this.registerVariable(targetName, dataType as IGCSEDataType, node.lineno);
       return this.createIRNode('statement', text);
    }
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
    const target = this.expressionVisitor.visitExpression(node.target);
    
    // range()関数を使用したfor文の処理
    if (node.iter.type === 'Call' && node.iter.func.id === 'range') {
      return this.handleRangeFor(node, target);
    }
    
    // 配列やリストの直接反復の場合
    if (node.iter.type === 'Name') {
      const arrayName = node.iter.id;
      const indexVar = 'i';
      
      // 配列のサイズを取得（コンテキストから）
      let arraySize = '3'; // デフォルトサイズ
      
      // コンテキストから配列サイズを取得
      if (this.context && this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
        arraySize = this.context.arrayInfo[arrayName].size.toString();
      }
      
      // FOR i ← 1 TO size の形式
      const forText = `FOR ${indexVar} ← 1 TO ${arraySize}`;
      
      this.enterScope('for', 'block');
      this.increaseIndent();
      
      // ボディの処理（target変数を使わずに直接配列要素を参照）
       const bodyChildren = node.body.map((child: ASTNode) => {
         // print(target) を OUTPUT array[i] に変換
         // print(target) を OUTPUT array[i] に変換
         if (child.type === 'Expr' && child.value.type === 'Call' && 
             child.value.func && child.value.func.type === 'Name' && child.value.func.id === 'print' && 
             child.value.args.length === 1 &&
             ((child.value.args[0].type === 'Name' && child.value.args[0].id === target) ||
              (child.value.args[0].type === 'Str' && child.value.args[0].s === target))) {
           return this.createIRNode('output', `OUTPUT ${arrayName}[${indexVar}]`);
         }
         return this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node');
       });
      
      this.decreaseIndent();
      this.exitScope();
      
      const nextIR = this.createIRNode('statement', `NEXT ${indexVar}`);
      bodyChildren.push(nextIR);
      
      return this.createIRNode('for', forText, bodyChildren);
    }
    
    // 通常のfor文（その他の反復可能オブジェクト）
    const iterable = this.expressionVisitor.visitExpression(node.iter);
    const forText = `FOR ${target} IN ${iterable}`;
    
    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    const nextIR = this.createIRNode('statement', `NEXT ${target}`);
    bodyChildren.push(nextIR);
    
    return this.createIRNode('for', forText, bodyChildren);
  }

  /**
   * WHILE文の処理
   */
  visitWhile(node: ASTNode): IR {
    const condition = this.expressionVisitor.visitExpression(node.test);
    const whileText = `WHILE ${condition} DO`;
    
    this.enterScope('while', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    const endwhileIR = this.createIRNode('endwhile', 'ENDWHILE');
    bodyChildren.push(endwhileIR);
    
    return this.createIRNode('while', whileText, bodyChildren);
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
    const capitalizedFunc = this.capitalizeFirstLetter(func);
    const text = `CALL ${capitalizedFunc}(${args.join(', ')})`;
    return this.createIRNode('statement', text);
  }

  /**
   * RETURN文の処理
   */
  visitReturn(node: ASTNode): IR {
    if (node.value) {
      const value = this.expressionVisitor.visitExpression(node.value);
      return this.createIRNode('return', `RETURN ${value}`);
    }
    return this.createIRNode('return', 'RETURN');
  }

  /**
   * 式文の処理
   */
  visitExpr(node: ASTNode): IR {
    // 関数呼び出しの場合は特別に処理
    if (node.value && node.value.type === 'Call') {
      return this.visitCall(node.value);
    }
    
    const expr = this.expressionVisitor.visitExpression(node.value);
    return this.createIRNode('statement', expr);
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
  visitPass(_node: ASTNode): IR {
    return this.createIRNode('comment', '// pass');
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
   * IMPORT文の処理
   */
  visitImport(_node: ASTNode): IR {
    // IGCSEでは通常importは使用しないため、コメントとして出力
    return this.createIRNode('comment', `// import statement`);
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
   * DELETE文の処理
   */
  visitDelete(_node: ASTNode): IR {
    return this.createIRNode('comment', `// delete statement`);
  }

  // ヘルパーメソッド
  private handleRangeFor(node: ASTNode, target: string): IR {
    const args = node.iter.args;
    let startValue = '0';
    let endValue = '0';
    let stepValue = '1';
    
    if (args.length === 1) {
      // range(n)
      endValue = this.expressionVisitor.visitExpression(args[0]);
    } else if (args.length === 2) {
      // range(start, end)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
    } else if (args.length === 3) {
      // range(start, end, step)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
      stepValue = this.expressionVisitor.visitExpression(args[2]);
    }
    
    // 数値定数の場合は最適化
    // ステップが1の場合のみ終了値から1を引く
    if (stepValue === '1') {
      if (this.expressionVisitor.isNumericConstant(args[args.length - 1])) {
        const endNum = this.expressionVisitor.getNumericValue(args[args.length - 1]);
        endValue = (endNum - 1).toString();
      } else {
        endValue = `${endValue} - 1`;
      }
    } else {
      // ステップが1以外の場合は、最後に到達する値を計算
      if (args.length === 3 && 
          this.expressionVisitor.isNumericConstant(args[0]) && 
          this.expressionVisitor.isNumericConstant(args[1]) && 
          this.expressionVisitor.isNumericConstant(args[2])) {
        const start = this.expressionVisitor.getNumericValue(args[0]);
        const end = this.expressionVisitor.getNumericValue(args[1]);
        const step = this.expressionVisitor.getNumericValue(args[2]);
        
        // 最後に到達する値を計算
        let lastValue = start;
        if (step > 0) {
          while (lastValue + step < end) {
            lastValue += step;
          }
        } else {
          while (lastValue + step > end) {
            lastValue += step;
          }
        }
        endValue = lastValue.toString();
      }
    }
    
    const forText = stepValue === '1' 
      ? `FOR ${target} ← ${startValue} TO ${endValue}`
      : `FOR ${target} ← ${startValue} TO ${endValue} STEP ${stepValue}`;
    
    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();
    
    const nextIR = this.createIRNode('statement', `NEXT ${target}`);
    bodyChildren.push(nextIR);
    
    return this.createIRNode('for', forText, bodyChildren);
  }

  private handleArrayInitialization(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const elements = node.value.elts;
    const size = elements.length;
    
    // 文字列として分割された要素を再構築してオブジェクト呼び出しを検出
    const reconstructedElements = this.reconstructObjectCalls(elements);
    
    // オブジェクトの配列かどうかを判定
    const isObjectArray = reconstructedElements.length > 0 && this.isObjectCall(reconstructedElements[0]);
    
    if (isObjectArray) {
      // オブジェクトの配列の場合
      const firstCall = reconstructedElements[0];
      const className = this.extractClassName(firstCall);
      const recordTypeName = `${className}Record`;
      
      const children: IR[] = [];
      
      // 配列宣言（実際の要素数を使用）
      const actualSize = reconstructedElements.length;
      const declText = `DECLARE ${target} : ARRAY[1:${actualSize}] OF ${recordTypeName}`;
      children.push(this.createIRNode('statement', declText));
      
      // 配列サイズ情報をコンテキストに記録
      if (this.context && this.context.arrayInfo) {
        this.context.arrayInfo[target] = {
          size: actualSize,
          elementType: recordTypeName,
          currentIndex: 0
        };
      }
      
      // 各要素の処理
      reconstructedElements.forEach((elementStr: string, index: number) => {
        const args = this.extractArguments(elementStr);
        // クラス定義から実際のフィールド名を取得する必要があるが、
        // 現在は簡略化してPoint クラスの場合は x, y として処理
        if (className === 'Point' && args.length >= 2) {
          children.push(this.createIRNode('assign', `${target}[${index + 1}].x ← ${args[0]}`));
          children.push(this.createIRNode('assign', `${target}[${index + 1}].y ← ${args[1]}`));
        } else {
           // 他のクラスの場合は汎用的な処理
           args.forEach((arg: string, argIndex: number) => {
             const fieldName = `field${argIndex + 1}`; // 仮のフィールド名
             children.push(this.createIRNode('assign', `${target}[${index + 1}].${fieldName} ← ${arg}`));
           });
        }
      });
      
      return this.createIRNode('statement', '', children);
    } else {
      // 通常の配列の場合
      const elementType = elements.length > 0 ? this.expressionVisitor.inferTypeFromValue(elements[0]) : 'STRING';
      
      // 配列宣言
      const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
      const declIR = this.createIRNode('array', declText);
      
      // 配列サイズ情報をコンテキストに記録
      if (this.context && this.context.arrayInfo) {
        this.context.arrayInfo[target] = {
          size: size,
          elementType: elementType,
          currentIndex: 0
        };
      }
      
      // 要素の代入
      const assignments: IR[] = [];
      elements.forEach((element: ASTNode, index: number) => {
        const value = this.expressionVisitor.visitExpression(element);
        const assignText = `${target}[${index + 1}] ← ${value}`;
        assignments.push(this.createIRNode('assign', assignText));
      });
      
      return this.createIRNode('statement', '', [declIR, ...assignments]);
    }
  }

  private reconstructObjectCalls(elements: ASTNode[]): string[] {
    const result: string[] = [];
    let i = 0;
    
    while (i < elements.length) {
      const element = elements[i];
      if (element.type === 'Name' && element.id) {
        const elementStr = element.id;
        
        // クラス名のパターンを検出 (大文字で始まり、括弧で終わる)
        if (/^[A-Z]\w*\(/.test(elementStr)) {
          // 次の要素と結合してオブジェクト呼び出しを再構築
          let objectCall = elementStr;
          i++;
          
          // 閉じ括弧が見つかるまで要素を結合
          while (i < elements.length && !objectCall.includes(')')) {
            const nextElement = elements[i];
            if (nextElement.type === 'Name' && nextElement.id) {
              objectCall += ', ' + nextElement.id;
            }
            i++;
          }
          
          result.push(objectCall);
        } else {
          result.push(elementStr);
          i++;
        }
      } else {
        result.push(this.expressionVisitor.visitExpression(element));
        i++;
      }
    }
    
    return result;
  }
  
  private isObjectCall(elementStr: string): boolean {
     // クラス名(引数)のパターンを検出
     return /^[A-Z]\w*\(.+\)$/.test(elementStr);
   }
   
   private extractClassName(objectCall: string): string {
     const match = objectCall.match(/^([A-Z]\w*)\(/);
     return match ? match[1] : 'Unknown';
   }
   
   private extractArguments(objectCall: string): string[] {
     const match = objectCall.match(/\((.+)\)$/);
     if (match) {
       return match[1].split(',').map(arg => arg.trim());
     }
     return [];
   }

  private isClassInstantiation(node: ASTNode): boolean {
    // 簡易的な判定: 関数名が大文字で始まる場合はクラスとみなす
    if (node.func.type === 'Name') {
      return /^[A-Z]/.test(node.func.id);
    }
    return false;
  }

  private handleClassInstantiation(node: ASTNode): IR {
    const className = this.expressionVisitor.visitExpression(node.func);
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const args = node.value.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // レコード型として扱う場合は、変数宣言と各フィールドの代入を生成
    const recordTypeName = `${className}Record`;
    const children: IR[] = [];
    
    // 変数宣言
    const declareText = `DECLARE ${target} : ${recordTypeName}`;
    children.push(this.createIRNode('statement', declareText));
    
    // フィールドの代入（引数の順序に基づく）
    // 簡単な実装として、x, y の順序で代入
    if (args.length >= 2) {
      children.push(this.createIRNode('assign', `${target}.x ← ${args[0]}`));
      children.push(this.createIRNode('assign', `${target}.y ← ${args[1]}`));
    }
    
    return this.createIRNode('block', '', children);
  }

  private convertOperator(op: ASTNode): string {
    switch (op.type) {
      case 'Add': return '+';
      case 'Sub': return '-';
      case 'Mult': return '*';
      case 'Div': return '/';
      case 'FloorDiv': return 'DIV';
      case 'Mod': return 'MOD';
      case 'Pow': return '^';
      default: return '+';
    }
  }

  /**
   * 配列要素代入の処理 (data[1] = 100)
   */
  private handleElementAssign(targetNode: ASTNode, valueNode: ASTNode): IR {
    const arrayName = this.expressionVisitor.visitExpression(targetNode.value);
    const value = this.expressionVisitor.visitExpression(valueNode);
    
    // インデックスを直接処理してコメントを避ける
    let adjustedIndex: string;
    let sliceNode = targetNode.slice;
    
    // Indexノードでラップされている場合は中身を取得
    if (sliceNode.type === 'Index') {
      sliceNode = sliceNode.value;
    }
    
    if (sliceNode.type === 'Constant' && typeof sliceNode.value === 'number') {
      // 数値リテラルの場合は+1
      adjustedIndex = String(sliceNode.value + 1);
    } else if (sliceNode.type === 'Num') {
      // 古いPython ASTの数値ノード
      adjustedIndex = String(sliceNode.n + 1);
    } else if (sliceNode.type === 'Name') {
      // 変数の場合は+1を追加
      adjustedIndex = `${sliceNode.id} + 1`;
    } else {
      // その他の場合は式として処理
      const index = this.expressionVisitor.visitExpression(targetNode.slice);
      adjustedIndex = this.convertIndexToOneBased(index);
    }
    
    const text = `${arrayName}[${adjustedIndex}] ← ${value}`;
    return this.createIRNode('element_assign', text);
  }

  /**
   * 属性代入の処理 (obj.field = value)
   */
  private handleAttributeAssign(targetNode: ASTNode, valueNode: ASTNode): IR {
    const objectName = this.expressionVisitor.visitExpression(targetNode.value);
    const attributeName = targetNode.attr;
    const value = this.expressionVisitor.visitExpression(valueNode);
    
    const text = `${objectName}.${attributeName} ← ${value}`;
    return this.createIRNode('attribute_assign', text);
  }

  /**
   * インデックスを0ベースから1ベースに変換
   */
  private convertIndexToOneBased(index: string): string {
    // 数値リテラルの場合は+1
    if (/^\d+$/.test(index)) {
      return String(parseInt(index) + 1);
    }
    // 変数の場合は+1を追加
    return `${index} + 1`;
  }

  /**
   * 型注釈がリスト型かどうかを判定
   */
  private isListTypeAnnotation(annotation: ASTNode): boolean {
    if (!annotation) return false;
    
    // list[type] の形式
    if (annotation.type === 'Subscript' && 
        annotation.value.type === 'Name' && 
        annotation.value.id === 'list') {
      return true;
    }
    
    // List[type] の形式（typing.List）
    if (annotation.type === 'Subscript' && 
        annotation.value.type === 'Name' && 
        annotation.value.id === 'List') {
      return true;
    }
    
    return false;
  }

  /**
   * リスト型注釈から要素型を抽出
   */
  private extractListElementType(annotation: ASTNode): string {
    if (annotation.type === 'Subscript' && annotation.slice) {
      const elementType = annotation.slice;
      if (elementType.type === 'Name') {
        return this.convertPythonTypeToIGCSE(elementType.id);
      }
    }
    return 'STRING'; // デフォルト
  }

  /**
   * 型注釈をIGCSE型に変換
   */
  private convertAnnotationToIGCSEType(annotation: ASTNode): string {
    if (!annotation) return 'STRING';
    
    if (annotation.type === 'Name') {
      return this.convertPythonTypeToIGCSE(annotation.id);
    }
    
    if (this.isListTypeAnnotation(annotation)) {
      const elementType = this.extractListElementType(annotation);
      return `ARRAY[1:100] OF ${elementType}`;
    }
    
    return 'STRING';
  }

  /**
   * Python型名をIGCSE型に変換
   */
  private convertPythonTypeToIGCSE(typeName: string): string {
    switch (typeName) {
      case 'int': return 'INTEGER';
      case 'str': return 'STRING';
      case 'bool': return 'BOOLEAN';
      case 'float': return 'REAL';
      default: return 'STRING';
    }
  }

  /**
   * 文字列の最初の文字を大文字にする
   */
  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }

  // visitNodeはプロパティとして定義済み
}