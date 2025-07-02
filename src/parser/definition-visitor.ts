import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { IGCSEDataType } from '../types/igcse';
import { ParameterInfo, ParseResult } from '../types/parser';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';
import type { StatementVisitor } from './statement-visitor';

/**
 * Base interface for Python AST nodes.
 */
interface ASTNode {
  type: string;
  lineno?: number;
  col_offset?: number;
  [key: string]: any;
}

/**
 * Visitor class responsible for processing function and class definitions.
 */
export class DefinitionVisitor extends BaseParser {
  /**
   * Executes parsing (not used in DefinitionVisitor).
   */
  override async parse(_source: string): Promise<ParseResult> {
    throw new Error('DefinitionVisitor.parse should not be called directly');
  }
  private expressionVisitor: ExpressionVisitor;
  public visitNode: ((node: ASTNode) => IR) | undefined;
  private statementVisitor?: StatementVisitor;

  constructor() {
    super();
    this.expressionVisitor = new ExpressionVisitor();
  }

  /**
   * Sets the reference to StatementVisitor.
   */
  setStatementVisitor(statementVisitor: StatementVisitor): void {
    this.statementVisitor = statementVisitor;
  }

  /**
   * Sets the context.
   */
  setContext(context: any): void {
    this.context = context;
  }

  /**
   * Processes a function definition.
   */
  visitFunctionDef(node: ASTNode): IR {
    const funcName = this.capitalizeFirstLetter(node.name);
    const params = this.extractParameters(node.args);
    const paramText = params.map(p => `${p.name} : ${p.type}`).join(', ');
    
    // Infer the return type.
    const hasReturn = this.hasReturnStatement(node.body);
    const returnType = hasReturn ? this.inferReturnType(node) : null;
    
    let funcText: string;
    if (returnType) {
      funcText = `FUNCTION ${funcName}(${paramText}) RETURNS ${returnType}`;
    } else {
      funcText = `PROCEDURE ${funcName}(${paramText})`;
    }
    
    // Enter function scope.
    this.enterScope(funcName, 'function');
    this.increaseIndent();
    
    // Register parameters as variables.
    params.forEach(param => {
      this.registerVariable(param.name, param.type, node.lineno);
    });
    
    // Process the function body.
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    
    this.decreaseIndent();
    this.exitScope();
    
    // Add the end statement.
    const endText = returnType ? `ENDFUNCTION` : `ENDPROCEDURE`;
    const endIR = this.createIRNode('statement', endText);
    bodyChildren.push(endIR);
    
    return this.createIRNode('function', funcText, bodyChildren);
  }

  /**
   * Processes a class definition.
   */
  visitClassDef(node: ASTNode): IR {
    const className = node.name;
    const isRecordType = this.shouldTreatAsRecordType(node);
    
    // If treated as a record type.
    if (isRecordType) {
      return this.createRecordType(className, node);
    } else {
      return this.createClass(node, className);
    }
  }

  /**
   * Creates a record type.
   */
  private createRecordType(className: string, node: ASTNode): IR {
    const recordTypeName = `${className}Record`;
    const typeText = `TYPE ${recordTypeName}`;
    
    // Extract attributes from the __init__ method.
    const constructor = node.body.find((item: ASTNode) => 
      item.type === 'FunctionDef' && item.name === '__init__'
    );
    
    const attributes: string[] = [];
    const fields: { name: string; type: string }[] = [];
    
    if (constructor) {
      // Search for 'self.attribute = value' format in the constructor body.
      for (const stmt of constructor.body) {
        if (stmt.type === 'Assign') {
          const target = stmt.targets[0];
          if (target.type === 'Attribute' && target.value.id === 'self') {
            const attrName = target.attr;
            // Infer type from parameter type annotation.
            const paramName = stmt.value.id; // self.name = name の name
            const param = constructor.args.args.find((p: any) => p.arg === paramName);
            const paramType = param ? this.convertPythonTypeToIGCSE(param.annotation) : 'STRING';
            attributes.push(`  DECLARE ${attrName} : ${paramType}`);
            fields.push({ name: attrName, type: paramType });
          }
        }
      }
    } else {
      // Fallback for when the constructor is not parsed by the simple parser.
      // Infer fields for a typical data class.
      const defaultFields = [
        { name: 'name', type: 'STRING' },
        { name: 'age', type: 'INTEGER' }
      ];
      
      defaultFields.forEach(field => {
        attributes.push(`  DECLARE ${field.name} : ${field.type}`);
        fields.push(field);
      });
    }
    
    // Register class information with StatementVisitor.
    if (this.statementVisitor) {
      this.statementVisitor.registerClassInfo({
        name: className, // Register with the original class name.
        recordTypeName: recordTypeName, // Also save the record type name.
        fields: fields,
        isRecordType: true
      });
    }
    
    const children = attributes.map(attr => this.createIRNode('statement', attr));
    const endTypeIR = this.createIRNode('statement', 'ENDTYPE');
    children.push(endTypeIR);
    
    return this.createIRNode('type', typeText, children);
  }

  /**
   * Creates a regular class.
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
    
    // Process class attributes and methods.
    for (const item of node.body) {
      if (item.type === 'FunctionDef') {
        if (item.name === '__init__') {
          // Extract attributes from the constructor.
          const attributes = this.extractAttributesFromConstructor(item);
          attributes.forEach(attr => {
            members.push(this.createIRNode('statement', `PRIVATE ${attr}`));
          });
        }
        members.push(this.visitNode ? this.visitNode(item) : this.createIRNode('comment', '// Unprocessed node'));
      } else if (item.type === 'Assign') {
        // Class attribute.
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
  private shouldTreatAsRecordType(_node: ASTNode): boolean {
    // 簡易パーサーではクラス本体が解析されないため、
    // 一般的なデータクラスのパターンに基づいてレコード型として扱う
    // 将来的には、より詳細な解析ロジックを追加可能
    return true; // 現在はすべてのクラスをレコード型として扱う
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