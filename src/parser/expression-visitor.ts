// import { IR, IRKind, createIR } from '../types/ir';
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
 * 式の処理を担当するビジタークラス
 */
export class ExpressionVisitor {
  /**
   * 式をIGCSE疑似コードに変換
   */
  visitExpression(node: ASTNode): string {
    if (!node) return '';

    // If the node has a raw property, use it for simplified parsing
    if (node.raw) {
      const result = this.parseRawExpression(node.raw);
      // keepParenthesesフラグがある場合は括弧を保持
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
        // 括弧付きの式の処理
        if (node.parenthesized) {
          return `(${this.visitExpression(node.value)})`;
        }
        return this.visitExpression(node.value);
      default:
        return `/* ${node.type} */`;
    }
  }

  /**
   * 簡易的な式の解析
   */
  private parseRawExpression(raw: string): string {
    // 文字列リテラルを一時的に保護
    const stringLiterals: string[] = [];
    let result = raw.replace(/"([^"]*)"/g, (_, content) => {
      const placeholder = `__STRING_${stringLiterals.length}__`;
      stringLiterals.push(content);
      return `"${placeholder}"`;
    });
    
    // 比較演算子の変換（単語境界を使用）
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
    
    // 文字列リテラルを復元
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
    const op = this.convertOperator(node.op);
    return `${left} ${op} ${right}`;
  }

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
    // 文字列メソッド呼び出しの特別処理
    if (node.func.type === 'Attribute') {
      const value = this.visitExpression(node.func.value);
      const method = node.func.attr;
      const args = node.args.map((arg: ASTNode) => this.visitExpression(arg));
      
      // 文字列メソッドをIGCSE Pseudocode関数に変換
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
    
    // 組み込み関数の変換
    const builtinResult = this.convertBuiltinFunction(func, args);
    if (builtinResult) {
      return builtinResult;
    }
    
    return `${func}(${args.join(', ')})`;
  }

  private visitAttribute(node: ASTNode): string {
    // 属性アクセスの対象がSubscriptの場合、直接処理してインデックス変換を確実に適用
    if (node.value.type === 'Subscript') {
      const subscriptValue = this.visitExpression(node.value.value);
      const slice = node.value.slice;
      
      // 数値インデックスの場合、0ベースから1ベースに変換
      if (slice.type === 'Num') {
        const index = slice.n + 1;
        return `${subscriptValue}[${index}].${node.attr}`;
      }
      
      // Constant型の数値インデックスの場合も変換
      if (slice.type === 'Constant' && typeof slice.value === 'number') {
        const index = slice.value + 1;
        return `${subscriptValue}[${index}].${node.attr}`;
      }
      
      // 変数インデックスの場合、+1を追加
      if (slice.type === 'Name') {
        const sliceValue = this.visitExpression(slice);
        return `${subscriptValue}[${sliceValue} + 1].${node.attr}`;
      }
      
      // その他の場合はそのまま
      const sliceValue = this.visitExpression(slice);
      return `${subscriptValue}[${sliceValue}].${node.attr}`;
    }
    
    const value = this.visitExpression(node.value);
    
    // 文字列メソッドをIGCSE Pseudocode関数に変換
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
    
    // 数値インデックスの場合、0ベースから1ベースに変換
    if (node.slice.type === 'Num') {
      const index = node.slice.n + 1;
      return `${value}[${index}]`;
    }
    
    // Constant型の数値インデックスの場合も変換
    if (node.slice.type === 'Constant' && typeof node.slice.value === 'number') {
      const index = node.slice.value + 1;
      return `${value}[${index}]`;
    }
    
    // 変数インデックスの場合、+1を追加
    if (node.slice.type === 'Name') {
      return `${value}[${slice} + 1]`;
    }
    
    return `${value}[${slice}]`;
  }

  private visitList(node: ASTNode): string {
    // 配列初期化の場合は、要素をそのまま文字列として結合しない
    // statement-visitorのhandleArrayInitializationで適切に処理される
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
    // リスト内包表記は簡略化
    return '[/* list comprehension */]';
  }

  private visitIfExp(node: ASTNode): string {
    const test = this.visitExpression(node.test);
    const body = this.visitExpression(node.body);
    const orelse = this.visitExpression(node.orelse);
    return `IF ${test} THEN ${body} ELSE ${orelse}`;
  }

  private visitJoinedStr(node: ASTNode): string {
    // f-stringの処理
    const parts: string[] = [];
    
    for (const value of node.values) {
      if (value.type === 'Constant') {
        // 文字列リテラル部分
        parts.push(`"${value.value}"`);
      } else if (value.type === 'FormattedValue') {
        // {expression}部分
        const expr = this.visitExpression(value.value);
        parts.push(expr);
      } else {
        // その他の値
        parts.push(this.visitExpression(value));
      }
    }
    
    // 文字列連結として出力
    return parts.join(' & ');
  }

  public convertBuiltinFunction(func: string, args: string[]): string | null {
    switch (func) {
      case 'print':
        return `OUTPUT ${args.join(', ')}`;
      case 'input':
        // input()は代入文の右辺では特別な処理が必要
        // ここでは一旦そのまま返し、後でエミッターで処理
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
      case 'Add': return '+';
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
   * 値から型を推論
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
        // 名前（変数や数値リテラル）の型推論
        if (node.id && /^\d+$/.test(node.id)) {
          // 整数リテラル
          return 'INTEGER';
        }
        if (node.id && /^\d+\.\d+$/.test(node.id)) {
          // 浮動小数点リテラル
          return 'REAL';
        }
        if (node.id === 'True' || node.id === 'False') {
          return 'BOOLEAN';
        }
        // その他の変数名はSTRING（型情報がない場合）
        return 'STRING';
      case 'BinOp':
        // 二項演算の型推論
        const leftType = this.inferTypeFromValue(node.left);
        const rightType = this.inferTypeFromValue(node.right);
        
        // 算術演算子の場合
        if (['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'].includes(node.op.type)) {
          // 文字列の連結（+演算子）- 明示的に文字列型の場合のみ
          if (node.op.type === 'Add' && 
              ((leftType === 'STRING' && this.isExplicitStringType(node.left)) || 
               (rightType === 'STRING' && this.isExplicitStringType(node.right)))) {
            return 'STRING';
          }
          
          // 数値型が含まれている場合は数値演算として扱う
          if ((leftType === 'INTEGER' || leftType === 'REAL') || 
              (rightType === 'INTEGER' || rightType === 'REAL')) {
            // 除算の場合はREAL
            if (node.op.type === 'Div') {
              return 'REAL';
            }
            // 両方がINTEGERまたは型不明（変数）の場合はINTEGER
            if ((leftType === 'INTEGER' || leftType === 'STRING') && 
                (rightType === 'INTEGER' || rightType === 'STRING')) {
              return 'INTEGER';
            } else {
              return 'REAL';
            }
          }
          
          // デフォルトで算術演算はINTEGERとして推論（型不明な変数同士の場合）
          return 'INTEGER';
        }
        
        // 比較演算子の場合
        if (['Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        // 論理演算子の場合
        if (['And', 'Or'].includes(node.op.type)) {
          return 'BOOLEAN';
        }
        
        // デフォルトはSTRING
        return 'STRING';
    }
    
    return 'STRING';
  }

  /**
   * 数値定数かどうかを判定
   */
  isNumericConstant(node: ASTNode): boolean {
    return (node.type === 'Constant' && typeof node.value === 'number') ||
           (node.type === 'Num');
  }

  /**
   * 数値定数の値を取得
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
   * 配列初期化かどうかを判定
   */
  isArrayInitialization(node: ASTNode): boolean {
    return node.type === 'List' || node.type === 'Tuple';
  }

  /**
   * 明示的な文字列型かどうかを判定
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
      default:
        return false;
    }
  }
}