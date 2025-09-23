import { IR, IRKind, createIR, IRMeta } from '../types/ir';
import { ExpressionVisitor } from './expression-visitor';
import { BaseParser } from './base-parser';
import { ParseResult } from '../types/parser';
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
 * Visitor class responsible for processing statements
 */
export class StatementVisitor extends BaseParser {
  /**
   * Execute parsing (not used in StatementVisitor)
   */
  parse(_source: string): ParseResult {
    throw new Error('StatementVisitor.parse() should not be called directly');
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
   * Process assignment statements
   */
  visitAssign(node: ASTNode): IR {
    // Detect array initialization first
    if (this.expressionVisitor.isArrayInitialization(node.value)) {
      return this.handleArrayInitialization(node);
    }

    // Handle input() function assignments specially (including nested function calls)
    if (this.containsInputCall(node.value)) {
      return this.handleInputAssignment(node);
    }

    // Detect class instantiation
    if (node.value.type === 'Call') {
      if (node.value.func.type === 'Name') {
        const funcName = node.value.func.id;
        const isClass = this.context.isClass(funcName);
        if (isClass) {
          return this.handleClassInstantiation(node);
        }
      }
    }

    const targetNode = node.targets[0];

    // Handle array element assignment (data[1] = 100)
    if (targetNode.type === 'Subscript') {
      return this.handleElementAssign(targetNode, node.value);
    }

    // Handle attribute assignment (obj.field = value)
    if (targetNode.type === 'Attribute') {
      return this.handleAttributeAssign(targetNode, node.value);
    }

    // For class instantiation, process directly without going through expression-visitor
    if (node.value.type === 'Call') {
      const func = this.expressionVisitor.visitExpression(node.value.func);
      const args = node.value.args.map((arg: ASTNode) =>
        this.expressionVisitor.visitExpression(arg)
      );

      // Process as class instantiation if not a built-in function
      const builtinResult = this.expressionVisitor.convertBuiltinFunction(func, args);

      if (!builtinResult && this.isClassInstantiation(node.value)) {
        console.log('DEBUG: Processing as class instantiation');
        return this.handleClassInstantiation(node);
      }
    }

    const target = this.expressionVisitor.visitExpression(targetNode);
    const value = this.expressionVisitor.visitExpression(node.value);

    let text = `${target} ← ${value}`;

    // Add inline comment if present
    if (node.inlineComment) {
      text += ` // ${node.inlineComment}`;
    }

    // Infer and register variable type
    const dataType = this.expressionVisitor.inferTypeFromValue(node.value);
    if (targetNode.type === 'Name') {
      this.registerVariable(targetNode.id, dataType, node.lineno);
    }

    return this.createIRNode('assign', text);
  }

  /**
   * Process input() function assignments
   */
  private handleInputAssignment(node: ASTNode): IR {
    const targetNode = node.targets[0];
    const target = this.expressionVisitor.visitExpression(targetNode);

    // Find input() function (considering nested function calls)
    const inputCall = this.findInputCall(node.value);
    if (!inputCall) {
      // Process as normal assignment if input() not found
      const value = this.expressionVisitor.visitExpression(node.value);
      const text = `${target} ← ${value}`;
      return this.createIRNode('assign', text);
    }

    const args = inputCall.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));

    // Create two IR nodes (OUTPUT and INPUT) when prompt is present
    if (args.length > 0) {
      const outputText = `OUTPUT ${args[0]}`;
      const inputText = `INPUT ${target}`;

      // Create compound IR node (containing OUTPUT and INPUT statements)
      const outputIR = this.createIRNode('output', outputText);
      const inputIR = this.createIRNode('input', inputText);

      // Infer and register variable type
      if (targetNode.type === 'Name') {
        // Register as INTEGER type for int(input(...))
        if (
          node.value.type === 'Call' &&
          node.value.func.type === 'Name' &&
          node.value.func.id === 'int'
        ) {
          this.registerVariable(targetNode.id, 'INTEGER', node.lineno);
        } else {
          this.registerVariable(targetNode.id, 'STRING', node.lineno);
        }
      }

      // Return as compound node
      return this.createIRNode('compound', '', [outputIR, inputIR]);
    } else {
      // Only INPUT statement when no prompt
      const inputText = `INPUT ${target}`;

      // Infer and register variable type
      if (targetNode.type === 'Name') {
        // Register as INTEGER type for int(input(...))
        if (
          node.value.type === 'Call' &&
          node.value.func.type === 'Name' &&
          node.value.func.id === 'int'
        ) {
          this.registerVariable(targetNode.id, 'INTEGER', node.lineno);
        } else {
          this.registerVariable(targetNode.id, 'STRING', node.lineno);
        }
      }

      return this.createIRNode('input', inputText);
    }
  }

  /**
   * Find input() from nested function calls
   */
  private findInputCall(node: ASTNode): ASTNode | null {
    if (node.type === 'Call' && node.func.type === 'Name' && node.func.id === 'input') {
      return node;
    }

    // Recursively search nested function calls
    if (node.type === 'Call' && node.args) {
      for (const arg of node.args) {
        const result = this.findInputCall(arg);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Check if node contains input() call
   */
  private containsInputCall(node: ASTNode): boolean {
    return this.findInputCall(node) !== null;
  }

  /**
   * Process augmented assignment statements
   */
  visitAugAssign(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);
    const value = this.expressionVisitor.visitExpression(node.value);
    const op = this.convertOperator(node.op);

    const text = `${target} ← ${target} ${op} ${value}`;
    return this.createIRNode('assign', text);
  }

  /**
   * Process annotated assignment statements (items: list[str] = [])
   */
  visitAnnAssign(node: ASTNode): IR {
    const targetName = node.target.id;

    // Detect array type from type annotation
    if (this.isListTypeAnnotation(node.annotation)) {
      const elementType = this.extractListElementType(node.annotation);

      // Generate array declaration with default size for empty list
      if (node.value && node.value.type === 'List' && node.value.elts.length === 0) {
        const text = `DECLARE ${targetName} : ARRAY[1:100] OF ${elementType}`;
        this.registerVariable(targetName, 'ARRAY' as IGCSEDataType, node.lineno);
        return this.createIRNode('array', text);
      }

      // Process as normal array initialization when value is present
      if (node.value) {
        const fakeAssignNode: ASTNode = {
          type: 'Assign',
          targets: [node.target],
          value: node.value,
          lineno: node.lineno || 0,
        };
        return this.handleArrayInitialization(fakeAssignNode);
      }
    }

    // Normal annotated assignment
    const target = this.expressionVisitor.visitExpression(node.target);
    const value = node.value ? this.expressionVisitor.visitExpression(node.value) : '';

    if (value) {
      const text = `${target} ← ${value}`;
      return this.createIRNode('assign', text);
    } else {
      // Declaration only when no value
      const dataType = this.convertAnnotationToIGCSEType(node.annotation);
      const text = `DECLARE ${target} : ${dataType}`;
      this.registerVariable(targetName, dataType as IGCSEDataType, node.lineno);
      return this.createIRNode('statement', text);
    }
  }

  /**
   * Process IF statements
   */
  visitIf(node: ASTNode): IR {
    const condition = this.expressionVisitor.visitExpression(node.test);
    const ifText = `IF ${condition} THEN`;

    this.enterScope('if', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) =>
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();

    let children = bodyChildren;

    // Process ELSE clause
    if (node.orelse && node.orelse.length > 0) {
      const firstElse = node.orelse[0];

      // Process as ELSE IF when first element is IF statement
      if (firstElse.type === 'If') {
        const condition = this.expressionVisitor.visitExpression(firstElse.test);
        const elseIfText = `ELSE IF ${condition} THEN`;
        const elseIfIR = this.createIRNode('elseif', elseIfText);

        this.enterScope('elseif', 'block');
        this.increaseIndent();
        const elseIfBodyChildren = firstElse.body.map((child: ASTNode) =>
          this.visitNode
            ? this.visitNode(child)
            : this.createIRNode('comment', '// Unprocessed node')
        );
        this.decreaseIndent();
        this.exitScope();

        children = [...bodyChildren, elseIfIR, ...elseIfBodyChildren];

        // Recursively process orelse clause of ELSE IF statement
        if (firstElse.orelse && firstElse.orelse.length > 0) {
          const nestedElseResult = this.visitIf({
            ...firstElse,
            body: [], // bodyは空にして、orelseのみ処理
            test: null, // testも不要
          } as ASTNode);

          // Add child elements of nested ELSE/ELSE IF statements
          if (nestedElseResult.children) {
            children = [...children, ...nestedElseResult.children];
          }
        }
      } else {
        // Normal ELSE clause
        const elseIR = this.createIRNode('else', 'ELSE');
        this.enterScope('else', 'block');
        this.increaseIndent();
        const elseChildren = node.orelse.map((child: ASTNode) =>
          this.visitNode
            ? this.visitNode(child)
            : this.createIRNode('comment', '// Unprocessed node')
        );
        this.decreaseIndent();
        this.exitScope();

        children = [...bodyChildren, elseIR, ...elseChildren];
      }
    }

    return this.createIRNode('if', ifText, children);
  }

  /**
   * Process FOR statements
   */
  visitFor(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.target);

    // Process for statement using range() function
    if (node.iter.type === 'Call' && node.iter.func.id === 'range') {
      return this.handleRangeFor(node, target);
    }

    // Direct iteration over arrays or lists
    if (node.iter.type === 'Name') {
      const arrayName = node.iter.id;
      const indexVar = 'i';

      // Get array size (from context)
      let arraySize = '3'; // Default size

      // Get array size from context
      if (this.context && this.context.arrayInfo && this.context.arrayInfo[arrayName]) {
        arraySize = this.context.arrayInfo[arrayName].size.toString();
      }

      // Format: FOR i ← 1 TO size
      const forText = `FOR ${indexVar} ← 1 TO ${arraySize}`;

      this.enterScope('for', 'block');
      this.increaseIndent();

      // Process body (directly reference array elements without using target variable)
      const bodyChildren = node.body.map((child: ASTNode) => {
        // Convert print(target) to OUTPUT array[i]
        // Convert print(target) to OUTPUT array[i]
        if (
          child.type === 'Expr' &&
          child.value.type === 'Call' &&
          child.value.func &&
          child.value.func.type === 'Name' &&
          child.value.func.id === 'print' &&
          child.value.args.length === 1 &&
          ((child.value.args[0].type === 'Name' && child.value.args[0].id === target) ||
            (child.value.args[0].type === 'Str' && child.value.args[0].s === target))
        ) {
          return this.createIRNode('output', `OUTPUT ${arrayName}[${indexVar}]`);
        }
        return this.visitNode
          ? this.visitNode(child)
          : this.createIRNode('comment', '// Unprocessed node');
      });

      this.decreaseIndent();
      this.exitScope();

      const nextIR = this.createIRNode('statement', `NEXT ${indexVar}`);
      bodyChildren.push(nextIR);

      return this.createIRNode('for', forText, bodyChildren);
    }

    // Normal for statement (other iterable objects)
    const iterable = this.expressionVisitor.visitExpression(node.iter);
    const forText = `FOR ${target} IN ${iterable}`;

    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) =>
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();

    const nextIR = this.createIRNode('statement', `NEXT ${target}`);
    bodyChildren.push(nextIR);

    return this.createIRNode('for', forText, bodyChildren);
  }

  /**
   * Process WHILE statements
   */
  visitWhile(node: ASTNode): IR {
    // Check if this is a REPEAT-UNTIL pattern:
    // while True:
    //     ...
    //     if condition:
    //         break
    if (this.isRepeatUntilPattern(node)) {
      return this.createRepeatUntilIR(node);
    }

    // Regular while loop
    const condition = this.expressionVisitor.visitExpression(node.test);
    const whileText = `WHILE ${condition} DO`;

    this.enterScope('while', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) =>
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();

    const endwhileIR = this.createIRNode('endwhile', 'ENDWHILE');
    bodyChildren.push(endwhileIR);

    return this.createIRNode('while', whileText, bodyChildren);
  }

  /**
   * Check if a while loop matches the REPEAT-UNTIL pattern
   * Pattern: while True with a conditional break at the end
   */
  private isRepeatUntilPattern(node: ASTNode): boolean {
    // Check if condition is 'True'
    // The AST structure might vary, so we check both raw value and type
    if (
      node.test.type === 'Compare' &&
      node.test.raw !== 'True' &&
      node.test.type === 'NameConstant' &&
      node.test.value !== true
    ) {
      return false;
    }

    // Check if the last statement is an if with break
    const lastStatement = node.body[node.body.length - 1];
    if (!lastStatement || lastStatement.type !== 'If') {
      return false;
    }

    // Check if the if body contains a break statement
    const ifBody = lastStatement.body;
    if (!ifBody || ifBody.length === 0) {
      return false;
    }

    // Check if the if body contains ONLY a break statement
    // This is important for the REPEAT-UNTIL pattern
    if (ifBody.length !== 1 || ifBody[0].type !== 'Break') {
      return false;
    }

    return true;
  }

  /**
   * Create a REPEAT-UNTIL IR from a while True loop with conditional break
   */
  private createRepeatUntilIR(node: ASTNode): IR {
    const repeatText = 'REPEAT';

    this.enterScope('repeat', 'block');
    this.increaseIndent();

    // Process all statements except the last one (which is the if-break)
    const bodyStatements = node.body.slice(0, -1);

    // Special handling for input function in the body
    const bodyChildren: IR[] = [];

    for (const child of bodyStatements) {
      // Check if this is an assignment with input() function
      if (
        child.type === 'Assign' &&
        child.value &&
        child.value.type === 'Call' &&
        child.value.func &&
        child.value.func.id === 'input'
      ) {
        // Get the target variable name
        const target = this.expressionVisitor.visitExpression(child.targets[0]);

        // Get the input prompt if any
        const args = child.value.args || [];
        if (args.length > 0) {
          // Create OUTPUT statement for the prompt
          const prompt = this.expressionVisitor.visitExpression(args[0]);
          const outputIR = this.createIRNode('output', `OUTPUT ${prompt}`);
          bodyChildren.push(outputIR);
        }

        // Create INPUT statement
        const inputIR = this.createIRNode('input', `INPUT ${target}`);
        bodyChildren.push(inputIR);
      } else {
        // Normal statement processing
        const ir = this.visitNode
          ? this.visitNode(child)
          : this.createIRNode('comment', '// Unprocessed node');
        bodyChildren.push(ir);
      }
    }

    // Get the condition from the if statement
    const lastStatement = node.body[node.body.length - 1];

    // The condition in the if statement is what we need for the UNTIL
    // In Python: if condition: break
    // In IGCSE: UNTIL condition
    const condition = this.expressionVisitor.visitExpression(lastStatement.test);

    this.decreaseIndent();
    this.exitScope();

    // Create UNTIL statement
    const untilIR = this.createIRNode('until', `UNTIL ${condition}`);
    bodyChildren.push(untilIR);

    return this.createIRNode('repeat', repeatText, bodyChildren);
  }

  /**
   * Process function call statements
   */
  visitCall(node: ASTNode): IR {
    const func = this.expressionVisitor.visitExpression(node.func);
    const args = node.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));

    // Convert built-in functions
    if (func === 'print') {
      // Special handling for f-string with single argument
      if (args.length === 1 && node.args[0].type === 'JoinedStr') {
        const fstringResult = this.expressionVisitor.visitExpression(node.args[0]);
        const text = `OUTPUT ${fstringResult}`;
        return this.createIRNode('output', text);
      }
      const text = `OUTPUT ${args.join(', ')}`;
      return this.createIRNode('output', text);
    }

    if (func === 'input') {
      const prompt = args.length > 0 ? args[0] : '';
      const text = prompt ? `INPUT ${prompt}` : 'INPUT';
      return this.createIRNode('input', text);
    }

    // Normal function call (add CALL keyword)
    const capitalizedFunc = this.capitalizeFirstLetter(func);
    const text = `CALL ${capitalizedFunc}(${args.join(', ')})`;
    return this.createIRNode('statement', text);
  }

  /**
   * Process RETURN statements
   */
  visitReturn(node: ASTNode): IR {
    if (node.value) {
      const value = this.expressionVisitor.visitExpression(node.value);
      return this.createIRNode('return', `RETURN ${value}`);
    }
    return this.createIRNode('return', 'RETURN');
  }

  /**
   * Process expression statements
   */
  visitExpr(node: ASTNode): IR {
    // Handle function calls specially
    if (node.value && node.value.type === 'Call') {
      return this.visitCall(node.value);
    }

    const expr = this.expressionVisitor.visitExpression(node.value);
    return this.createIRNode('statement', expr);
  }

  /**
   * Process comments
   */
  visitComment(node: ASTNode): IR {
    return this.createIRNode('comment', `// ${node.value}`);
  }

  /**
   * Process PASS statements
   */
  visitPass(_node: ASTNode): IR {
    return this.createIRNode('comment', '// pass');
  }

  /**
   * Process BREAK statements
   */
  visitBreak(_node: ASTNode): IR {
    return this.createIRNode('break', 'BREAK');
  }

  /**
   * Process CONTINUE statements
   */
  visitContinue(_node: ASTNode): IR {
    return this.createIRNode('statement', 'CONTINUE');
  }

  /**
   * Process IMPORT statements
   */
  visitImport(_node: ASTNode): IR {
    // Output as comment since import is not typically used in IGCSE
    return this.createIRNode('comment', `// import statement`);
  }

  /**
   * Process TRY statements
   */
  visitTry(_node: ASTNode): IR {
    // Output as comment since exception handling is not typically used in IGCSE
    return this.createIRNode('comment', `// try-except statement`);
  }

  /**
   * Process RAISE statements
   */
  visitRaise(_node: ASTNode): IR {
    return this.createIRNode('comment', `// raise statement`);
  }

  /**
   * Process WITH statements
   */
  visitWith(_node: ASTNode): IR {
    return this.createIRNode('comment', `// with statement`);
  }

  /**
   * Process ASSERT statements
   */
  visitAssert(_node: ASTNode): IR {
    return this.createIRNode('comment', `// assert statement`);
  }

  /**
   * Process GLOBAL statements
   */
  visitGlobal(_node: ASTNode): IR {
    return this.createIRNode('comment', `// global statement`);
  }

  /**
   * Process DELETE statements
   */
  visitDelete(_node: ASTNode): IR {
    return this.createIRNode('comment', `// delete statement`);
  }

  // Helper methods
  private handleRangeFor(node: ASTNode, target: string): IR {
    const args = node.iter.args;
    let startValue = '0';
    let endValue = '0';
    let stepValue = '1';

    if (args.length === 1) {
      // range(n)
      endValue = this.expressionVisitor.visitExpression(args[0]);
    } else if (args.length === 2) {
      // range(start, end)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
    } else if (args.length === 3) {
      // range(start, end, step)
      startValue = this.expressionVisitor.visitExpression(args[0]);
      endValue = this.expressionVisitor.visitExpression(args[1]);
      stepValue = this.expressionVisitor.visitExpression(args[2]);
    }

    // Optimize for numeric constants
    // Subtract 1 from end value only when step is 1
    if (stepValue === '1') {
      // Special handling for LENGTH() function and other function calls
      if (endValue.startsWith('LENGTH(') || endValue.includes('(')) {
        endValue = `${endValue} - 1`;
      } else if (this.expressionVisitor.isNumericConstant(args[args.length - 1])) {
        const endNum = this.expressionVisitor.getNumericValue(args[args.length - 1]);
        endValue = (endNum - 1).toString();
      } else {
        endValue = `${endValue} - 1`;
      }
    } else {
      // Calculate the last reachable value when step is not 1
      if (
        args.length === 3 &&
        this.expressionVisitor.isNumericConstant(args[0]) &&
        this.expressionVisitor.isNumericConstant(args[1]) &&
        this.expressionVisitor.isNumericConstant(args[2])
      ) {
        const start = this.expressionVisitor.getNumericValue(args[0]);
        const end = this.expressionVisitor.getNumericValue(args[1]);
        const step = this.expressionVisitor.getNumericValue(args[2]);

        // Calculate the last reachable value
        let lastValue = start;
        if (step > 0) {
          while (lastValue + step < end) {
            lastValue += step;
          }
        } else {
          while (lastValue + step > end) {
            lastValue += step;
          }
        }
        endValue = lastValue.toString();
      }
    }

    const forText =
      stepValue === '1'
        ? `FOR ${target} ← ${startValue} TO ${endValue}`
        : `FOR ${target} ← ${startValue} TO ${endValue} STEP ${stepValue}`;

    this.enterScope('for', 'block');
    this.increaseIndent();
    const bodyChildren = node.body.map((child: ASTNode) =>
      this.visitNode ? this.visitNode(child) : this.createIRNode('comment', '// Unprocessed node')
    );
    this.decreaseIndent();
    this.exitScope();

    const nextIR = this.createIRNode('statement', `NEXT ${target}`);
    bodyChildren.push(nextIR);

    return this.createIRNode('for', forText, bodyChildren);
  }

  private handleArrayInitialization(node: ASTNode): IR {
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const elements = node.value.elts;
    const size = elements.length;

    // Reconstruct string-split elements to detect object calls
    const reconstructedElements = this.reconstructObjectCalls(elements);

    // Determine if it's an array of objects
    const isObjectArray =
      reconstructedElements.length > 0 && this.isObjectCall(reconstructedElements[0]);

    if (isObjectArray) {
      // For object arrays
      const firstCall = reconstructedElements[0];
      const className = this.extractClassName(firstCall);
      const recordTypeName = `${className}Record`;

      const children: IR[] = [];

      // Array declaration (using actual element count)
      const actualSize = reconstructedElements.length;
      const declText = `DECLARE ${target} : ARRAY[1:${actualSize}] OF ${recordTypeName}`;
      children.push(this.createIRNode('statement', declText));

      // Record array size information in context
      if (this.context && this.context.arrayInfo) {
        this.context.arrayInfo[target] = {
          size: actualSize,
          elementType: recordTypeName,
          currentIndex: 0,
        };
      }

      // Process each element
      reconstructedElements.forEach((elementStr: string, index: number) => {
        const args = this.extractArguments(elementStr);
        // Need to get actual field names from class definition, but
        // Currently simplified to handle Point class as x, y
        if (className === 'Point' && args.length >= 2) {
          children.push(this.createIRNode('assign', `${target}[${index + 1}].x ← ${args[0]}`));
          children.push(this.createIRNode('assign', `${target}[${index + 1}].y ← ${args[1]}`));
        } else {
          // Generic handling for other classes
          args.forEach((arg: string, argIndex: number) => {
            const fieldName = `field${argIndex + 1}`; // Temporary field name
            children.push(
              this.createIRNode('assign', `${target}[${index + 1}].${fieldName} ← ${arg}`)
            );
          });
        }
      });

      return this.createIRNode('statement', '', children);
    } else {
      // For normal arrays
      const elementType =
        elements.length > 0 ? this.expressionVisitor.inferTypeFromValue(elements[0]) : 'STRING';

      // Array declaration
      const declText = `DECLARE ${target} : ARRAY[1:${size}] OF ${elementType}`;
      const declIR = this.createIRNode('array', declText);

      // Record array size information in context
      if (this.context && this.context.arrayInfo) {
        this.context.arrayInfo[target] = {
          size: size,
          elementType: elementType,
          currentIndex: 0,
        };
      }

      // Element assignment
      const assignments: IR[] = [];
      elements.forEach((element: ASTNode, index: number) => {
        const value = this.expressionVisitor.visitExpression(element);
        const assignText = `${target}[${index + 1}] ← ${value}`;
        assignments.push(this.createIRNode('assign', assignText));
      });

      return this.createIRNode('statement', '', [declIR, ...assignments]);
    }
  }

  private reconstructObjectCalls(elements: ASTNode[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < elements.length) {
      const element = elements[i];
      if (element.type === 'Name' && element.id) {
        const elementStr = element.id;

        // Detect class name pattern (starts with uppercase, ends with parentheses)
        if (/^[A-Z]\w*\(/.test(elementStr)) {
          // Combine with next element to reconstruct object call
          let objectCall = elementStr;
          i++;

          // Join elements until closing parenthesis is found
          while (i < elements.length && !objectCall.includes(')')) {
            const nextElement = elements[i];
            if (nextElement.type === 'Name' && nextElement.id) {
              objectCall += ', ' + nextElement.id;
            }
            i++;
          }

          result.push(objectCall);
        } else {
          result.push(elementStr);
          i++;
        }
      } else {
        result.push(this.expressionVisitor.visitExpression(element));
        i++;
      }
    }

    return result;
  }

  private isObjectCall(elementStr: string): boolean {
    // Detect ClassName(arguments) pattern
    return /^[A-Z]\w*\(.+\)$/.test(elementStr);
  }

  private extractClassName(objectCall: string): string {
    const match = objectCall.match(/^([A-Z]\w*)\(/);
    return match ? match[1] : 'Unknown';
  }

  private extractArguments(objectCall: string): string[] {
    const match = objectCall.match(/\((.+)\)$/);
    if (match) {
      return match[1].split(',').map((arg) => arg.trim());
    }
    return [];
  }

  private isClassInstantiation(node: ASTNode): boolean {
    // Simple judgment: treat as class if function name starts with uppercase
    if (node.func.type === 'Name') {
      const isClass = /^[A-Z]/.test(node.func.id);
      console.log(`DEBUG: Checking if ${node.func.id} is class: ${isClass}`);
      return isClass;
    }
    console.log('DEBUG: Function type is not Name:', node.func.type);
    return false;
  }

  private handleClassInstantiation(node: ASTNode): IR {
    const className = this.expressionVisitor.visitExpression(node.value.func);
    const target = this.expressionVisitor.visitExpression(node.targets[0]);
    const args = node.value.args.map((arg: ASTNode) => this.expressionVisitor.visitExpression(arg));

    // When treating as record type, generate variable declaration and field assignments
    const recordTypeName = `${className}Record`;
    const children: IR[] = [];

    // Variable declaration
    const declareText = `DECLARE ${target} : ${recordTypeName}`;
    console.log('DEBUG: Adding declaration:', declareText);
    children.push(this.createIRNode('statement', declareText));

    // Get attribute names from class definition
    const classAttributes = this.getClassAttributes(className);
    console.log('DEBUG: classAttributes:', classAttributes);

    // Field assignment (based on argument order)
    for (let i = 0; i < Math.min(args.length, classAttributes.length); i++) {
      const attrName = classAttributes[i];
      const assignText = `${target}.${attrName} ← ${args[i]}`;
      console.log('DEBUG: Adding assignment:', assignText);
      children.push(this.createIRNode('assign', assignText));
    }

    console.log('DEBUG: Returning block with', children.length, 'children');
    return this.createIRNode('block', '', children);
  }

  private convertOperator(op: ASTNode): string {
    switch (op.type) {
      case 'Add':
        return '+';
      case 'Sub':
        return '-';
      case 'Mult':
        return '*';
      case 'Div':
        return '/';
      case 'FloorDiv':
        return 'DIV';
      case 'Mod':
        return 'MOD';
      case 'Pow':
        return '^';
      default:
        return '+';
    }
  }

  /**
   * Process array element assignment (data[1] = 100)
   */
  private handleElementAssign(targetNode: ASTNode, valueNode: ASTNode): IR {
    const arrayName = this.expressionVisitor.visitExpression(targetNode.value);
    const value = this.expressionVisitor.visitExpression(valueNode);

    // Process index directly to avoid comments
    let adjustedIndex: string;
    let sliceNode = targetNode.slice;

    // Get contents if wrapped in Index node
    if (sliceNode.type === 'Index') {
      sliceNode = sliceNode.value;
    }

    if (sliceNode.type === 'Constant' && typeof sliceNode.value === 'number') {
      // For numeric literals, add 1
      adjustedIndex = String(sliceNode.value + 1);
    } else if (sliceNode.type === 'Num') {
      // Old Python AST numeric node
      adjustedIndex = String(sliceNode.n + 1);
    } else if (sliceNode.type === 'Name') {
      // For variables, add +1
      adjustedIndex = `${sliceNode.id} + 1`;
    } else {
      // For other cases, process as expression
      const index = this.expressionVisitor.visitExpression(targetNode.slice);
      adjustedIndex = this.convertIndexToOneBased(index);
    }

    const text = `${arrayName}[${adjustedIndex}] ← ${value}`;
    return this.createIRNode('element_assign', text);
  }

  /**
   * Process attribute assignment (obj.field = value)
   */
  private handleAttributeAssign(targetNode: ASTNode, valueNode: ASTNode): IR {
    const objectName = this.expressionVisitor.visitExpression(targetNode.value);
    const attributeName = targetNode.attr;
    const value = this.expressionVisitor.visitExpression(valueNode);

    const text = `${objectName}.${attributeName} ← ${value}`;
    return this.createIRNode('attribute_assign', text);
  }

  /**
   * Convert index from 0-based to 1-based
   */
  private convertIndexToOneBased(index: string): string {
    // For numeric literals, add 1
    if (/^\d+$/.test(index)) {
      return String(parseInt(index) + 1);
    }
    // For variables, add +1
    return `${index} + 1`;
  }

  /**
   * Determine if type annotation is list type
   */
  private isListTypeAnnotation(annotation: ASTNode): boolean {
    if (!annotation) return false;

    // list[type] format
    if (
      annotation.type === 'Subscript' &&
      annotation.value.type === 'Name' &&
      annotation.value.id === 'list'
    ) {
      return true;
    }

    // List[type] format (typing.List)
    if (
      annotation.type === 'Subscript' &&
      annotation.value.type === 'Name' &&
      annotation.value.id === 'List'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extract element type from list type annotation
   */
  private extractListElementType(annotation: ASTNode): string {
    if (annotation.type === 'Subscript' && annotation.slice) {
      const elementType = annotation.slice;
      if (elementType.type === 'Name') {
        return this.convertPythonTypeToIGCSE(elementType.id);
      }
    }
    return 'STRING'; // Default
  }

  /**
   * Convert type annotation to IGCSE type
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
   * Convert Python type name to IGCSE type
   */
  private convertPythonTypeToIGCSE(typeName: string): string {
    switch (typeName) {
      case 'int':
        return 'INTEGER';
      case 'str':
        return 'STRING';
      case 'bool':
        return 'BOOLEAN';
      case 'float':
        return 'REAL';
      default:
        return 'STRING';
    }
  }

  /**
   * Get attribute names from class definition
   */
  private getClassAttributes(className: string): string[] {
    // Search for class definition from context
    if (this.context && this.context.classDefinitions) {
      const classDef = this.context.classDefinitions[className];
      if (classDef && classDef.attributes) {
        return classDef.attributes.map((attr: string) => attr.split(' : ')[0]);
      }
    }

    // Default attribute names (for Student class)
    if (className === 'Student') {
      return ['name', 'age'];
    }

    // Default for other classes
    return ['x', 'y'];
  }

  /**
   * Capitalize first letter of string
   */
  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  protected override createIRNode(
    kind: IRKind,
    text: string,
    children: IR[] = [],
    meta?: IRMeta
  ): IR {
    return createIR(kind, text, children, meta);
  }

  // visitNodeはプロパティとして定義済み
}
