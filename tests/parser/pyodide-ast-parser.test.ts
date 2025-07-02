/**
 * Tests for the Pyodide AST parser.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPyodideParser, parsePythonWithPyodide, PyodideASTParser, ASTNode } from '../../src/parser/pyodide-ast-parser';

describe('PyodideASTParser', () => {
  let parser: PyodideASTParser;

  beforeAll(async () => {
    // Initialization of Pyodide can be slow, so extend the timeout.
    parser = await getPyodideParser();
  }, 30000);

  afterAll(async () => {
    if (parser) {
      await parser.cleanup();
    }
  });

  describe('Basic Syntax Parsing', () => {
    it('should parse a simple assignment statement', async () => {
      const code = 'x = 10';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Assign');
    });

    it('should parse multiple statements', async () => {
      const code = `
x = 10
y = 20
z = x + y
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(3);
    });

    it('should parse an if statement', async () => {
      const code = `
if x > 10:
    print("Greater")
else:
    print("Lesser")
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('If');
    });

    it('should parse a for statement', async () => {
      const code = `
for i in range(10):
    print(i)
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('For');
    });

    it('should parse a while statement', async () => {
      const code = `
while x < 10:
    x += 1
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('While');
    });
  });

  describe('Functions and Classes', () => {
    it('should parse a function definition', async () => {
      const code = `
def add(a, b):
    return a + b
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('FunctionDef');
    });

    it('should parse a class definition', async () => {
      const code = `
class Person:
    def __init__(self, name):
        self.name = name
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('ClassDef');
    });

    it('should parse a method call', async () => {
      const code = `
obj.method(arg1, arg2)
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Expr');
    });
  });

  describe('Expression Parsing', () => {
    it('should parse an arithmetic expression', async () => {
      const code = 'result = (a + b) * c - d / e';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Assign');
    });

    it('should parse a comparison expression', async () => {
      const code = 'result = x > y and a <= b or c != d';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Assign');
    });

    it('should parse a list comprehension', async () => {
      const code = 'squares = [x**2 for x in range(10) if x % 2 == 0]';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Assign');
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors properly', async () => {
      const code = `
if x > 10
    print("Missing colon")
      `;
      
      await expect(parsePythonWithPyodide(code)).rejects.toThrow();
    });

    it('should handle indentation errors properly', async () => {
      const code = `
if x > 10:
print("Wrong indentation")
      `;
      
      await expect(parsePythonWithPyodide(code)).rejects.toThrow();
    });

    it('should handle empty code', async () => {
      const code = '';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(0);
    });

    it('should handle code with only comments', async () => {
      const code = `
# This is a comment
# Another comment
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(0);
    });
  });

  describe('Complex Code Structures', () => {
    it('should parse nested control structures', async () => {
      const code = `
for i in range(10):
    if i % 2 == 0:
        for j in range(i):
            if j > 2:
                print(f"{i}, {j}")
            else:
                continue
    else:
        while i > 0:
            i -= 1
            break
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('For');
    });

    it('should parse exception handling', async () => {
      const code = `
try:
    result = risky_operation()
except ValueError as e:
    print(f"ValueError: {e}")
except Exception:
    print("Unknown error")
finally:
    cleanup()
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('Try');
    });

    it('should parse decorators', async () => {
      const code = `
@property
@staticmethod
def decorated_function():
    pass
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      expect(ast.body![0].type).toBe('FunctionDef');
    });
  });

  describe('Performance Tests', () => {
    it('should parse a large file in a reasonable amount of time', async () => {
      const largeCode = `
# Simulate a large Python file
${Array.from({ length: 100 }, (_, i) => `
def function_${i}(param):
    result = param * ${i}
    if result > 50:
        return result
    else:
        return 0
`).join('\n')}

class LargeClass:
${Array.from({ length: 50 }, (_, i) => `    def method_${i}(self):
        return ${i}
`).join('\n')}
      `;
      
      const startTime = Date.now();
      const ast = await parsePythonWithPyodide(largeCode);
      const endTime = Date.now();
      const parseTime = endTime - startTime;
      
      expect(ast).toBeDefined();
      expect(parseTime).toBeLessThan(5000); // Less than 5 seconds
      expect(ast.body).toBeDefined();
      expect(ast.body!.length).toBeGreaterThan(100);
    }, 10000);
  });

  describe('AST Conversion Accuracy', () => {
    it('should accurately convert from Python AST to TypeScript AST', async () => {
      const code = `
def test_function(a, b=10):
    """Test function with default parameter"""
    if a > b:
        return a + b
    elif a == b:
        return a * b
    else:
        return a - b
      `;
      
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
      
      const funcDef = ast.body![0];
      expect(funcDef.type).toBe('FunctionDef');
      expect(funcDef.name).toBe('test_function');
      expect(funcDef.args).toBeDefined();
      expect(funcDef.body).toBeDefined();
      expect(Array.isArray(funcDef.body)).toBe(true);
    });

    it('should correctly maintain position information', async () => {
      const code = `x = 10\ny = 20`;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(2);
      
      // Position information of the first statement
      const firstStmt = ast.body![0];
      expect(firstStmt.lineno).toBe(1);
      expect(firstStmt.col_offset).toBeDefined();
      
      // Position information of the second statement
      const secondStmt = ast.body![1];
      expect(secondStmt.lineno).toBe(2);
      expect(secondStmt.col_offset).toBeDefined();
    });
  });
});

describe('Pyodide Parser Utility Functions', () => {
  describe('getPyodideParser', () => {
    it('should work as a singleton pattern', async () => {
      const parser1 = await getPyodideParser();
      const parser2 = await getPyodideParser();
      
      expect(parser1).toBe(parser2);
    }, 10000);
  });

  describe('parsePythonWithPyodide', () => {
    it('should work correctly when called directly', async () => {
      const code = 'print("Hello, World!")';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toBeDefined();
      expect(ast.body!).toHaveLength(1);
    });
  });
});