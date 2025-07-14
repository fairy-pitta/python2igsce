// IGCSE Pseudocode specific type definitions

/**
 * Data types supported by IGCSE Pseudocode
 */
export type IGCSEDataType = 
  | 'INTEGER'   // Integer type
  | 'REAL'      // Real number type
  | 'STRING'    // String type
  | 'BOOLEAN'   // Boolean type
  | 'CHAR'      // Character type
  | 'ARRAY'     // Array type
  | 'RECORD'    // Record type
  | 'ANY';      // Any type (when type inference fails)

/**
 * IGCSE Pseudocode operators
 */
export type IGCSEOperator = 
  // Assignment operator
  | '←'         // Assignment
  
  // Comparison operators
  | '='         // Equal
  | '≠'         // Not equal
  | '<'         // Less than
  | '>'         // Greater than
  | '≤'         // Less than or equal
  | '≥'         // Greater than or equal
  
  // Logical operators
  | 'AND'       // Logical AND
  | 'OR'        // Logical OR
  | 'NOT'       // Logical NOT
  
  // Arithmetic operators
  | '+'         // Addition
  | '-'         // Subtraction
  | '*'         // Multiplication
  | '/'         // Division
  | 'MOD'       // Modulo
  | 'DIV';      // Integer division

/**
 * IGCSE Pseudocode keywords
 */
export type IGCSEKeyword = 
  // Conditional statements
  | 'IF'        // IF statement start
  | 'THEN'      // THEN
  | 'ELSE'      // ELSE statement
  | 'ENDIF'     // IF statement end
  
  // Loop statements
  | 'FOR'       // FOR statement start
  | 'TO'        // TO (for FOR statement)
  | 'STEP'      // STEP (for FOR statement)
  | 'NEXT'      // FOR statement end
  | 'WHILE'     // WHILE statement start
  | 'ENDWHILE'  // WHILE statement end
  | 'REPEAT'    // REPEAT statement start
  | 'UNTIL'     // REPEAT statement end
  
  // Functions and procedures
  | 'PROCEDURE' // Procedure start
  | 'ENDPROCEDURE' // Procedure end
  | 'FUNCTION'  // Function start
  | 'RETURNS'   // Return type specification
  | 'ENDFUNCTION' // Function end
  | 'RETURN'    // Return value
  
  // Input/Output
  | 'INPUT'     // Input
  | 'OUTPUT'    // Output
  
  // Selection statements
  | 'CASE'      // CASE statement start
  | 'OF'        // OF (for CASE statement)
  | 'OTHERWISE' // OTHERWISE (for CASE statement)
  | 'ENDCASE'   // CASE statement end
  
  // Data structures
  | 'TYPE'      // TYPE definition start
  | 'ENDTYPE'   // TYPE definition end
  | 'CLASS'     // CLASS definition start
  | 'ENDCLASS'  // CLASS definition end
  | 'DECLARE'   // Variable declaration
  
  // Others
  | 'CONSTANT'  // Constant
  | 'ARRAY'     // Array
  | 'RECORD';   // Record

/**
 * Mapping from Python operators to IGCSE operators
 */
export const PYTHON_TO_IGCSE_OPERATORS: Record<string, IGCSEOperator> = {
  '=': '←',
  '==': '=',
  '!=': '≠',
  '<': '<',
  '>': '>',
  '<=': '≤',
  '>=': '≥',
  'and': 'AND',
  'or': 'OR',
  'not': 'NOT',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': 'MOD',
  '//': 'DIV'
};

/**
 * Mapping from Python types to IGCSE types
 */
export const PYTHON_TO_IGCSE_TYPES: Record<string, IGCSEDataType> = {
  'int': 'INTEGER',
  'float': 'REAL',
  'str': 'STRING',
  'bool': 'BOOLEAN',
  'list': 'ARRAY',
  'dict': 'RECORD'
};

/**
 * Check IGCSE Pseudocode reserved words
 */
export function isIGCSEKeyword(word: string): boolean {
  const keywords: IGCSEKeyword[] = [
    'IF', 'THEN', 'ELSE', 'ENDIF',
    'FOR', 'TO', 'STEP', 'NEXT',
    'WHILE', 'ENDWHILE', 'REPEAT', 'UNTIL',
    'PROCEDURE', 'ENDPROCEDURE', 'FUNCTION', 'RETURNS', 'ENDFUNCTION', 'RETURN',
    'INPUT', 'OUTPUT',
    'CASE', 'OF', 'OTHERWISE', 'ENDCASE',
    'TYPE', 'ENDTYPE', 'CLASS', 'ENDCLASS', 'DECLARE',
    'CONSTANT', 'ARRAY', 'RECORD'
  ];
  return keywords.includes(word.toUpperCase() as IGCSEKeyword);
}

/**
 * Convert Python operator to IGCSE operator
 */
export function convertOperator(pythonOp: string): IGCSEOperator {
  return PYTHON_TO_IGCSE_OPERATORS[pythonOp] || pythonOp as IGCSEOperator;
}

/**
 * Convert Python type to IGCSE type
 */
export function convertDataType(pythonType: string): IGCSEDataType {
  return PYTHON_TO_IGCSE_TYPES[pythonType] || 'STRING';
}

/**
 * Helper function for type inference
 */
export function inferDataType(value: any): IGCSEDataType {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'REAL';
  }
  if (typeof value === 'string') {
    return value.length === 1 ? 'CHAR' : 'STRING';
  }
  if (typeof value === 'boolean') {
    return 'BOOLEAN';
  }
  if (Array.isArray(value)) {
    return 'ARRAY';
  }
  if (typeof value === 'object' && value !== null) {
    return 'RECORD';
  }
  return 'STRING'; // Default
}