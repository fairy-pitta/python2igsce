import { IR, IRKind, createIR, IRMeta, countIRNodes } from '../types/ir';
import { BaseParser } from './base-parser';
import { StatementVisitor } from './statement-visitor';
import { DefinitionVisitor } from './definition-visitor';

/**
 * Basic interface for Python AST nodes
 */
interface ASTNode {
  type: string;
  lineno?: number;
  col_offset?: number;
  inlineComment?: string;
  [key: string]: any;
}

/**
 * Visitor for converting Python AST to IR
 */
export class PythonASTVisitor extends BaseParser {
  private statementVisitor: StatementVisitor;
  private definitionVisitor: DefinitionVisitor;

  constructor() {
    super();
    this.statementVisitor = new StatementVisitor();
    this.definitionVisitor = new DefinitionVisitor();

    // Share context with visitors
    this.statementVisitor.setContext(this.context);
    this.definitionVisitor.setContext(this.context);
  }

  /**
   * Main parse function
   */
  parse(source: string): import('../types/parser').ParseResult {
    this.startParsing();
    this.resetContext();

    try {
      // 実際の実装では、PythonのASTパーサーを使用
      // Provide simplified implementation here
      const ast = this.parseToAST(source);
      // 2パス処理: まずすべてのクラス定義を事前登録
      this.preRegisterAllClasses(ast.body);

      // Re-share latest context with visitors after class definition registration
      this.statementVisitor.setContext(this.context);
      this.definitionVisitor.setContext(this.context);

      const ir = this.visitNode(ast);

      // Return child elements if IR is not an array
      if (ir.kind === 'compound' && ir.children) {
        return this.createParseResult(ir.children);
      }

      return this.createParseResult([ir]);
    } catch (error) {
      this.addError(
        `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'syntax_error'
      );

      // Return empty IR on error
      const emptyIR = createIR('statement', '', []);
      return this.createParseResult([emptyIR]);
    }
  }

  /**
   * Simple AST parser (uses external library in actual implementation)
   */
  private parseToAST(source: string): ASTNode {
    // In actual implementation, use python-ast or pyodide
    // Simplified implementation here
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const processedLines = new Set<number>();

    let i = 0;
    while (i < lines.length) {
      if (processedLines.has(i)) {
        i++;
        continue;
      }

      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('#')) {
        // Process comment lines
        const commentNode: ASTNode = {
          type: 'Comment',
          value: trimmed.substring(1).trim(),
          lineno: i + 1,
        };
        nodes.push(commentNode);
        processedLines.add(i);
        i++;
      } else if (trimmed) {
        const result = this.parseStatement(lines, i);
        if (result.node) {
          nodes.push(result.node);
          // Mark processed lines
          for (let j = i; j < result.nextIndex; j++) {
            processedLines.add(j);
          }
        }
        i = result.nextIndex;
      } else {
        processedLines.add(i);
        i++;
      }
    }

    return {
      type: 'Module',
      body: nodes,
    };
  }

  /**
   * Parse statements and their child blocks
   */
  private parseStatement(
    lines: string[],
    startIndex: number
  ): { node: ASTNode | null; nextIndex: number } {
    const line = lines[startIndex];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    // Create basic statement node
    const node = this.parseLineToASTNode(trimmed, startIndex + 1);
    if (!node) {
      return { node: null, nextIndex: startIndex + 1 };
    }

    // For statements ending with colon (block statements), parse child blocks
    if (trimmed.endsWith(':')) {
      const bodyNodes: ASTNode[] = [];
      let i = startIndex + 1;

      // Parse child block from next line
      while (i < lines.length) {
        const childLine = lines[i];
        const childTrimmed = childLine.trim();
        const childIndent = childLine.length - childLine.trimStart().length;

        // Skip empty lines and comment lines
        if (!childTrimmed || childTrimmed.startsWith('#')) {
          i++;
          continue;
        }

        // For IF statements, handle ELIF and ELSE statements specially
        if (node.type === 'If' && childIndent === indent) {
          if (childTrimmed.startsWith('elif ')) {
            // Process ELIF statement as new IF statement and add to orelse
            const elifResult = this.parseStatement(lines, i);
            if (elifResult.node) {
              node.orelse = [elifResult.node];
            }
            i = elifResult.nextIndex;
            break;
          } else if (childTrimmed.startsWith('else:')) {
            // Process ELSE clause
            const elseNodes: ASTNode[] = [];
            i++; // else行をスキップ

            // Parse child blocks of ELSE clause
            while (i < lines.length) {
              const elseChildLine = lines[i];
              const elseChildTrimmed = elseChildLine.trim();
              const elseChildIndent = elseChildLine.length - elseChildLine.trimStart().length;

              // Skip empty lines and comment lines
              if (!elseChildTrimmed || elseChildTrimmed.startsWith('#')) {
                i++;
                continue;
              }

              // End ELSE clause if indent is same or less
              if (elseChildIndent <= indent) {
                break;
              }

              // Parse child statements of ELSE clause
              const elseChildResult = this.parseStatement(lines, i);
              if (elseChildResult.node) {
                elseNodes.push(elseChildResult.node);
              }
              i = elseChildResult.nextIndex;
            }

            // Set ELSE clause to node
            node.orelse = elseNodes;
            break;
          }
        }

        // End block if indent is same or less
        if (childIndent <= indent) {
          break;
        }

        // Parse child statements
        const childResult = this.parseStatement(lines, i);
        if (childResult.node) {
          bodyNodes.push(childResult.node);
        }
        i = childResult.nextIndex;
      }

      // Set child blocks to node
      if (
        node.type === 'If' ||
        node.type === 'For' ||
        node.type === 'While' ||
        node.type === 'FunctionDef' ||
        node.type === 'ClassDef'
      ) {
        node.body = bodyNodes;
      }

      return { node, nextIndex: i };
    }

    return { node, nextIndex: startIndex + 1 };
  }

  /**
   * Convert single line to AST node
   */
  private parseLineToASTNode(line: string, lineNumber: number): ASTNode | null {
    const trimmed = line.trim();

    // Detect IF statements
    if (trimmed.startsWith('if ')) {
      return this.parseIfStatement(trimmed, lineNumber);
    }

    // Detect ELIF statements (process as IF statements)
    if (trimmed.startsWith('elif ')) {
      // Replace 'elif' with 'if' and process
      const ifLine = 'if ' + trimmed.substring(5);
      return this.parseIfStatement(ifLine, lineNumber);
    }

    // Detect FOR statements
    if (trimmed.startsWith('for ')) {
      return this.parseForStatement(trimmed, lineNumber);
    }

    // Detect WHILE statements
    if (trimmed.startsWith('while ')) {
      return this.parseWhileStatement(trimmed, lineNumber);
    }

    // Detect class definitions
    if (trimmed.startsWith('class ')) {
      return this.parseClassDef(trimmed, lineNumber);
    }

    // Detect function definitions
    if (trimmed.startsWith('def ')) {
      return this.parseFunctionDef(trimmed, lineNumber);
    }

    // Detect type-annotated assignment statements (e.g., items: list[str] = [])
    if (trimmed.includes(': ') && trimmed.includes(' = ')) {
      const colonIndex = trimmed.indexOf(': ');
      const equalIndex = trimmed.indexOf(' = ');

      // Type-annotated assignment if colon comes before equals
      if (colonIndex < equalIndex) {
        const varName = trimmed.substring(0, colonIndex).trim();
        const typeAnnotation = trimmed.substring(colonIndex + 2, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 3).trim();

        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          return {
            type: 'AnnAssign',
            target: {
              type: 'Name',
              id: varName,
              ctx: 'Store',
            },
            annotation: {
              type: 'Subscript',
              value: {
                type: 'Name',
                id: typeAnnotation.includes('[')
                  ? typeAnnotation.substring(0, typeAnnotation.indexOf('['))
                  : typeAnnotation,
              },
              slice: typeAnnotation.includes('[')
                ? {
                    type: 'Name',
                    id: typeAnnotation.substring(
                      typeAnnotation.indexOf('[') + 1,
                      typeAnnotation.indexOf(']')
                    ),
                  }
                : null,
            },
            value: value ? this.parseExpression(value) : null,
            lineno: lineNumber,
          };
        }
      }
    }

    // Detect assignment statements
    if (trimmed.includes(' = ')) {
      // Check before and after = to determine if it's an assignment statement
      const equalIndex = trimmed.indexOf(' = ');
      const beforeEqual = trimmed.substring(0, equalIndex).trim();
      const afterEqual = trimmed.substring(equalIndex + 3).trim();

      // Detect array element assignment (e.g., data[1] = 100)
      const arrayAssignMatch = beforeEqual.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/);
      if (arrayAssignMatch && afterEqual.length > 0) {
        const [, arrayName, indexExpr] = arrayAssignMatch;
        return {
          type: 'Assign',
          targets: [
            {
              type: 'Subscript',
              value: {
                type: 'Name',
                id: arrayName,
                ctx: 'Load',
              },
              slice: {
                type: 'Index',
                value: {
                  type: 'Constant',
                  value: parseInt(indexExpr),
                  kind: null,
                },
              },
              ctx: 'Store',
            },
          ],
          value: this.parseExpression(afterEqual),
          lineno: lineNumber,
        };
      }

      // Detect attribute assignment (e.g., self.name = value)
      const attrAssignMatch = beforeEqual.match(
        /^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/
      );
      if (attrAssignMatch && afterEqual.length > 0) {
        const [, objName, attrName] = attrAssignMatch;
        return {
          type: 'Assign',
          targets: [
            {
              type: 'Attribute',
              value: {
                type: 'Name',
                id: objName,
                ctx: 'Load',
              },
              attr: attrName,
              ctx: 'Store',
            },
          ],
          value: this.parseExpression(afterEqual),
          lineno: lineNumber,
        };
      }

      // Assignment statement if left side is simple variable name and right side exists
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(beforeEqual) && afterEqual.length > 0) {
        return this.parseAssignStatement(trimmed, lineNumber);
      }
    }

    // Detect print statements
    if (trimmed.startsWith('print(')) {
      return this.parsePrintStatement(trimmed, lineNumber);
    }

    // Detect function definitions
    if (trimmed.startsWith('def ')) {
      return this.parseFunctionDef(trimmed, lineNumber);
    }

    // Detect class definitions
    if (trimmed.startsWith('class ')) {
      return this.parseClassDef(trimmed, lineNumber);
    }

    // Detect return statements
    if (trimmed.startsWith('return')) {
      return this.parseReturnStatement(trimmed, lineNumber);
    }

    // Detect break statements
    if (trimmed === 'break') {
      return {
        type: 'Break',
        lineno: lineNumber,
      };
    }

    // Detect continue statements
    if (trimmed === 'continue') {
      return {
        type: 'Continue',
        lineno: lineNumber,
      };
    }

    // Detect augmented assignment statements (+=, -=, *=, /=, %=)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*[+\-*/%]=/.test(trimmed)) {
      return this.parseAugAssignStatement(trimmed, lineNumber);
    }

    // Detect function calls
    const callMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const funcName = callMatch[1];
      const argsStr = callMatch[2];
      const args = this.parseArguments(argsStr);

      return {
        type: 'Expr',
        lineno: lineNumber,
        value: {
          type: 'Call',
          func: { type: 'Name', id: funcName },
          args: args,
        },
      };
    }

    // Process as other expression statements
    return {
      type: 'Expr',
      lineno: lineNumber,
      value: {
        type: 'Call',
        func: { type: 'Name', id: 'unknown' },
        args: [],
        raw: trimmed,
      },
    };
  }

  /**
   * Parse augmented assignment statements
   */
  private parseAugAssignStatement(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*([+\-*/%])=\s*(.+)$/);

    if (!match) {
      // Process as normal expression if no match
      return {
        type: 'Expr',
        lineno: lineNumber,
        value: {
          type: 'Call',
          func: { type: 'Name', id: 'unknown' },
          args: [],
          raw: line,
        },
      };
    }

    const [, target, op, value] = match;

    return {
      type: 'AugAssign',
      lineno: lineNumber,
      target: {
        type: 'Name',
        id: target,
      },
      op: {
        type: this.getAugAssignOpType(op),
      },
      value: {
        type: 'Num',
        n: isNaN(Number(value)) ? value : Number(value),
        raw: value,
      },
    };
  }

  /**
   * Get type of augmented assignment operator
   */
  private getAugAssignOpType(op: string): string {
    switch (op) {
      case '+':
        return 'Add';
      case '-':
        return 'Sub';
      case '*':
        return 'Mult';
      case '/':
        return 'Div';
      case '%':
        return 'Mod';
      default:
        return 'Add';
    }
  }

  private parseIfStatement(line: string, lineNumber: number): ASTNode {
    // Parse "if condition:" format
    const match = line.match(/^if\s+(.+):\s*$/);
    const condition = match ? match[1] : line.substring(3, line.length - 1);

    return {
      type: 'If',
      lineno: lineNumber,
      test: {
        type: 'Compare',
        left: { type: 'Name', id: 'condition' },
        ops: ['>'],
        comparators: [{ type: 'Num', n: 0 }],
        raw: condition,
      },
      body: [],
      orelse: [],
    };
  }

  private parseForStatement(line: string, lineNumber: number): ASTNode {
    // Parse "for var in iterable:" format
    const match = line.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
    const target = match ? match[1] : 'i';
    const iter = match ? match[2] : 'range(1)';

    // Parse range function arguments
    let args: any[] = [];
    if (iter.startsWith('range(') && iter.endsWith(')')) {
      const argsStr = iter.slice(6, -1); // "range(" と ")" を除去
      if (argsStr.trim()) {
        const argParts = argsStr.split(',').map((arg) => arg.trim());
        args = argParts.map((arg) => ({
          type: 'Num',
          n: isNaN(Number(arg)) ? arg : Number(arg),
          raw: arg,
        }));
      }
    }

    // For direct iteration over arrays or lists
    if (!iter.startsWith('range(')) {
      return {
        type: 'For',
        lineno: lineNumber,
        target: { type: 'Name', id: target },
        iter: {
          type: 'Name',
          id: iter,
        },
        body: [],
        orelse: [],
      };
    }

    return {
      type: 'For',
      lineno: lineNumber,
      target: { type: 'Name', id: target },
      iter: {
        type: 'Call',
        func: { type: 'Name', id: 'range' },
        args: args,
        raw: iter,
      },
      body: [],
      orelse: [],
    };
  }

  private parseWhileStatement(line: string, lineNumber: number): ASTNode {
    // Parse "while condition:" format
    const match = line.match(/^while\s+(.+):\s*$/);
    const condition = match ? match[1] : line.substring(6, line.length - 1);

    return {
      type: 'While',
      lineno: lineNumber,
      test: {
        type: 'Compare',
        raw: condition,
      },
      body: [],
      orelse: [],
    };
  }

  private parseAssignStatement(line: string, lineNumber: number): ASTNode {
    // Parse "var = value" format
    const parts = line.split(' = ');
    const target = parts[0].trim();
    let value = parts.slice(1).join(' = ').trim();

    // Extract inline comment part (after #)
    let inlineComment = '';
    const commentIndex = value.indexOf('#');
    if (commentIndex !== -1) {
      inlineComment = value.substring(commentIndex + 1).trim();
      value = value.substring(0, commentIndex).trim();
    }

    // Detect array literals
    if (value.startsWith('[') && value.endsWith(']')) {
      const elementsStr = value.slice(1, -1).trim();
      const elements = elementsStr
        ? elementsStr.split(',').map((elem) => {
            const trimmed = elem.trim();
            // Determine if it's a number
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
              return {
                type: 'Num',
                n: parseFloat(trimmed),
              };
            } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              return {
                type: 'Str',
                s: trimmed.slice(1, -1),
              };
            } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
              return {
                type: 'Str',
                s: trimmed.slice(1, -1),
              };
            } else {
              return {
                type: 'Name',
                id: trimmed,
              };
            }
          })
        : [];

      return {
        type: 'Assign',
        lineno: lineNumber,
        targets: [{ type: 'Name', id: target }],
        value: {
          type: 'List',
          elts: elements,
        },
      };
    }

    // Detect array access (e.g., my_array[0])
    const arrayAccessMatch = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]$/);
    if (arrayAccessMatch) {
      const [, arrayName, indexStr] = arrayAccessMatch;
      return {
        type: 'Assign',
        lineno: lineNumber,
        targets: [{ type: 'Name', id: target }],
        value: {
          type: 'Subscript',
          value: { type: 'Name', id: arrayName },
          slice: { type: 'Num', n: parseInt(indexStr) },
        },
      };
    }

    // Detect expressions containing comparison operators
    const valueNode = this.parseExpression(value);

    const assignNode: ASTNode = {
      type: 'Assign',
      lineno: lineNumber,
      targets: [
        {
          type: 'Name',
          id: target,
        },
      ],
      value: valueNode,
    };

    if (inlineComment) {
      assignNode.inlineComment = inlineComment;
    }

    return assignNode;
  }

  /**
   * Parse expressions and convert to AST nodes
   */
  private parseExpression(expr: string): ASTNode {
    const trimmed = expr.trim();

    // Detect empty lists
    if (trimmed === '[]') {
      return {
        type: 'List',
        elts: [],
        ctx: 'Load',
      };
    }

    // Detect list literals
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1).trim();
      if (!content) {
        return {
          type: 'List',
          elts: [],
          ctx: 'Load',
        };
      }

      // Parse list elements
      const elements = content.split(',').map((elem) => {
        const elemTrimmed = elem.trim();

        // Detect numbers
        if (/^\d+$/.test(elemTrimmed)) {
          return {
            type: 'Constant',
            value: parseInt(elemTrimmed),
            kind: null,
          };
        }

        // String detection
        if (
          (elemTrimmed.startsWith('"') && elemTrimmed.endsWith('"')) ||
          (elemTrimmed.startsWith("'") && elemTrimmed.endsWith("'"))
        ) {
          return {
            type: 'Constant',
            value: elemTrimmed.slice(1, -1),
            kind: null,
          };
        }

        // Detect variable names
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(elemTrimmed)) {
          return {
            type: 'Name',
            id: elemTrimmed,
            ctx: 'Load',
          };
        }

        // Other expressions
        return {
          type: 'Name',
          id: elemTrimmed,
          ctx: 'Load',
        };
      });

      return {
        type: 'List',
        elts: elements,
        ctx: 'Load',
      };
    }

    // Detect NOT operator (highest priority)
    if (trimmed.startsWith('not ')) {
      const operand = trimmed.substring(4).trim();
      return {
        type: 'UnaryOp',
        op: { type: 'Not' },
        operand: this.parseExpression(operand),
      };
    }

    // Process expressions enclosed in parentheses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const innerExpr = trimmed.slice(1, -1);
      const innerNode = this.parseExpression(innerExpr);
      // Explicitly mark as parenthesized expression
      return {
        type: 'Expr',
        value: innerNode,
        parenthesized: true,
      };
    }

    // Detect comparison operators
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
          comparators: [this.parseSimpleExpression(right)],
        };
      }
    }

    // Detect logical operators
    if (trimmed.includes(' and ')) {
      const parts = trimmed.split(' and ');
      return {
        type: 'BoolOp',
        op: { type: 'And' },
        values: parts.map((part) => this.parseExpression(part.trim())),
      };
    }

    if (trimmed.includes(' or ')) {
      const parts = trimmed.split(' or ');
      return {
        type: 'BoolOp',
        op: { type: 'Or' },
        values: parts.map((part) => this.parseExpression(part.trim())),
      };
    }

    // Detect method calls (e.g., text.upper())
    const methodCallMatch = trimmed.match(/^(.+)\.([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (methodCallMatch) {
      const [, objectExpr, methodName, argsStr] = methodCallMatch;
      const args = this.parseArguments(argsStr);

      return {
        type: 'Call',
        func: {
          type: 'Attribute',
          value: this.parseSimpleExpression(objectExpr),
          attr: methodName,
          ctx: 'Load',
        },
        args: args,
      };
    }

    // Detect function calls
    const callMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (callMatch) {
      const [, funcName, argsStr] = callMatch;
      const args = this.parseArguments(argsStr);

      return {
        type: 'Call',
        func: { type: 'Name', id: funcName },
        args: args,
      };
    }

    // Detect arithmetic operators (detect longer operators first)
    const arithOps = ['//', '+', '-', '*', '/', '%'];
    for (const op of arithOps) {
      const index = trimmed.indexOf(op);
      if (index !== -1) {
        const left = trimmed.substring(0, index).trim();
        const right = trimmed.substring(index + op.length).trim();

        return {
          type: 'BinOp',
          left: this.parseSimpleExpression(left),
          op: this.getArithOpNode(op),
          right: this.parseSimpleExpression(right),
        };
      }
    }

    // Process as simple expression
    return this.parseSimpleExpression(trimmed);
  }

  /**
   * Parse simple expressions (variables, literals)
   */
  private parseSimpleExpression(expr: string): ASTNode {
    const trimmed = expr.trim();

    // Detect attribute access (e.g., path[0].x)
    const attrMatch = trimmed.match(/^(.+)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (attrMatch) {
      const [, valueExpr, attr] = attrMatch;
      return {
        type: 'Attribute',
        value: this.parseSimpleExpression(valueExpr),
        attr: attr,
        ctx: 'Load',
      };
    }

    // Detect array indexing (e.g., path[0])
    const subscriptMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/);
    if (subscriptMatch) {
      const [, arrayName, indexExpr] = subscriptMatch;
      return {
        type: 'Subscript',
        value: {
          type: 'Name',
          id: arrayName,
          ctx: 'Load',
        },
        slice: this.parseSimpleExpression(indexExpr),
        ctx: 'Load',
      };
    }

    // String literal
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return {
        type: 'Str',
        s: trimmed.slice(1, -1),
      };
    }

    // Check for unclosed string literals
    if (
      (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && !trimmed.endsWith("'"))
    ) {
      this.context.errors.push({
        message: `Unterminated string literal: ${trimmed}`,
        line: 0,
        column: 0,
        type: 'syntax_error',
        severity: 'error',
      });
      return {
        type: 'Str',
        s: trimmed,
      };
    }

    // Numeric literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return {
        type: 'Num',
        n: parseFloat(trimmed),
      };
    }

    // Boolean values
    if (trimmed === 'True' || trimmed === 'False') {
      return {
        type: 'NameConstant',
        value: trimmed === 'True',
      };
    }

    // Variable names
    return {
      type: 'Name',
      id: trimmed,
    };
  }

  /**
   * Get AST node for comparison operators
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
        return { type: 'Eq' };
    }
  }

  /**
   * Get AST node for arithmetic operators
   */
  private getArithOpNode(op: string): ASTNode {
    switch (op) {
      case '+':
        return { type: 'Add' };
      case '-':
        return { type: 'Sub' };
      case '*':
        return { type: 'Mult' };
      case '/':
        return { type: 'Div' };
      case '//':
        return { type: 'FloorDiv' };
      case '%':
        return { type: 'Mod' };
      default:
        return { type: 'Add' };
    }
  }

  private parsePrintStatement(line: string, lineNumber: number): ASTNode {
    // Parse "print(...)" format
    const match = line.match(/^print\((.*)\)\s*$/);
    const args = match ? match[1] : '';

    return {
      type: 'Expr',
      lineno: lineNumber,
      value: {
        type: 'Call',
        func: { type: 'Name', id: 'print' },
        args: [
          {
            type: 'Str',
            s: args,
            raw: args,
          },
        ],
      },
    };
  }

  /**
   * Convert AST nodes to IR
   */
  visitNode(node: ASTNode): IR {
    if (!node) {
      return createIR('statement', '', []);
    }

    // Set visitNode method to visitors
    this.statementVisitor.visitNode = this.visitNode.bind(this);
    this.definitionVisitor.visitNode = this.visitNode.bind(this);

    switch (node.type) {
      case 'Module':
        return this.visitModule(node);

      // Delegate statement processing
      case 'Assign':
        return this.statementVisitor.visitAssign(node);
      case 'AugAssign':
        return this.statementVisitor.visitAugAssign(node);
      case 'AnnAssign':
        return this.statementVisitor.visitAnnAssign(node);
      case 'If':
        return this.statementVisitor.visitIf(node);
      case 'For':
        return this.statementVisitor.visitFor(node);
      case 'While':
        return this.statementVisitor.visitWhile(node);
      case 'Return':
        return this.statementVisitor.visitReturn(node);
      case 'Call':
        return this.statementVisitor.visitCall(node);
      case 'Expr':
        return this.statementVisitor.visitExpr(node);
      case 'Comment':
        return this.statementVisitor.visitComment(node);
      case 'Pass':
        return this.statementVisitor.visitPass(node);
      case 'Break':
        return this.statementVisitor.visitBreak(node);
      case 'Continue':
        return this.statementVisitor.visitContinue(node);
      case 'Import':
      case 'ImportFrom':
        return this.statementVisitor.visitImport(node);
      case 'Try':
        return this.statementVisitor.visitTry(node);
      case 'Raise':
        return this.statementVisitor.visitRaise(node);
      case 'With':
        return this.statementVisitor.visitWith(node);
      case 'Assert':
        return this.statementVisitor.visitAssert(node);
      case 'Global':
      case 'Nonlocal':
        return this.statementVisitor.visitGlobal(node);
      case 'Delete':
        return this.statementVisitor.visitDelete(node);

      // Delegate definition processing
      case 'FunctionDef':
        return this.definitionVisitor.visitFunctionDef(node);
      case 'ClassDef':
        // Class definitions are already registered by preRegisterAllClasses
        return this.definitionVisitor.visitClassDef(node);

      default:
        // Output as comment for unsupported node types
        return this.createIRNode('comment', `// Unsupported node type: ${node.type}`);
    }
  }

  private visitModule(node: ASTNode): IR {
    const children: IR[] = [];

    // Check if node.body exists and is an array
    if (node.body && Array.isArray(node.body)) {
      for (const child of node.body) {
        const childIR = this.visitNode(child);
        children.push(childIR);
      }
    }

    return this.createIRNode('compound', '', children);
  }

  /**
   * Parse function definitions
   */
  private parseFunctionDef(line: string, lineNumber: number): ASTNode {
    // Parse "def function_name(params):" format
    const match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:\s*$/);

    if (!match) {
      // Process as basic function definition if no match
      return {
        type: 'FunctionDef',
        name: 'unknown_function',
        args: { args: [] },
        returns: null,
        body: [],
        lineno: lineNumber,
      };
    }

    const [, funcName, paramsStr, returnType] = match;

    // Parse parameters
    const params = this.parseParameters(paramsStr);

    return {
      type: 'FunctionDef',
      name: funcName,
      args: { args: params },
      returns: returnType ? { type: 'Name', id: returnType.trim() } : null,
      body: [],
      lineno: lineNumber,
    };
  }

  /**
   * Parse argument lists
   */
  private parseArguments(argsStr: string): any[] {
    if (!argsStr.trim()) {
      return [];
    }

    // Split arguments considering parentheses balance
    const args = this.splitArgumentsRespectingParentheses(argsStr);

    return args.map((arg) => {
      const trimmed = arg.trim();

      // For function calls (containing parentheses)
      if (trimmed.includes('(') && trimmed.includes(')')) {
        return this.parseExpression(trimmed);
      }

      // For string literals
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return {
          type: 'Str',
          s: trimmed.slice(1, -1),
        };
      }

      // For numbers
      if (/^\d+$/.test(trimmed)) {
        return {
          type: 'Num',
          n: parseInt(trimmed),
        };
      }

      // For variable names
      return {
        type: 'Name',
        id: trimmed,
      };
    });
  }

  /**
   * Split arguments considering parentheses balance
   */
  private splitArgumentsRespectingParentheses(argsStr: string): string[] {
    const args: string[] = [];
    let currentArg = '';
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '(') {
          parenDepth++;
        } else if (char === ')') {
          parenDepth--;
        } else if (char === ',' && parenDepth === 0) {
          args.push(currentArg.trim());
          currentArg = '';
          continue;
        }
      } else {
        if (char === stringChar && (i === 0 || argsStr[i - 1] !== '\\')) {
          inString = false;
          stringChar = '';
        }
      }

      currentArg += char;
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return args;
  }

  /**
   * Parse parameter lists
   */
  private parseParameters(paramsStr: string): any[] {
    if (!paramsStr.trim()) {
      return [];
    }

    return paramsStr.split(',').map((param) => {
      const trimmed = param.trim();

      // With type annotation: "param: type"
      const typeMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      if (typeMatch) {
        const [, paramName, paramType] = typeMatch;
        return {
          arg: paramName,
          annotation: { type: 'Name', id: paramType.trim() },
        };
      }

      // Without type annotation
      return {
        arg: trimmed,
        annotation: null,
      };
    });
  }

  /**
   * Parse return statements
   */
  private parseReturnStatement(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^return\s*(.*)$/);
    const value = match ? match[1].trim() : '';

    return {
      type: 'Return',
      value: value
        ? {
            type: 'Name',
            id: value,
            raw: value,
          }
        : null,
      lineno: lineNumber,
    };
  }

  /**
   * Parse class definitions
   */
  private parseClassDef(line: string, lineNumber: number): ASTNode {
    const match = line.match(/^class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/);
    if (!match) {
      this.addError(`Invalid class definition: ${line}`, 'syntax_error');
      return {
        type: 'Unknown',
        lineno: lineNumber,
      };
    }

    const [, className, baseClasses] = match;
    const bases = baseClasses
      ? baseClasses.split(',').map((base) => ({
          type: 'Name',
          id: base.trim(),
        }))
      : [];

    return {
      type: 'ClassDef',
      name: className,
      bases,
      body: [],
      lineno: lineNumber,
    };
  }

  /**
   * Register class definitions in context
   */
  private registerClassDefinition(node: ASTNode): void {
    const className = node.name;

    // Extract attributes from __init__ method
    const constructor = node.body.find(
      (item: ASTNode) => item.type === 'FunctionDef' && item.name === '__init__'
    );

    const attributes: string[] = [];
    if (constructor) {
      // Get attribute names from constructor parameters
      if (constructor.args && constructor.args.args) {
        constructor.args.args.forEach((arg: any) => {
          if (arg.arg !== 'self') {
            attributes.push(arg.arg);
          }
        });
      }
    }

    // Extract inheritance information
    const bases: string[] = [];
    if (node.bases && node.bases.length > 0) {
      node.bases.forEach((base: any) => {
        if (base.type === 'Name') {
          bases.push(base.id);
        }
      });
    }

    // Register in context
    if (!this.context.classDefinitions) {
      this.context.classDefinitions = {};
    }

    this.context.classDefinitions[className] = {
      attributes: attributes,
      bases: bases,
    };
  }

  /**
   * Pre-register all class definitions (first pass of 2-pass processing)
   */
  private preRegisterAllClasses(nodes: ASTNode[]): void {
    if (!nodes || !Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      if (node && node.type === 'ClassDef') {
        this.registerClassDefinition(node);
      }
    }
  }

  /**
   * Helper for creating IR nodes
   */
  protected override createIRNode(
    kind: IRKind,
    text: string,
    children: IR[] = [],
    meta?: IRMeta
  ): IR {
    return createIR(kind, text, children, meta);
  }

  /**
   * Create parse results
   */
  protected override createParseResult(ir: IR[]): import('../types/parser').ParseResult {
    const parseTime = Date.now() - this.context.startTime;
    return {
      ir,
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      stats: {
        parseTime,
        linesProcessed: 0,
        nodesGenerated: ir.reduce((sum, node) => sum + countIRNodes(node), 0),
        functionsFound: 0,
        classesFound: 0,
        variablesFound: 0,
      },
      success: this.getErrors().length === 0,
      parseTime,
    };
  }
}
