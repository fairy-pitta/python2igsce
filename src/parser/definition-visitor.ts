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
    const funcName = this.capitalizeFirstLetter(node.name);
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
    this.enterScope(funcName, 'function');
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
    
    const children: IR[] = [];
    if (constructor) {
      // コンストラクタから実際のフィールド名と型を抽出
      const attributes = this.extractAttributesFromConstructor(constructor);
      
      for (const attr of attributes) {
        const attrDeclaration = `DECLARE ${attr}`;
        children.push(this.createIRNode('statement', attrDeclaration));
      }
    }
    
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
    
    // コンストラクタのパラメータから型情報を取得
    const paramTypes = new Map<string, IGCSEDataType>();
    if (constructor.args && constructor.args.args) {
      constructor.args.args.forEach((arg: any) => {
        if (arg.arg !== 'self') {
          const type = this.convertPythonTypeToIGCSE(arg.annotation);
          paramTypes.set(arg.arg, type);
        }
      });
    }
    
    // self.attribute = value の形式を探す
    for (const stmt of constructor.body) {
      if (stmt.type === 'Assign') {
        const target = stmt.targets[0];
        if (target.type === 'Attribute' && target.value.id === 'self') {
          const attrName = target.attr;
          
          // 代入される値がパラメータの場合、パラメータの型を使用
          let attrType: IGCSEDataType = 'STRING';
          if (stmt.value.type === 'Name' && paramTypes.has(stmt.value.id)) {
            attrType = paramTypes.get(stmt.value.id)!;
          } else {
            // パラメータでない場合は値から型を推論
            attrType = this.expressionVisitor.inferTypeFromValue(stmt.value);
          }
          
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
    // 継承を持つクラスはレコード型として扱わない
    if (node.bases && node.bases.length > 0) {
      return false;
    }
    
    // クラスがレコード型として使用されるかを判定
    const methods = node.body.filter((item: ASTNode) => item.type === 'FunctionDef');
    
    // __init__メソッドのみを持つ場合
    if (methods.length === 1 && methods[0].name === '__init__') {
      const initMethod = methods[0];
      // __init__内が単純なフィールド代入のみかチェック
      return this.isSimpleConstructor(initMethod);
    }
    
    // メソッドがない場合（データクラス的な使用）
    if (methods.length === 0) {
      // クラス属性のみを持つ場合はレコード型として扱う
      const hasOnlyAttributes = node.body.every((item: ASTNode) => 
        item.type === 'Assign' || item.type === 'AnnAssign'
      );
      return hasOnlyAttributes;
    }
    
    return false;
  }

  /**
   * __init__メソッドが単純なコンストラクタかどうかを判定
   */
  private isSimpleConstructor(initMethod: ASTNode): boolean {
    // __init__の本体をチェック
    for (const stmt of initMethod.body) {
      if (stmt.type === 'Assign') {
        // self.field = parameter の形式かチェック
        const target = stmt.targets[0];
        if (target.type === 'Attribute' && 
            target.value.type === 'Name' && 
            target.value.id === 'self') {
          // 単純なフィールド代入
          continue;
        } else {
          // 複雑な代入があるため、レコード型として扱わない
          return false;
        }
      } else if (stmt.type === 'Expr' && stmt.value.type === 'Constant') {
        // ドキュメント文字列は許可
        continue;
      } else {
        // その他の複雑な処理があるため、レコード型として扱わない
        return false;
      }
    }
    return true;
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
    // Python型ヒントがある場合は優先
    if (node.returns && node.returns.id) {
      switch (node.returns.id) {
        case 'int': return 'INTEGER';
        case 'str': return 'STRING';
        case 'bool': return 'BOOLEAN';
        case 'float': return 'REAL';
        default: return 'STRING';
      }
    }
    
    // 簡易的な戻り値型推論（再帰的にReturn文を検索）
    const findReturnType = (statements: ASTNode[]): IGCSEDataType | null => {
      for (const stmt of statements) {
        if (stmt.type === 'Return' && stmt.value) {
          return this.expressionVisitor.inferTypeFromValue(stmt.value);
        }
        // ネストした構造（if文、for文など）も検索
        if (stmt.body && Array.isArray(stmt.body)) {
          const nestedType = findReturnType(stmt.body);
          if (nestedType) return nestedType;
        }
        if (stmt.orelse && Array.isArray(stmt.orelse)) {
          const elseType = findReturnType(stmt.orelse);
          if (elseType) return elseType;
        }
      }
      return null;
    };
    
    const returnType = findReturnType(node.body);
    return returnType || 'STRING';
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
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