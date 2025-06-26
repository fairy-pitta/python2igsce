import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { IGCSEDataType } from '../types/igcse';
import { ParameterInfo, ParseResult } from '../types/parser';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';

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
 * 関数とクラス定義の処理を担当するビジタークラス
 */
export class DefinitionVisitor extends BaseParser {
  /**
   * パースの実行（DefinitionVisitorでは使用しない）
   */
  parse(_source: string): ParseResult {
    throw new Error('DefinitionVisitor.parse() should not be called directly');
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
   * 関数定義の処理
   */
  visitFunctionDef(node: ASTNode): IR {
    const funcName = node.name;
    const params = this.extractParameters(node.args);
    const paramText = params.map(p => `${p.name} : ${p.type}`).join(', ');
    
    // 戻り値の型を推論
    const hasReturn = this.hasReturnStatement(node.body);
    const returnType = hasReturn ? this.inferReturnType(node) : null;
    
    let funcText: string;
    if (returnType) {
      funcText = `FUNCTION ${funcName}(${paramText}) RETURNS ${returnType}`;
    } else {
      funcText = `PROCEDURE ${funcName}(${paramText})`;
    }
    
    // 関数スコープに入る
    this.enterScope('function', funcName);
    this.increaseIndent();
    
    // パラメータを変数として登録
    params.forEach(param => {
      this.registerVariable(param.name, param.type, node.lineno);
    });
    
    // 関数本体を処理
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    
    this.decreaseIndent();
    this.exitScope();
    
    // 終了文を追加
    const endText = returnType ? `ENDFUNCTION` : `ENDPROCEDURE`;
    const endIR = this.createIRNode('statement', endText);
    bodyChildren.push(endIR);
    
    return this.createIRNode('function', funcText, bodyChildren);
  }

  /**
   * クラス定義の処理
   */
  visitClassDef(node: ASTNode): IR {
    const className = node.name;
    
    // レコード型として扱うかどうかを判定
    const isRecordType = this.shouldTreatAsRecordType(node);
    
    // レコード型として扱う場合
    if (isRecordType) {
      return this.createRecordType(node, className);
    }
    
    // 通常のクラスとして扱う場合
    return this.createClass(node, className);
  }

  /**
   * レコード型の作成
   */
  private createRecordType(node: ASTNode, className: string): IR {
    const recordTypeName = `${className}Record`;
    const typeText = `TYPE ${recordTypeName}`;
    
    // __init__メソッドから属性を抽出
    const constructor = node.body.find((item: ASTNode) => 
      item.type === 'FunctionDef' && item.name === '__init__'
    );
    
    const attributes: string[] = [];
    if (constructor) {
      // コンストラクタの引数から属性を推論
      const params = constructor.args.args.slice(1); // selfを除く
      params.forEach((param: any) => {
        const paramName = param.arg;
        const paramType = this.convertPythonTypeToIGCSE(param.annotation);
        attributes.push(`  DECLARE ${paramName} : ${paramType}`);
      });
    }
    
    const children = attributes.map(attr => this.createIRNode('statement', attr));
    const endTypeIR = this.createIRNode('statement', 'ENDTYPE');
    children.push(endTypeIR);
    
    return this.createIRNode('type', typeText, children);
  }

  /**
   * 通常のクラスの作成
   */
  private createClass(node: ASTNode, className: string): IR {
    const baseClass = node.bases.length > 0 ? node.bases[0].id : null;
    let classText = `CLASS ${className}`;
    if (baseClass) {
      classText += ` INHERITS ${baseClass}`;
    }
    
    this.enterScope(className, 'class');
    this.increaseIndent();
    
    const members: IR[] = [];
    
    // クラス属性とメソッドを処理
    for (const item of node.body) {
      if (item.type === 'FunctionDef') {
        if (item.name === '__init__') {
          // コンストラクタから属性を抽出
          const attributes = this.extractAttributesFromConstructor(item);
          attributes.forEach(attr => {
            members.push(this.createIRNode('statement', `PRIVATE ${attr}`));
          });
        }
        members.push(this.visitNode ? this.visitNode(item) : this.createIRNode('comment', '// Unprocessed node'));
      } else if (item.type === 'Assign') {
        // クラス属性
        const attrIR = this.visitNode ? this.visitNode(item) : this.createIRNode('comment', '// Unprocessed node');
        attrIR.text = `PRIVATE ${attrIR.text}`;
        members.push(attrIR);
      }
    }
    
    this.decreaseIndent();
    this.exitScope();
    
    const endClassIR = this.createIRNode('statement', 'ENDCLASS');
    members.push(endClassIR);
    
    return this.createIRNode('class', classText, members);
  }

  /**
   * 関数パラメータの抽出
   */
  private extractParameters(args: any): ParameterInfo[] {
    const params: ParameterInfo[] = [];
    
    if (args.args) {
      args.args.forEach((arg: any) => {
        const name = arg.arg;
        const type = this.convertPythonTypeToIGCSE(arg.annotation);
        params.push({ name, type });
      });
    }
    
    return params;
  }

  /**
   * Python型注釈をIGCSE型に変換
   */
  private convertPythonTypeToIGCSE(annotation: any): IGCSEDataType {
    if (!annotation) return 'STRING';
    
    if (annotation.type === 'Name') {
      switch (annotation.id) {
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
   * コンストラクタから属性を抽出
   */
  private extractAttributesFromConstructor(constructor: ASTNode): string[] {
    const attributes: string[] = [];
    
    // self.attribute = value の形式を探す
    for (const stmt of constructor.body) {
      if (stmt.type === 'Assign') {
        const target = stmt.targets[0];
        if (target.type === 'Attribute' && target.value.id === 'self') {
          const attrName = target.attr;
          const attrType = this.expressionVisitor.inferTypeFromValue(stmt.value);
          attributes.push(`${attrName} : ${attrType}`);
        }
      }
    }
    
    return attributes;
  }

  /**
   * レコード型として扱うかどうかを判定
   */
  private shouldTreatAsRecordType(node: ASTNode): boolean {
    // クラスがレコード型として使用されるかを判定
    // 簡単なヒューリスティック: メソッドが__init__のみの場合はレコード型とみなす
    const methods = node.body.filter((item: ASTNode) => item.type === 'FunctionDef');
    const hasOnlyConstructor = methods.length === 1 && methods[0].name === '__init__';
    return hasOnlyConstructor;
  }

  /**
   * 戻り値文があるかどうかを判定
   */
  private hasReturnStatement(body: ASTNode[]): boolean {
    return body.some(stmt => 
      stmt.type === 'Return' || 
      (stmt.body && this.hasReturnStatement(stmt.body))
    );
  }

  /**
   * 戻り値の型を推論
   */
  private inferReturnType(node: ASTNode): IGCSEDataType {
    // 簡易的な戻り値型推論
    for (const stmt of node.body) {
      if (stmt.type === 'Return' && stmt.value) {
        return this.expressionVisitor.inferTypeFromValue(stmt.value);
      }
    }
    return 'STRING';
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }

  // visitNodeはプロパティとして定義済み
}