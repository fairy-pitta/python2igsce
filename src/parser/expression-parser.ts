import { ASTNode } from '../types/parser';

/**
 * 式解析器
 * Python式をASTノードに変換する
 */
export class ExpressionParser {
  /**
   * 式を解析してASTノードに変換
   */
  parseExpression(expr: string): ASTNode {
    const trimmed = expr.trim();
    
    // 空リストの検出
    if (trimmed === '[]') {
      return {
        type: 'List',
        elts: [],
        ctx: 'Load'
      };
    }
    
    // リストリテラルの検出
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1).trim();
      if (!content) {
        return {
          type: 'List',
          elts: [],
          ctx: 'Load'
        };
      }
      
      // リスト要素の解析
      const elements = content.split(',').map(elem => {
        const elemTrimmed = elem.trim();
        
        // 数値の検出
        if (/^\d+$/.test(elemTrimmed)) {
          return {
            type: 'Constant',
            value: parseInt(elemTrimmed),
            kind: null
          };
        }
        
        // 文字列の検出
        if ((elemTrimmed.startsWith('"') && elemTrimmed.endsWith('"')) ||
            (elemTrimmed.startsWith("'") && elemTrimmed.endsWith("'"))) {
          return {
            type: 'Constant',
            value: elemTrimmed.slice(1, -1),
            kind: null
          };
        }
        
        // 変数名の検出
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(elemTrimmed)) {
          return {
            type: 'Name',
            id: elemTrimmed,
            ctx: 'Load'
          };
        }
        
        // その他の式
        return {
          type: 'Name',
          id: elemTrimmed,
          ctx: 'Load'
        };
      });
      
      return {
        type: 'List',
        elts: elements,
        ctx: 'Load'
      };
    }
    
    // NOT演算子の検出（最優先）
    if (trimmed.startsWith('not ')) {
      const operand = trimmed.substring(4).trim();
      return {
        type: 'UnaryOp',
        op: { type: 'Not' },
        operand: this.parseExpression(operand)
      };
    }
    
    // 括弧で囲まれた式の処理
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const innerExpr = trimmed.slice(1, -1);
      const innerNode = this.parseExpression(innerExpr);
      // 括弧付きの式として明示的にマーク
      return {
        type: 'Expr',
        value: innerNode,
        parenthesized: true
      };
    }
    
    // 比較演算子の検出
    const compareOps = ['==', '!=', '<=', '>=', '<', '>'];
    for (const op of compareOps) {
      const index = trimmed.indexOf(op);
      if (index !== -1) {
        const left = trimmed.substring(0, index).trim();
        const right = trimmed.substring(index + op.length).trim();
        
        return {
          type: 'Compare',
          left: this.parseSimpleExpression(left),
          ops: [this.getCompareOpNode(op)],
          comparators: [this.parseSimpleExpression(right)]
        };
      }
    }
    
    // 論理演算子の検出
    if (trimmed.includes(' and ')) {
      const parts = trimmed.split(' and ');
      let result = this.parseExpression(parts[0].trim());
      
      for (let i = 1; i < parts.length; i++) {
        result = {
          type: 'BoolOp',
          op: { type: 'And' },
          values: [result, this.parseExpression(parts[i].trim())]
        };
      }
      
      return result;
    }
    
    if (trimmed.includes(' or ')) {
      const parts = trimmed.split(' or ');
      let result = this.parseExpression(parts[0].trim());
      
      for (let i = 1; i < parts.length; i++) {
        result = {
          type: 'BoolOp',
          op: { type: 'Or' },
          values: [result, this.parseExpression(parts[i].trim())]
        };
      }
      
      return result;
    }
    
    // 算術演算子の検出
    const arithmeticOps = ['+', '-', '*', '/', '%'];
    for (const op of arithmeticOps) {
      const index = trimmed.indexOf(op);
      if (index !== -1) {
        const left = trimmed.substring(0, index).trim();
        const right = trimmed.substring(index + 1).trim();
        
        return {
          type: 'BinOp',
          left: this.parseSimpleExpression(left),
          op: this.getArithmeticOpNode(op),
          right: this.parseSimpleExpression(right)
        };
      }
    }
    
    // 関数呼び出しの検出
    if (trimmed.includes('(') && trimmed.endsWith(')')) {
      const parenIndex = trimmed.indexOf('(');
      const funcName = trimmed.substring(0, parenIndex).trim();
      const argsStr = trimmed.substring(parenIndex + 1, trimmed.length - 1);
      
      const args = argsStr ? argsStr.split(',').map(arg => this.parseExpression(arg.trim())) : [];
      
      return {
        type: 'Call',
        func: {
          type: 'Name',
          id: funcName,
          ctx: 'Load'
        },
        args
      };
    }
    
    // 配列アクセスの検出
    if (trimmed.includes('[') && trimmed.endsWith(']')) {
      const bracketIndex = trimmed.indexOf('[');
      const arrayName = trimmed.substring(0, bracketIndex).trim();
      const indexStr = trimmed.substring(bracketIndex + 1, trimmed.length - 1);
      
      return {
        type: 'Subscript',
        value: {
          type: 'Name',
          id: arrayName,
          ctx: 'Load'
        },
        slice: this.parseExpression(indexStr),
        ctx: 'Load'
      };
    }
    
    // 属性アクセスの検出
    if (trimmed.includes('.')) {
      const dotIndex = trimmed.indexOf('.');
      const objName = trimmed.substring(0, dotIndex).trim();
      const attrName = trimmed.substring(dotIndex + 1).trim();
      
      return {
        type: 'Attribute',
        value: {
          type: 'Name',
          id: objName,
          ctx: 'Load'
        },
        attr: attrName,
        ctx: 'Load'
      };
    }
    
    // 単純な式の解析
    return this.parseSimpleExpression(trimmed);
  }
  
  /**
   * 単純な式（リテラル、変数名など）を解析
   */
  private parseSimpleExpression(expr: string): ASTNode {
    const trimmed = expr.trim();
    
    // 数値リテラル（整数）
    if (/^-?\d+$/.test(trimmed)) {
      return {
        type: 'Constant',
        value: parseInt(trimmed),
        kind: null
      };
    }
    
    // 数値リテラル（浮動小数点）
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return {
        type: 'Constant',
        value: parseFloat(trimmed),
        kind: null
      };
    }
    
    // 文字列リテラル（ダブルクォート）
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return {
        type: 'Constant',
        value: trimmed.slice(1, -1),
        kind: null
      };
    }
    
    // 文字列リテラル（シングルクォート）
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return {
        type: 'Constant',
        value: trimmed.slice(1, -1),
        kind: null
      };
    }
    
    // ブール値リテラル
    if (trimmed === 'True') {
      return {
        type: 'Constant',
        value: true,
        kind: null
      };
    }
    
    if (trimmed === 'False') {
      return {
        type: 'Constant',
        value: false,
        kind: null
      };
    }
    
    // None値
    if (trimmed === 'None') {
      return {
        type: 'Constant',
        value: null,
        kind: null
      };
    }
    
    // 変数名
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      return {
        type: 'Name',
        id: trimmed,
        ctx: 'Load'
      };
    }
    
    // その他（エラーケース）
    return {
      type: 'Name',
      id: trimmed,
      ctx: 'Load'
    };
  }
  
  /**
   * 比較演算子ノードを取得
   */
  private getCompareOpNode(op: string): ASTNode {
    switch (op) {
      case '==':
        return { type: 'Eq' };
      case '!=':
        return { type: 'NotEq' };
      case '<':
        return { type: 'Lt' };
      case '<=':
        return { type: 'LtE' };
      case '>':
        return { type: 'Gt' };
      case '>=':
        return { type: 'GtE' };
      default:
        throw new Error(`Unknown comparison operator: ${op}`);
    }
  }
  
  /**
   * 算術演算子ノードを取得
   */
  private getArithmeticOpNode(op: string): ASTNode {
    switch (op) {
      case '+':
        return { type: 'Add' };
      case '-':
        return { type: 'Sub' };
      case '*':
        return { type: 'Mult' };
      case '/':
        return { type: 'Div' };
      case '%':
        return { type: 'Mod' };
      default:
        throw new Error(`Unknown arithmetic operator: ${op}`);
    }
  }
}