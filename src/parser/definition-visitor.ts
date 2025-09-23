import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { IGCSEDataType } from '../types/igcse';
import { ParameterInfo, ParseResult } from '../types/parser';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';

/**
 * Basic interface for Python AST nodes
 */
interface ASTNode {
  type: string;
  lineno?: number;
  col_offset?: number;
  [key: string]: any;
}

/**
 * Visitor class responsible for processing function and class definitions
 */
export class DefinitionVisitor extends BaseParser {
  /**
   * Execute parsing (not used in DefinitionVisitor)
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
   * Set context
   */
  setContext(context: any): void {
    this.context = context;
  }

  /**
   * Process function definitions
   */
  visitFunctionDef(node: ASTNode): IR {
    const funcName = this.capitalizeFirstLetter(node.name);
    const params = this.extractParameters(node.args);
    const paramText = params.map(p => `${p.name} : ${p.type}`).join(', ');
    
    // Infer return type
    const hasReturn = this.hasReturnStatement(node.body);
    const returnType = hasReturn ? this.inferReturnType(node) : null;
    
    let funcText: string;
    if (returnType) {
      funcText = `FUNCTION ${funcName}(${paramText}) RETURNS ${returnType}`;
    } else {
      funcText = `PROCEDURE ${funcName}(${paramText})`;
    }
    
    // Enter function scope
    this.enterScope(funcName, 'function');
    this.increaseIndent();
    
    // Register parameters as variables
    params.forEach(param => {
      this.registerVariable(param.name, param.type, node.lineno);
    });
    
    // Process function body
    const bodyChildren = node.body.map((child: ASTNode) => 
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    
    this.decreaseIndent();
    this.exitScope();
    
    // Add end statement
    const endText = returnType ? `ENDFUNCTION` : `ENDPROCEDURE`;
    const endIR = this.createIRNode('statement', endText);
    bodyChildren.push(endIR);
    
    return this.createIRNode('function', funcText, bodyChildren);
  }

  /**
   * Process class definitions
   */
  visitClassDef(node: ASTNode): IR {
    const className = node.name;
    
    // Determine whether to treat as record type
    const isRecordType = this.shouldTreatAsRecordType(node);
    
    // If treating as record type
    if (isRecordType) {
      return this.createRecordType(node, className);
    }
    
    // If treating as regular class
    return this.createClass(node, className);
  }

  /**
   * Create record type
   */
  private createRecordType(node: ASTNode, className: string): IR {
    const recordTypeName = `${className}Record`;
    const typeText = `TYPE ${recordTypeName}`;
    
    // Extract attributes from __init__ method
    const constructor = node.body.find((item: ASTNode) => 
      item.type === 'FunctionDef' && item.name === '__init__'
    );
    
    const children: IR[] = [];
    if (constructor) {
      // Extract actual field names and types from constructor
      const attributes = this.extractAttributesFromConstructor(constructor);
      
      for (const attr of attributes) {
        const attrDeclaration = `DECLARE ${attr}`;
        children.push(this.createIRNode('statement', attrDeclaration));
      }
    }
    
    return this.createIRNode('type', typeText, children);
  }

  /**
   * Create regular class
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
    
    // Process class attributes and methods
    for (const item of node.body) {
      if (item.type === 'FunctionDef') {
        if (item.name === '__init__') {
          // Extract attributes from constructor
          const attributes = this.extractAttributesFromConstructor(item);
          attributes.forEach(attr => {
            members.push(this.createIRNode('statement', `PRIVATE ${attr}`));
          });
        }
        members.push(this.visitNode ? this.visitNode(item) : this.createIRNode('comment', '// Unprocessed node'));
      } else if (item.type === 'Assign') {
        // Class attributes
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
   * Extract function parameters
   */
  private extractParameters(args: any): ParameterInfo[] {
    const params: ParameterInfo[] = [];
    
    if (args.args) {
      args.args.forEach((arg: any) => {
        const name = arg.arg;
        // Prioritize type annotations if available
        let type = this.convertPythonTypeToIGCSE(arg.annotation);
        
        // If no type annotation, infer INTEGER as default
    // (More appropriate default due to frequent numeric operations)
        if (!arg.annotation) {
          type = 'INTEGER';
        }
        
        params.push({ name, type });
      });
    }
    
    return params;
  }

  /**
   * Convert Python type annotations to IGCSE types
   */
  private convertPythonTypeToIGCSE(annotation: any): IGCSEDataType {
    if (!annotation) return 'INTEGER'; // Changed default to INTEGER
    
    if (annotation.type === 'Name') {
      switch (annotation.id) {
        case 'int': return 'INTEGER';
        case 'str': return 'STRING';
        case 'bool': return 'BOOLEAN';
        case 'float': return 'REAL';
        default: return 'INTEGER'; // Unknown types also default to INTEGER
      }
    }
    return 'INTEGER';
  }

  /**
   * Extract attributes from constructor
   */
  private extractAttributesFromConstructor(constructor: ASTNode): string[] {
    const attributes: string[] = [];
    
    // Get type information from constructor parameters
    const paramTypes = new Map<string, IGCSEDataType>();
    if (constructor.args && constructor.args.args) {
      constructor.args.args.forEach((arg: any) => {
        if (arg.arg !== 'self') {
          const type = this.convertPythonTypeToIGCSE(arg.annotation);
          paramTypes.set(arg.arg, type);
        }
      });
    }
    
    // Look for self.attribute = value format
    for (const stmt of constructor.body) {
      if (stmt.type === 'Assign') {
        const target = stmt.targets[0];
        if (target.type === 'Attribute' && target.value.id === 'self') {
          const attrName = target.attr;
          
          // If assigned value is a parameter, use parameter type
          let attrType: IGCSEDataType = 'STRING';
          if (stmt.value.type === 'Name' && paramTypes.has(stmt.value.id)) {
            attrType = paramTypes.get(stmt.value.id)!;
          } else {
            // If not a parameter, infer type from value
            attrType = this.expressionVisitor.inferTypeFromValue(stmt.value);
          }
          
          attributes.push(`${attrName} : ${attrType}`);
        }
      }
    }
    
    return attributes;
  }

  /**
   * Determine whether to treat as record type
   */
  private shouldTreatAsRecordType(node: ASTNode): boolean {
    // Classes with inheritance are not treated as record types
    if (node.bases && node.bases.length > 0) {
      return false;
    }
    
    // Check if this class is used as a parent class by other classes
    if (this.isUsedAsBaseClass(node.name)) {
      return false;
    }
    
    // Determine if class is used as record type
    const methods = node.body.filter((item: ASTNode) => item.type === 'FunctionDef');
    
    // If it only has __init__ method
    if (methods.length === 1 && methods[0].name === '__init__') {
      const initMethod = methods[0];
      // Check if __init__ contains only simple field assignments
      return this.isSimpleConstructor(initMethod);
    }
    
    // If no methods (data class usage)
    if (methods.length === 0) {
      // Treat as record type if it only has class attributes
      const hasOnlyAttributes = node.body.every((item: ASTNode) => 
        item.type === 'Assign' || item.type === 'AnnAssign'
      );
      return hasOnlyAttributes;
    }
    
    return false;
  }

  /**
   * Determine if __init__ method is a simple constructor
   */
  private isSimpleConstructor(initMethod: ASTNode): boolean {
    // Check __init__ body
    for (const stmt of initMethod.body) {
      if (stmt.type === 'Assign') {
        // Check if it's self.field = parameter format
        const target = stmt.targets[0];
        if (target.type === 'Attribute' && 
            target.value.type === 'Name' && 
            target.value.id === 'self') {
          // Simple field assignment
          continue;
        } else {
          // Complex assignment exists, don't treat as record type
          return false;
        }
      } else if (stmt.type === 'Expr' && stmt.value.type === 'Constant') {
        // Documentation strings are allowed
        continue;
      } else {
        // Other complex processing exists, don't treat as record type
        return false;
      }
    }
    return true;
  }

  /**
   * Check if this class is used as a parent class by other classes
   */
  private isUsedAsBaseClass(className: string): boolean {
       // Get all class definitions from context and check inheritance relationships
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
   * Determine if there are return statements
   */
  private hasReturnStatement(body: ASTNode[]): boolean {
    return body.some(stmt => 
      stmt.type === 'Return' || 
      (stmt.body && this.hasReturnStatement(stmt.body))
    );
  }

  /**
   * Infer return type
   */
  private inferReturnType(node: ASTNode): IGCSEDataType {
    // Prioritize Python type hints if available
    if (node.returns && node.returns.id) {
      switch (node.returns.id) {
        case 'int': return 'INTEGER';
        case 'str': return 'STRING';
        case 'bool': return 'BOOLEAN';
        case 'float': return 'REAL';
        default: return 'STRING';
      }
    }
    
    // Get parameter type information
    const params = this.extractParameters(node.args);
    const paramTypes = new Map<string, IGCSEDataType>();
    params.forEach(param => {
      paramTypes.set(param.name, param.type);
    });
    
    // Simple return type inference (recursively search for Return statements)
    const findReturnType = (statements: ASTNode[]): IGCSEDataType | null => {
      for (const stmt of statements) {
        if (stmt.type === 'Return' && stmt.value) {
          return this.inferReturnTypeFromExpression(stmt.value, paramTypes);
        }
        // Also search nested structures (if statements, for loops, etc.)
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
   * Return type inference considering parameter type information
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
        // Reference parameter type
        if (paramTypes.has(node.id)) {
          return paramTypes.get(node.id)!;
        }
        // Numeric literal
        if (node.id && /^\d+$/.test(node.id)) {
          return 'INTEGER';
        }
        if (node.id && /^\d+\.\d+$/.test(node.id)) {
          return 'REAL';
        }
        return 'INTEGER';
      case 'BinOp':
        // Type inference for binary operations
        const leftType = this.inferReturnTypeFromExpression(node.left, paramTypes);
        const rightType = this.inferReturnTypeFromExpression(node.right, paramTypes);
        
        // For arithmetic operators
        if (['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'].includes(node.op.type)) {
          // String concatenation (+operator) - only for explicit string types
          if (node.op.type === 'Add' && 
              ((leftType === 'STRING' && this.isExplicitStringNode(node.left)) || 
               (rightType === 'STRING' && this.isExplicitStringNode(node.right)))) {
            return 'STRING';
          }
          
          // Treat as numeric operation if numeric types are involved
          if ((leftType === 'INTEGER' || leftType === 'REAL') || 
              (rightType === 'INTEGER' || rightType === 'REAL')) {
            // Division results in REAL
            if (node.op.type === 'Div') {
              return 'REAL';
            }
            // INTEGER if both are INTEGER
            if (leftType === 'INTEGER' && rightType === 'INTEGER') {
              return 'INTEGER';
            }
            // REAL if either is REAL
            if (leftType === 'REAL' || rightType === 'REAL') {
              return 'REAL';
            }
            // Default is INTEGER
            return 'INTEGER';
          }
          
          // Default arithmetic operations inferred as INTEGER
          return 'INTEGER';
        }
        
        // For comparison operators
        if (['Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        return 'INTEGER';
    }
    
    return 'INTEGER';
  }
  
  /**
   * Check if it's an explicit string node
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
   * Capitalize the first character of a string
   */
  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // visitNode is already defined as a property
}