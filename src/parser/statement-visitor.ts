import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';
import { ParseResult } from '../types/parser';

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
 * クラス定義情報
 */
interface ClassInfo {
  name: string;
  recordTypeName?: string; // レコード型の場合の型名
  fields: { name: string; type: string }[];
  isRecordType: boolean;
}

/**
 * 文の処理を担当するビジタークラス
 */
export class StatementVisitor extends BaseParser {
  /**
   * パースの実行（StatementVisitorでは使用しない）
   */
  override async parse(_source: string): Promise<ParseResult> {
    throw new Error('StatementVisitor.parse should not be called directly');
  }
  private expressionVisitor: ExpressionVisitor;
  public visitNode: ((node: ASTNode) => IR) | undefined;
  private classRegistry: Map<string, ClassInfo> = new Map();

  constructor() {
    super();
    this.expressionVisitor = new ExpressionVisitor();
  }

  /**
   * クラス情報を登録
   */
  override registerClass(name: string, line?: number): void {
    // 基底クラスのメソッドを呼び出し
    super.registerClass(name, line);
  }

  // クラス情報を登録する新しいメソッド
  registerClassInfo(classInfo: ClassInfo): void {
    this.classRegistry.set(classInfo.name, classInfo);
  }

  /**
   * クラス情報を取得
   */
  getClassInfo(className: string): ClassInfo | undefined {
    return this.classRegistry.get(className);
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

    // input()関数の特別処理
    if (this.isInputCall(node.value)) {
      return this.handleInputAssignment(node);
    }

    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const value = this.expressionVisitor.visitExpression(node.value);
    
    const text = `${target} ← ${value}`;
    
    // 変数の型を推論して登録
    const dataType = this.expressionVisitor.inferTypeFromValue(node.value);
    if (node.targets[0].type === 'Name') {
      this.registerVariable(node.targets[0].id, dataType, node.lineno);
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
      
      // 配列の長さを取得するためのコメント
      const lengthComment = this.createIRNode('comment', `// Iterating through ${arrayName}`);
      
      // 配列のサイズを静的に決定できるかチェック
      const arraySize = this.getStaticArraySize(arrayName);
      const forText = arraySize 
        ? `FOR ${indexVar} ← 1 TO ${arraySize}`
        : `FOR ${indexVar} ← 1 TO LENGTH(${arrayName})`;
      
      this.enterScope('for', 'block');
      this.increaseIndent();
      
      // ボディ内で target = array[i] の代入を追加
      const assignmentIR = this.createIRNode('statement', `${target} ← ${arrayName}[${indexVar}]`);
      
      const bodyChildren = [assignmentIR];
      bodyChildren.push(...node.body.map((child: ASTNode) => 
        this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
      ));
      
      this.decreaseIndent();
      this.exitScope();
      
      const nextIR = this.createIRNode('statement', `NEXT ${indexVar}`);
      bodyChildren.push(nextIR);
      
      return this.createIRNode('for', forText, [lengthComment, ...bodyChildren]);
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
    let condition = this.expressionVisitor.visitExpression(node.test);
    
    // Keep Python True as is for IGCSE compatibility
    
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
      // f-stringの特別な処理
      if (node.args.length === 1 && node.args[0].type === 'JoinedStr') {
        const fStringArg = node.args[0];
        const convertedArg = this.expressionVisitor.visitExpression(fStringArg);
        const text = `OUTPUT ${convertedArg}`;
        return this.createIRNode('output', text);
      } else {
        const text = `OUTPUT ${args.join(' & ')}`;
        return this.createIRNode('output', text);
      }
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
    return this.createIRNode('comment', '// continue statement');
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
  private isInputCall(node: ASTNode): boolean {
    // 直接のinput()呼び出し
    if (node.type === 'Call' && node.func.id === 'input') {
      return true;
    }
    
    // float(input(...)) や int(input(...)) の形式
    if (node.type === 'Call' && 
        (node.func.id === 'float' || node.func.id === 'int') &&
        node.args.length === 1 &&
        node.args[0].type === 'Call' &&
        node.args[0].func.id === 'input') {
      return true;
    }
    
    return false;
  }

  private handleInputAssignment(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    let prompt = '';
    
    // input()の引数（プロンプト）を取得
    let inputNode = node.value;
    if (inputNode.type === 'Call' && (inputNode.func.id === 'float' || inputNode.func.id === 'int')) {
      inputNode = inputNode.args[0]; // float(input(...)) -> input(...)
    }
    
    if (inputNode.args && inputNode.args.length > 0) {
      prompt = this.expressionVisitor.visitExpression(inputNode.args[0]);
    }
    
    // 変数の型を推論して登録
    const dataType = this.expressionVisitor.inferTypeFromValue(node.value);
    if (node.targets[0].type === 'Name') {
      this.registerVariable(node.targets[0].id, dataType, node.lineno);
    }
    
    // プロンプトがある場合は、OUTPUT文とINPUT文を同じ行に生成
    if (prompt) {
      return this.createIRNode('input', `OUTPUT ${prompt} INPUT ${target}`);
    } else {
      return this.createIRNode('input', `INPUT ${target}`);
    }
  }

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
    // ただし、LENGTH()関数の場合は引かない
    if (stepValue === '1') {
      if (this.expressionVisitor.isNumericConstant(args[args.length - 1])) {
        const endNum = this.expressionVisitor.getNumericValue(args[args.length - 1]);
        endValue = (endNum - 1).toString();
      } else if (!endValue.startsWith('LENGTH(')) {
        endValue = `${endValue} - 1`;
      }
      // LENGTH()の場合はそのまま使用（すでに正しい上限値）
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
    
    // 空のリストで型アノテーションがある場合の処理
    if (node.value.type === 'List' && node.value.elts.length === 0 && node.type_comment) {
      // list[str] -> STRING, list[int] -> INTEGER のように変換
      let elementType = 'STRING';
      const typeComment = node.type_comment.toLowerCase();
      if (typeComment.includes('int')) {
        elementType = 'INTEGER';
      } else if (typeComment.includes('float') || typeComment.includes('real')) {
        elementType = 'REAL';
      } else if (typeComment.includes('bool')) {
        elementType = 'BOOLEAN';
      }
      
      // デフォルトサイズは100とする（IGCSE標準）
      const defaultSize = 100;
      
      // 配列サイズ情報を変数として登録
      this.registerVariable(target, 'ARRAY', undefined, defaultSize);
      
      const declText = `DECLARE ${target} : ARRAY[1:${defaultSize}] OF ${elementType}`;
      return this.createIRNode('array', declText);
    }
    
    // [0] * 5 のような配列初期化パターンの処理
    if (node.value.type === 'BinOp' && node.value.op.type === 'Mult') {
      let size: number;
      let elementType: string;
      
      if (node.value.left.type === 'List' && node.value.right.type === 'Constant') {
        // [0] * 5 パターン
        size = node.value.right.value;
        const firstElement = node.value.left.elts[0];
        elementType = this.expressionVisitor.inferTypeFromValue(firstElement);
      } else if (node.value.right.type === 'List' && node.value.left.type === 'Constant') {
        // 5 * [0] パターン
        size = node.value.left.value;
        const firstElement = node.value.right.elts[0];
        elementType = this.expressionVisitor.inferTypeFromValue(firstElement);
      } else {
        // フォールバック
        size = 10;
        elementType = 'INTEGER';
      }
      
      // 配列宣言のみを生成（初期化は行わない）
      const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
      return this.createIRNode('array', declText);
    }
    
    // 通常のリスト初期化の処理
    const elements = node.value.elts;
    const size = elements.length;
    
    // オブジェクトの配列かどうかを判定
    const isObjectArray = elements.length > 0 && elements[0].type === 'Call' && this.isClassInstantiation(elements[0]);
    
    if (isObjectArray) {
      // オブジェクトの配列の場合
      const className = elements[0].func.id; // 直接func.idを取得
      const recordTypeName = `${className}Record`;
      
      const children: IR[] = [];
      
      // 配列宣言
      const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${recordTypeName}`;
      children.push(this.createIRNode('statement', declText));
      
      // 各要素の処理
      elements.forEach((element: ASTNode, index: number) => {
        if (element.type === 'Call' && this.isClassInstantiation(element)) {
          const args = element.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
          // 簡単な実装として、x, y の順序で代入
          if (args.length >= 2) {
            children.push(this.createIRNode('assign', `${target}[${index + 1}].x ← ${args[0]}`));
            children.push(this.createIRNode('assign', `${target}[${index + 1}].y ← ${args[1]}`));
          }
        }
      });
      
      return this.createIRNode('statement', '', children);
    } else {
      // 通常の配列の場合
      const elementType = elements.length > 0 ? this.expressionVisitor.inferTypeFromValue(elements[0]) : 'STRING';
      
      // 配列宣言
      const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
      const declIR = this.createIRNode('array', declText);
      
      // 配列サイズ情報を変数として登録
      this.registerVariable(target, 'ARRAY', undefined, size);
      
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

  private isClassInstantiation(node: ASTNode): boolean {
    // 簡易的な判定: 関数名が大文字で始まる場合はクラスとみなす
    if (node.func.type === 'Name') {
      return /^[A-Z]/.test(node.func.id);
    }
    return false;
  }

  private handleClassInstantiation(node: ASTNode): IR {
    const className = this.expressionVisitor.visitExpression(node.value.func);
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const args = node.value.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // クラス情報を取得
    const classInfo = this.getClassInfo(className);
    
    if (classInfo && classInfo.isRecordType) {
      // レコード型として扱う場合
      const recordTypeName = classInfo.recordTypeName || `${className}Record`;
      const children: IR[] = [];
      
      // 変数宣言
      const declareText = `DECLARE ${target} : ${recordTypeName}`;
      children.push(this.createIRNode('statement', declareText));
      
      // フィールドの代入（クラス定義から取得したフィールド名を使用）
      classInfo.fields.forEach((field, index) => {
        if (index < args.length) {
          children.push(this.createIRNode('assign', `${target}.${field.name} ← ${args[index]}`));
        }
      });
      
      return this.createIRNode('block', '', children);
    } else {
      // クラス情報が見つからない場合のフォールバック
      const children: IR[] = [];
      
      // 変数宣言（RECORDタイプとして）
      const declareText = `DECLARE ${target} : RECORD`;
      children.push(this.createIRNode('statement', declareText));
      
      // デフォルトのフィールド名を使用
      const defaultFields = ['x', 'y', 'z', 'w']; // 必要に応じて拡張
      args.forEach((arg: any, index: number) => {
        if (index < defaultFields.length) {
          children.push(this.createIRNode('assign', `${target}.${defaultFields[index]} ← ${arg}`));
        }
      });
      
      return this.createIRNode('block', '', children);
    }
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

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }

  /**
   * 配列の静的サイズを取得
   */
  private getStaticArraySize(arrayName: string): number | null {
    // 変数情報から配列サイズを取得
    const varInfo = this.getVariableInfo(arrayName);
    if (varInfo && varInfo.arraySize) {
      return varInfo.arraySize;
    }
    return null;
  }

  /**
   * 文字列の最初の文字を大文字にする
   */
  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // visitNodeはプロパティとして定義済み
}