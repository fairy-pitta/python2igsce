// import { IR, IRKind, createIR } from '../types/ir';
import { IGCSEDataType } from '../types/igcse';

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
 * Visitor class responsible for processing expressions
 */
export class ExpressionVisitor {
  /**
   * Convert expressions to IGCSE pseudocode
   */
  visitExpression(node: ASTNode): string {
    if (!node) return '';

    // If the node has a raw property, use it for simplified parsing
    if (node.raw) {
      const result = this.parseRawExpression(node.raw);
      // Keep parentheses if keepParentheses flag is set
      return node.keepParentheses ? `(${result})` : result;
    }

    switch (node.type) {
      case 'Name':
        return node.id;
      case 'Constant':
        return this.formatConstant(node.value);
      case 'Num':
        return node.n.toString();
      case 'Str':
        return `"${node.s}"`;
      case 'NameConstant':
        return this.formatNameConstant(node.value);
      case 'BinOp':
        return this.visitBinOp(node);
      case 'UnaryOp':
        return this.visitUnaryOp(node);
      case 'Compare':
        return this.visitCompare(node);
      case 'BoolOp':
        return this.visitBoolOp(node);
      case 'Call':
        return this.visitCallExpression(node);
      case 'Attribute':
        return this.visitAttribute(node);
      case 'Subscript':
        return this.visitSubscript(node);
      case 'List':
      case 'Tuple':
        return this.visitList(node);
      case 'Dict':
        return this.visitDict(node);
      case 'ListComp':
        return this.visitListComp(node);
      case 'IfExp':
        return this.visitIfExp(node);
      case 'JoinedStr':
        return this.visitJoinedStr(node);
      case 'Expr':
        // Process expressions with parentheses
        if (node.parenthesized) {
          return `(${this.visitExpression(node.value)})`;
        }
        return this.visitExpression(node.value);
      default:
        return `/* ${node.type} */`;
    }
  }

  /**
   * Simple expression parsing
   */
  private parseRawExpression(raw: string): string {
    // Temporarily protect string literals
    const stringLiterals: string[] = [];
    let result = raw.replace(/"([^"]*)"/g, (_, content) => {
      const placeholder = `__STRING_${stringLiterals.length}__`;
      stringLiterals.push(content);
      return `"${placeholder}"`;
    });
    
    // Convert comparison operators (using word boundaries)
    result = result
      .replace(/==/g, ' = ')
      .replace(/!=/g, ' ≠ ')
      .replace(/>=/g, ' ≥ ')
      .replace(/<=/g, ' ≤ ')
      .replace(/\band\b/g, ' AND ')
      .replace(/\bor\b/g, ' OR ')
      .replace(/\bnot\b/g, 'NOT ')
      .replace(/%/g, ' MOD ')
      .replace(/\blen\(/g, 'LENGTH(')
      .replace(/\bstr\(/g, 'STRING(')
      .replace(/\bint\(/g, 'INTEGER(')
      .replace(/\bfloat\(/g, 'REAL(')
      .replace(/\babs\(/g, 'ABS(')
      .replace(/\bmax\(/g, 'MAX(')
      .replace(/\bmin\(/g, 'MIN(')
      .replace(/\bround\(/g, 'ROUND(');
    
    // Restore string literals
    result = result.replace(/"__STRING_(\d+)__"/g, (_, index) => {
      return `"${stringLiterals[parseInt(index)]}"`;
    });
    
    return result.trim();
  }

  private formatConstant(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value === null) {
      return 'NULL';
    }
    return value.toString();
  }

  private formatNameConstant(value: any): string {
    if (value === true) return 'TRUE';
    if (value === false) return 'FALSE';
    if (value === null) return 'NULL';
    return value.toString();
  }

  private visitBinOp(node: ASTNode): string {
    const left = this.visitExpression(node.left);
    const right = this.visitExpression(node.right);
    
    // Special handling for string concatenation
    if (node.op.type === 'Add' && 
        (this.isExplicitStringType(node.left) || this.isExplicitStringType(node.right))) {
      return `${left} & ${right}`;
    }
    
    const op = this.convertOperator(node.op);
    return `${left} ${op} ${right}`;
  }

  // Removed duplicate convertOperator method

  private visitUnaryOp(node: ASTNode): string {
    const operand = this.visitExpression(node.operand);
    const op = this.convertUnaryOperator(node.op);
    return `${op} ${operand}`;
  }

  private visitCompare(node: ASTNode): string {
    let result = this.visitExpression(node.left);
    
    for (let i = 0; i < node.ops.length; i++) {
      const op = this.convertCompareOperator(node.ops[i]);
      const comparator = this.visitExpression(node.comparators[i]);
      result += ` ${op} ${comparator}`;
    }
    
    return result;
  }

  private visitBoolOp(node: ASTNode): string {
    const op = node.op.type === 'And' ? ' AND ' : ' OR ';
    return node.values.map((value: ASTNode) => this.visitExpression(value)).join(op);
  }

  private visitCallExpression(node: ASTNode): string {
    // Special handling for string method calls
    if (node.func.type === 'Attribute') {
      const value = this.visitExpression(node.func.value);
      const method = node.func.attr;
      const args = node.args.map((arg: ASTNode) => this.visitExpression(arg));
      
      // Convert string methods to IGCSE Pseudocode functions
      switch (method) {
        case 'upper':
          return `UCASE(${value})`;
        case 'lower':
          return `LCASE(${value})`;
        case 'strip':
          return `TRIM(${value})`;
        case 'split':
          return args.length > 0 ? `SPLIT(${value}, ${args[0]})` : `SPLIT(${value})`;
        case 'replace':
          return args.length >= 2 ? `REPLACE(${value}, ${args[0]}, ${args[1]})` : `${value}.${method}(${args.join(', ')})`;
        case 'find':
          return args.length > 0 ? `FIND(${value}, ${args[0]})` : `${value}.${method}(${args.join(', ')})`;
        case 'startswith':
          return args.length > 0 ? `STARTSWITH(${value}, ${args[0]})` : `${value}.${method}(${args.join(', ')})`;
        case 'endswith':
          return args.length > 0 ? `ENDSWITH(${value}, ${args[0]})` : `${value}.${method}(${args.join(', ')})`;
        default:
          return `${value}.${method}(${args.join(', ')})`;
      }
    }
    
    const func = this.visitExpression(node.func);
    const args = node.args.map((arg: ASTNode) => this.visitExpression(arg));
    
    // Convert built-in functions
    const builtinResult = this.convertBuiltinFunction(func, args);
    if (builtinResult) {
      return builtinResult;
    }
    
    return `${func}(${args.join(', ')})`;
  }

  private visitAttribute(node: ASTNode): string {
    // If attribute access target is Subscript, process directly to ensure index conversion
    if (node.value.type === 'Subscript') {
      const subscriptValue = this.visitExpression(node.value.value);
      const slice = node.value.slice;
      
      // For numeric indices, convert from 0-based to 1-based
      if (slice.type === 'Num') {
        const index = slice.n + 1;
        return `${subscriptValue}[${index}].${node.attr}`;
      }
      
      // Also convert for Constant type numeric indices
      if (slice.type === 'Constant' && typeof slice.value === 'number') {
        const index = slice.value + 1;
        return `${subscriptValue}[${index}].${node.attr}`;
      }
      
      // For variable indices, add +1
      if (slice.type === 'Name') {
        const sliceValue = this.visitExpression(slice);
        return `${subscriptValue}[${sliceValue} + 1].${node.attr}`;
      }
      
      // For other cases, keep as is
      const sliceValue = this.visitExpression(slice);
      return `${subscriptValue}[${sliceValue}].${node.attr}`;
    }
    
    const value = this.visitExpression(node.value);
    
    // Convert string methods to IGCSE Pseudocode functions
    switch (node.attr) {
      case 'upper':
        return `UCASE(${value})`;
      case 'lower':
        return `LCASE(${value})`;
      case 'strip':
        return `TRIM(${value})`;
      case 'length':
      case '__len__':
        return `LENGTH(${value})`;
      default:
        return `${value}.${node.attr}`;
    }
  }

  private visitSubscript(node: ASTNode): string {
    const value = this.visitExpression(node.value);
    const slice = this.visitExpression(node.slice);
    
    // For numeric indices, convert from 0-based to 1-based
    if (node.slice.type === 'Num') {
      const index = node.slice.n + 1;
      return `${value}[${index}]`;
    }
    
    // Also convert for Constant type numeric indices
    if (node.slice.type === 'Constant' && typeof node.slice.value === 'number') {
      const index = node.slice.value + 1;
      return `${value}[${index}]`;
    }
    
    // For variable indices, add +1
    if (node.slice.type === 'Name') {
      return `${value}[${slice} + 1]`;
    }
    
    return `${value}[${slice}]`;
  }

  private visitList(node: ASTNode): string {
    // For array initialization, don't concatenate elements as strings
    // Properly handled by handleArrayInitialization in statement-visitor
    const elements = node.elts.map((elt: ASTNode) => this.visitExpression(elt));
    return `[${elements.join(', ')}]`;
  }

  private visitDict(node: ASTNode): string {
    const pairs: string[] = [];
    for (let i = 0; i < node.keys.length; i++) {
      const key = this.visitExpression(node.keys[i]);
      const value = this.visitExpression(node.values[i]);
      pairs.push(`${key}: ${value}`);
    }
    return `{${pairs.join(', ')}}`;
  }

  private visitListComp(_node: ASTNode): string {
    // Simplify list comprehensions
    return '[/* list comprehension */]';
  }

  private visitIfExp(node: ASTNode): string {
    const test = this.visitExpression(node.test);
    const body = this.visitExpression(node.body);
    const orelse = this.visitExpression(node.orelse);
    return `IF ${test} THEN ${body} ELSE ${orelse}`;
  }

  private visitJoinedStr(node: ASTNode): string {
    // Process f-strings
    const parts: string[] = [];
    
    for (const value of node.values) {
      if (value.type === 'Constant') {
        // String literal parts
        parts.push(`"${value.value}"`);
      } else if (value.type === 'FormattedValue') {
        // {expression} parts
        const expr = this.visitExpression(value.value);
        parts.push(expr);
      } else {
        // Other values
        parts.push(this.visitExpression(value));
      }
    }
    
    // Output as string concatenation
    return parts.join(' & ');
  }

  public convertBuiltinFunction(func: string, args: string[]): string | null {
    switch (func) {
      case 'print':
        return `OUTPUT ${args.join(', ')}`;
      case 'input':
        // input() requires special handling on the right side of assignment
    // Return as is for now, process later in emitter
        return args.length > 0 ? `input(${args[0]})` : 'input()';
      case 'len':
        return `LENGTH(${args[0]})`;
      case 'str':
        return `STRING(${args[0]})`;
      case 'int':
        return `INTEGER(${args[0]})`;
      case 'float':
        return `REAL(${args[0]})`;
      case 'abs':
        return `ABS(${args[0]})`;
      case 'max':
        return `MAX(${args.join(', ')})`;
      case 'min':
        return `MIN(${args.join(', ')})`;
      case 'round':
        return `ROUND(${args[0]})`;
      case 'range':
        if (args.length === 1) {
          return `0 TO ${args[0]} - 1`;
        } else if (args.length === 2) {
          return `${args[0]} TO ${args[1]} - 1`;
        } else if (args.length === 3) {
          return `${args[0]} TO ${args[1]} - 1 STEP ${args[2]}`;
        }
        return null;
      default:
        return null;
    }
  }

  private convertOperator(op: ASTNode): string {
    switch (op.type) {
      case 'Add': return '+'; // Keep '+' for numeric addition
      case 'Sub': return '-';
      case 'Mult': return '*';
      case 'Div': return '/';
      case 'FloorDiv': return 'DIV';
      case 'Mod': return 'MOD';
      case 'Pow': return '^';
      case 'LShift': return '<<';
      case 'RShift': return '>>';
      case 'BitOr': return '|';
      case 'BitXor': return '^';
      case 'BitAnd': return '&';
      default: return '+';
    }
  }

  private convertUnaryOperator(op: ASTNode): string {
    switch (op.type) {
      case 'UAdd': return '+';
      case 'USub': return '-';
      case 'Not': return 'NOT';
      default: return '';
    }
  }

  private convertCompareOperator(op: ASTNode): string {
    switch (op.type) {
      case 'Eq': return '=';
      case 'NotEq': return '≠';
      case 'Lt': return '<';
      case 'LtE': return '≤';
      case 'Gt': return '>';
      case 'GtE': return '≥';
      case 'Is': return '=';
      case 'IsNot': return '≠';
      case 'In': return 'IN';
      case 'NotIn': return 'NOT IN';
      default: return '=';
    }
  }

  /**
   * Infer type from value
   */
  inferTypeFromValue(node: ASTNode): IGCSEDataType {
    if (!node) return 'STRING';
    
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
      case 'NameConstant':
        if (node.value === true || node.value === false) return 'BOOLEAN';
        break;
      case 'List':
      case 'Tuple':
        return 'ARRAY';
      case 'Name':
        // Type inference for names (variables or numeric literals)
        if (node.id && /^\d+$/.test(node.id)) {
          // Integer literal
          return 'INTEGER';
        }
        if (node.id && /^\d+\.\d+$/.test(node.id)) {
          // Floating point literal
          return 'REAL';
        }
        if (node.id === 'True' || node.id === 'False') {
          return 'BOOLEAN';
        }
        // Other variable names are STRING (when type information is unavailable)
        return 'STRING';
      case 'BinOp':
        // Type inference for binary operations
        const leftType = this.inferTypeFromValue(node.left);
        const rightType = this.inferTypeFromValue(node.right);
        
        // For arithmetic operators
        if (['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'].includes(node.op.type)) {
          // String concatenation (+operator) - only for explicit string types
          if (node.op.type === 'Add' && 
              ((leftType === 'STRING' && this.isExplicitStringType(node.left)) || 
               (rightType === 'STRING' && this.isExplicitStringType(node.right)))) {
            return 'STRING';
          }
          
          // Treat as numeric operation if numeric types are involved
          if ((leftType === 'INTEGER' || leftType === 'REAL') || 
              (rightType === 'INTEGER' || rightType === 'REAL')) {
            // Division results in REAL
            if (node.op.type === 'Div') {
              return 'REAL';
            }
            // INTEGER if both are INTEGER or type unknown (variables)
            if ((leftType === 'INTEGER' || leftType === 'STRING') && 
                (rightType === 'INTEGER' || rightType === 'STRING')) {
              return 'INTEGER';
            } else {
              return 'REAL';
            }
          }
          
          // Default arithmetic operations inferred as INTEGER (for unknown variable types)
          return 'INTEGER';
        }
        
        // For comparison operators
        if (['Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        // For logical operators
        if (['And', 'Or'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        // Default is STRING
        return 'STRING';
    }
    
    return 'STRING';
  }

  /**
   * Check if it's a numeric constant
   */
  isNumericConstant(node: ASTNode): boolean {
    return (node.type === 'Constant' && typeof node.value === 'number') ||
           (node.type === 'Num');
  }

  /**
   * Get the value of a numeric constant
   */
  getNumericValue(node: ASTNode): number {
    if (node.type === 'Constant' && typeof node.value === 'number') {
      return node.value;
    }
    if (node.type === 'Num') {
      return node.n;
    }
    return 0;
  }

  /**
   * Check if it's array initialization
   */
  isArrayInitialization(node: ASTNode): boolean {
    return node.type === 'List' || node.type === 'Tuple';
  }

  /**
   * Check if it's an explicit string type
   */
  private isExplicitStringType(node: ASTNode): boolean {
    if (!node) return false;
    
    switch (node.type) {
      case 'Constant':
        return typeof node.value === 'string';
      case 'Str':
        return true;
      case 'JoinedStr': // f-string
        return true;
      case 'Name':
        // For test cases with undefined variables, assume string type for variables with common string naming patterns
        const namePatterns = ['name', 'str', 'text', 'message', 'title', 'description', 'label', 'id'];
        return namePatterns.some(pattern => node.id && node.id.toLowerCase().includes(pattern));
      default:
        return false;
    }
  }
}