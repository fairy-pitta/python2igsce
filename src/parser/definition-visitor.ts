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
        // 型注釈がある場合は優先
        let type = this.convertPythonTypeToIGCSE(arg.annotation);
        
        // 型注釈がない場合はデフォルトでINTEGERを推論
        // （数値演算が多いため、より適切なデフォルト）
        if (!arg.annotation) {
          type = 'INTEGER';
        }
        
        params.push({ name, type });
      });
    }
    
    return params;
  }

  /**
   * Python型注釈をIGCSE型に変換
   */
  private convertPythonTypeToIGCSE(annotation: any): IGCSEDataType {
    if (!annotation) return 'INTEGER'; // デフォルトをINTEGERに変更
    
    if (annotation.type === 'Name') {
      switch (annotation.id) {
        case 'int': return 'INTEGER';
        case 'str': return 'STRING';
        case 'bool': return 'BOOLEAN';
        case 'float': return 'REAL';
        default: return 'INTEGER'; // 不明な型もINTEGERをデフォルトに
      }
    }
    return 'INTEGER';
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
    
    // このクラスが他のクラスの親クラスとして使用されているかチェック
    if (this.isUsedAsBaseClass(node.name)) {
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
   * このクラスが他のクラスの親クラスとして使用されているかチェック
   */
  private isUsedAsBaseClass(className: string): boolean {
       // コンテキストから全てのクラス定義を取得し、継承関係をチェック
       if (this.context && this.context.classDefinitions) {
         for (const [, classDef] of Object.entries(this.context.classDefinitions)) {
           if (classDef.bases && classDef.bases.includes(className)) {
             return true;
           }
         }
       }
       return false;
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
    
    // パラメータの型情報を取得
    const params = this.extractParameters(node.args);
    const paramTypes = new Map<string, IGCSEDataType>();
    params.forEach(param => {
      paramTypes.set(param.name, param.type);
    });
    
    // 簡易的な戻り値型推論（再帰的にReturn文を検索）
    const findReturnType = (statements: ASTNode[]): IGCSEDataType | null => {
      for (const stmt of statements) {
        if (stmt.type === 'Return' && stmt.value) {
          return this.inferReturnTypeFromExpression(stmt.value, paramTypes);
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
    return returnType || 'INTEGER';
  }

  /**
   * パラメータ型情報を考慮した戻り値型推論
   */
  private inferReturnTypeFromExpression(node: ASTNode, paramTypes: Map<string, IGCSEDataType>): IGCSEDataType {
    if (!node) return 'INTEGER';
    
    switch (node.type) {
      case 'Constant':
        if (typeof node.value === 'number') {
          return Number.isInteger(node.value) ? 'INTEGER' : 'REAL';
        }
        if (typeof node.value === 'string') return 'STRING';
        if (typeof node.value === 'boolean') return 'BOOLEAN';
        break;
      case 'Num':
        return Number.isInteger(node.n) ? 'INTEGER' : 'REAL';
      case 'Str':
        return 'STRING';
      case 'Name':
        // パラメータの型を参照
        if (paramTypes.has(node.id)) {
          return paramTypes.get(node.id)!;
        }
        // 数値リテラル
        if (node.id && /^\d+$/.test(node.id)) {
          return 'INTEGER';
        }
        if (node.id && /^\d+\.\d+$/.test(node.id)) {
          return 'REAL';
        }
        return 'INTEGER';
      case 'BinOp':
        // 二項演算の型推論
        const leftType = this.inferReturnTypeFromExpression(node.left, paramTypes);
        const rightType = this.inferReturnTypeFromExpression(node.right, paramTypes);
        
        // 算術演算子の場合
        if (['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'].includes(node.op.type)) {
          // 文字列の連結（+演算子）- 明示的に文字列型の場合のみ
          if (node.op.type === 'Add' && 
              ((leftType === 'STRING' && this.isExplicitStringNode(node.left)) || 
               (rightType === 'STRING' && this.isExplicitStringNode(node.right)))) {
            return 'STRING';
          }
          
          // 数値型が含まれている場合は数値演算として扱う
          if ((leftType === 'INTEGER' || leftType === 'REAL') || 
              (rightType === 'INTEGER' || rightType === 'REAL')) {
            // 除算の場合はREAL
            if (node.op.type === 'Div') {
              return 'REAL';
            }
            // 両方がINTEGERの場合はINTEGER
            if (leftType === 'INTEGER' && rightType === 'INTEGER') {
              return 'INTEGER';
            }
            // どちらかがREALの場合はREAL
            if (leftType === 'REAL' || rightType === 'REAL') {
              return 'REAL';
            }
            // デフォルトはINTEGER
            return 'INTEGER';
          }
          
          // デフォルトで算術演算はINTEGERとして推論
          return 'INTEGER';
        }
        
        // 比較演算子の場合
        if (['Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        return 'INTEGER';
    }
    
    return 'INTEGER';
  }
  
  /**
   * 明示的な文字列ノードかどうかを判定
   */
  private isExplicitStringNode(node: ASTNode): boolean {
    if (!node) return false;
    
    switch (node.type) {
      case 'Constant':
        return typeof node.value === 'string';
      case 'Str':
        return true;
      case 'JoinedStr': // f-string
        return true;
      default:
        return false;
    }
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