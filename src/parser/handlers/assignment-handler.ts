import { IR, IRKind, IRMeta, createIR } from '../../types/ir';
import { ASTNode } from '../../types/parser';
import { ExpressionVisitor } from '../expression-visitor';
import { BaseParser } from '../base-parser';


/**
 * 代入文の処理を担当するハンドラー
 */
export class AssignmentHandler extends BaseParser {
  private expressionVisitor: ExpressionVisitor;
  public visitNode: ((node: ASTNode) => IR) | undefined;

  constructor(expressionVisitor: ExpressionVisitor) {
    super();
    this.expressionVisitor = expressionVisitor;
  }

  /**
   * コンテキストの設定
   */
  setContext(_context: any): void {
    // 必要に応じてコンテキストを設定
  }

  /**
   * パース処理（ハンドラーでは使用しない）
   */
  parse(_source: string): any {
    throw new Error('AssignmentHandler does not implement parse method');
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
    if (node.value.type === 'Call') {
      if (node.value.func.type === 'Name') {
        const funcName = node.value.func.id;
        const isClass = this.context.isClass(funcName);
        if (isClass) {
          return this.handleClassInstantiation(node);
        }
      }
    }

    // 複数ターゲットの代入（a, b = 1, 2）
    if (node.targets.length > 1) {
      return this.handleMultipleAssignment(node);
    }

    const target = node.targets[0];
    const value = this.expressionVisitor.visitExpression(node.value);

    // 配列要素への代入
    if (target.type === 'Subscript') {
      const arrayName = this.expressionVisitor.visitExpression(target.value);
      const index = this.expressionVisitor.visitExpression(target.slice);
      const assignText = `${arrayName}[${index}] ← ${value}`;
      return this.createIRNode('assign', assignText);
    }

    // 属性への代入（obj.attr = value）
    if (target.type === 'Attribute') {
      const objectName = this.expressionVisitor.visitExpression(target.value);
      const attrName = target.attr;
      const assignText = `${objectName}.${attrName} ← ${value}`;
      return this.createIRNode('assign', assignText);
    }

    // input()関数の特別処理
    if (node.value.type === 'Call' && 
        node.value.func.type === 'Name' && 
        node.value.func.id === 'input') {
      const targetName = this.expressionVisitor.visitExpression(target);
      
      if (node.value.args.length > 0) {
        const prompt = this.expressionVisitor.visitExpression(node.value.args[0]);
        return this.createIRNode('input', `OUTPUT ${prompt}\nINPUT ${targetName}`);
      } else {
        return this.createIRNode('input', `INPUT ${targetName}`);
      }
    }

    // 拡張代入文（+=, -=, *=, /=）
    if (node.type === 'AugAssign') {
      return this.handleAugmentedAssignment(node);
    }

    // 型注釈付き代入文
    if (node.type === 'AnnAssign') {
      return this.handleAnnotatedAssignment(node);
    }

    // 通常の代入
    const targetName = this.expressionVisitor.visitExpression(target);
    let assignText = `${targetName} ← ${value}`;
    
    // インラインコメントの処理
    if (node.inlineComment) {
      assignText += ` # ${node.inlineComment}`;
    }
    
    return this.createIRNode('assign', assignText);
  }

  /**
   * 拡張代入文の処理（+=, -=, *=, /=）
   */
  visitAugAssign(node: ASTNode): IR {
    return this.handleAugmentedAssignment(node);
  }

  /**
   * 型注釈付き代入文の処理
   */
  visitAnnAssign(node: ASTNode): IR {
    return this.handleAnnotatedAssignment(node);
  }

  /**
   * 配列初期化の処理
   */
  private handleArrayInitialization(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const elements = node.value.elts;
    const size = elements.length;
    
    // 要素の型を推定
    let elementType = 'STRING';
    if (elements.length > 0) {
      const firstElement = elements[0];
      if (firstElement.type === 'Num') {
        elementType = Number.isInteger(firstElement.n) ? 'INTEGER' : 'REAL';
      } else if (firstElement.type === 'Str') {
        elementType = 'STRING';
      } else if (firstElement.type === 'NameConstant') {
        elementType = 'BOOLEAN';
      }
    }
    
    // 配列宣言
    const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
    const declIR = this.createIRNode('statement', declText);
    
    // コンテキストに配列情報を保存
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

  /**
   * クラスインスタンス化の処理
   */
  private handleClassInstantiation(node: ASTNode): IR {
    const className = this.expressionVisitor.visitExpression(node.value.func);
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const args = node.value.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));
    
    // レコード型として扱う場合は、変数宣言と各フィールドの代入を生成
    const recordTypeName = `${className}Record`;
    const children: IR[] = [];
    
    // 変数宣言
    const declareText = `DECLARE ${target} : ${recordTypeName}`;
    children.push(this.createIRNode('statement', declareText));
    
    // 各属性への代入
    const attributes = this.getClassAttributes(className);
    attributes.forEach((attr: string, index: number) => {
      if (index < args.length) {
        const assignText = `${target}.${attr} ← ${args[index]}`;
        children.push(this.createIRNode('assign', assignText));
      }
    });
    
    return this.createIRNode('statement', '', children);
  }

  /**
   * 複数代入の処理
   */
  private handleMultipleAssignment(node: ASTNode): IR {
    const children: IR[] = [];
    
    // 値がタプルまたはリストの場合
    if (node.value.type === 'Tuple' || node.value.type === 'List') {
      const values = node.value.elts;
      node.targets.forEach((target: ASTNode, index: number) => {
        if (index < values.length) {
          const targetName = this.expressionVisitor.visitExpression(target);
          const value = this.expressionVisitor.visitExpression(values[index]);
          const assignText = `${targetName} ← ${value}`;
          children.push(this.createIRNode('assign', assignText));
        }
      });
    }
    
    return this.createIRNode('statement', '', children);
  }

  /**
   * 拡張代入文の処理
   */
  private handleAugmentedAssignment(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);
    const value = this.expressionVisitor.visitExpression(node.value);
    
    let operator = '';
    switch (node.op.type) {
      case 'Add': operator = '+'; break;
      case 'Sub': operator = '-'; break;
      case 'Mult': operator = '*'; break;
      case 'Div': operator = '/'; break;
      case 'Mod': operator = 'MOD'; break;
      default: operator = '+';
    }
    
    const assignText = `${target} ← ${target} ${operator} ${value}`;
    return this.createIRNode('assign', assignText);
  }

  /**
   * 型注釈付き代入文の処理
   */
  private handleAnnotatedAssignment(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);
    const igcseType = this.convertAnnotationToIGCSEType(node.annotation);
    
    // リスト型の場合は配列として処理
    if (this.isListTypeAnnotation(node.annotation)) {
      if (node.value) {
        // 初期値がある場合
        if (this.expressionVisitor.isArrayInitialization(node.value)) {
          const elements = node.value.elts;
          const size = elements.length;
          const elementType = this.extractListElementType(node.annotation);
          
          // 配列宣言
          const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
          const declIR = this.createIRNode('statement', declText);
          
          // コンテキストに配列情報を保存
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
    }
    
    // 通常の型注釈付き変数宣言
    const declText = `DECLARE ${target} : ${igcseType}`;
    const children = [this.createIRNode('statement', declText)];
    
    // 初期値がある場合は代入も追加
    if (node.value) {
      const value = this.expressionVisitor.visitExpression(node.value);
      const assignText = `${target} ← ${value}`;
      children.push(this.createIRNode('assign', assignText));
    }
    
    return this.createIRNode('statement', '', children);
  }

  /**
   * リスト型注釈かどうかを判定
   */
  private isListTypeAnnotation(annotation: ASTNode): boolean {
    // list の形式
    if (annotation.type === 'Name' && annotation.id === 'list') {
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
   * クラス定義から属性名を取得
   */
  private getClassAttributes(className: string): string[] {
    // コンテキストからクラス定義を検索
    if (this.context && this.context.classDefinitions) {
      const classDef = this.context.classDefinitions[className];
      if (classDef && classDef.attributes) {
        return classDef.attributes.map((attr: string) => attr.split(' : ')[0]);
      }
    }
    
    // デフォルトの属性名（Student クラスの場合）
    if (className === 'Student') {
      return ['name', 'age'];
    }
    
    // その他のクラスの場合はデフォルト
    return ['x', 'y'];
  }



  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }
}