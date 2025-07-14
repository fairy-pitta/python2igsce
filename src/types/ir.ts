// Definition of basic IR structure
import { IGCSEDataType } from './igcse';

/**
 * Basic interface for Intermediate Representation (IR)
 * Represents nested code blocks with recursive structure
 */
export interface IR {
  /** Type of IR node */
  kind: IRKind;
  /** Output text */
  text: string;
  /** Child IR nodes (for nested structure) */
  children: IR[];
  /** Additional metadata */
  meta?: IRMeta;
}

/**
 * Types of IR nodes
 */
export type IRKind = 
  // Program structure
  | 'program'    // Entire program
  
  // Basic syntax
  | 'assign'     // Assignment statement
  | 'element_assign' // Array element assignment
  | 'attribute_assign' // Attribute assignment
  | 'output'     // Output statement
  | 'input'      // Input statement
  | 'comment'    // Comment
  
  // Control structures
  | 'if'         // IF statement
  | 'else'       // ELSE statement
  | 'elseif'     // ELSE IF statement
  | 'endif'      // ENDIF statement
  | 'for'        // FOR statement
  | 'while'      // WHILE statement
  | 'endwhile'   // ENDWHILE statement
  | 'repeat'     // REPEAT statement
  | 'until'      // UNTIL statement
  | 'break'      // BREAK statement (EXIT WHILE/FOR)
  
  // Functions and procedures
  | 'procedure'  // PROCEDURE definition
  | 'function'   // FUNCTION definition
  | 'return'     // RETURN statement
  
  // Data structures
  | 'array'      // Array declaration
  | 'array_literal' // Array literal
  | 'type'       // TYPE definition
  | 'class'      // CLASS definition
  
  // Others
  | 'block'      // Grouping of multiple IR nodes
  | 'case'       // CASE statement
  | 'statement'  // General statement
  | 'expression' // Expression
  | 'compound'   // Compound statement (grouping multiple statements)
  | 'module';    // Module

/**
 * Detailed argument information (distinguishes string literals from variables)
 */
export interface IRArgument {
  /** Argument value */
  value: string;
  /** Argument type */
  type: 'literal' | 'variable' | 'expression';
  /** Data type */
  dataType?: IGCSEDataType;
}

/**
 * Metadata for IR nodes
 */
export interface IRMeta {
  /** Name (variable name, function name, etc.) */
  name?: string;
  /** Parameter list */
  params?: string[];
  /** Whether has return value (for FUNCTION determination) */
  hasReturn?: boolean;
  /** Line number of original Python code */
  lineNumber?: number;
  /** Data type */
  dataType?: IGCSEDataType;
  /** Start value (for FOR statement) */
  startValue?: string;
  /** End value (for FOR statement) */
  endValue?: string;
  /** Step value (for FOR statement) */
  stepValue?: string;
  /** Condition expression */
  condition?: string;
  /** THEN side statements (for IF statement) */
  consequent?: IR[];
  /** ELSE side statements (for IF statement) */
  alternate?: IR[];
  /** Base class name (for class inheritance) */
  baseClass?: string;
  /** Return type */
  returnType?: IGCSEDataType;
  /** Array size */
  size?: number;
  /** Array index */
  index?: number | string;
  /** Whether it is a string literal */
  isStringLiteral?: boolean;
  /** Whether has inline comment */
  hasInlineComment?: boolean;
  /** Detailed argument information (distinguishes type and value) */
  arguments?: IRArgument[];
  /** Array element type */
  elementType?: string;
  /** Array elements */
  elements?: any[];
  /** Whether input function has prompt */
  hasPrompt?: boolean;
  /** Prompt string for input function */
  prompt?: string;
  /** End text (ENDPROCEDURE, ENDFUNCTION, etc.) */
  endText?: string;
  /** Variable name (loop variable for FOR statement, etc.) */
  variable?: string;
}

/**
 * Helper function for creating IR nodes
 */
export function createIR(
  kind: IRKind,
  text: string,
  children: IR[] = [],
  meta?: IRMeta
): IR {
  const ir: IR = {
    kind,
    text,
    children
  };
  if (meta !== undefined) ir.meta = meta;
  return ir;
}

/**
 * Calculate the depth of IR tree
 */
export function getIRDepth(ir: IR): number {
  if (ir.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...ir.children.map(child => getIRDepth(child)));
}

/**
 * Calculate the number of nodes in IR tree
 */
export function countIRNodes(ir: IR): number {
  return 1 + ir.children.reduce((sum, child) => sum + countIRNodes(child), 0);
}

/**
 * Search for IR nodes of specific type
 */
export function findIRNodes(ir: IR, kind: IRKind): IR[] {
  const result: IR[] = [];
  
  if (ir.kind === kind) {
    result.push(ir);
  }
  
  for (const child of ir.children) {
    result.push(...findIRNodes(child, kind));
  }
  
  return result;
}