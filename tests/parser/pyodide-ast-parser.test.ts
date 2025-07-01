/**
 * Pyodide ASTパーサーのテスト
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPyodideParser, parsePythonWithPyodide, PyodideASTParser } from '../../src/parser/pyodide-ast-parser';
import { ASTNode } from '../../src/types/ast';

describe('PyodideASTParser', () => {
  let parser: PyodideASTParser;

  beforeAll(async () => {
    // Pyodideの初期化には時間がかかるため、タイムアウトを延長
    parser = await getPyodideParser();
  }, 30000);

  afterAll(async () => {
    if (parser) {
      await parser.cleanup();
    }
  });

  describe('基本的な構文解析', () => {
    it('単純な代入文を解析できる', async () => {
      const code = 'x = 10';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Assign');
    });

    it('複数の文を解析できる', async () => {
      const code = `
x = 10
y = 20
z = x + y
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toHaveLength(3);
    });

    it('if文を解析できる', async () => {
      const code = `
if x > 10:
    print("Greater")
else:
    print("Lesser")
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('If');
    });

    it('for文を解析できる', async () => {
      const code = `
for i in range(10):
    print(i)
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('For');
    });

    it('while文を解析できる', async () => {
      const code = `
while x < 10:
    x += 1
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('While');
    });
  });

  describe('関数とクラス', () => {
    it('関数定義を解析できる', async () => {
      const code = `
def add(a, b):
    return a + b
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('FunctionDef');
    });

    it('クラス定義を解析できる', async () => {
      const code = `
class Person:
    def __init__(self, name):
        self.name = name
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('ClassDef');
    });

    it('メソッド呼び出しを解析できる', async () => {
      const code = `
obj.method(arg1, arg2)
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Expr');
    });
  });

  describe('式の解析', () => {
    it('算術式を解析できる', async () => {
      const code = 'result = (a + b) * c - d / e';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Assign');
    });

    it('比較式を解析できる', async () => {
      const code = 'result = x > y and a <= b or c != d';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Assign');
    });

    it('リスト内包表記を解析できる', async () => {
      const code = 'squares = [x**2 for x in range(10) if x % 2 == 0]';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Assign');
    });
  });

  describe('エラーハンドリング', () => {
    it('構文エラーを適切に処理する', async () => {
      const code = `
if x > 10
    print("Missing colon")
      `;
      
      await expect(parsePythonWithPyodide(code)).rejects.toThrow();
    });

    it('インデントエラーを適切に処理する', async () => {
      const code = `
if x > 10:
print("Wrong indentation")
      `;
      
      await expect(parsePythonWithPyodide(code)).rejects.toThrow();
    });

    it('空のコードを処理できる', async () => {
      const code = '';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toHaveLength(0);
    });

    it('コメントのみのコードを処理できる', async () => {
      const code = `
# This is a comment
# Another comment
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toHaveLength(0);
    });
  });

  describe('複雑なコード構造', () => {
    it('ネストした制御構造を解析できる', async () => {
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
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('For');
    });

    it('例外処理を解析できる', async () => {
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
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('Try');
    });

    it('デコレータを解析できる', async () => {
      const code = `
@property
@staticmethod
def decorated_function():
    pass
      `;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('FunctionDef');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなファイルを適切な時間で解析できる', async () => {
      const largeCode = `
# 大きなPythonファイルのシミュレーション
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
      expect(parseTime).toBeLessThan(5000); // 5秒以内
      expect(ast.body.length).toBeGreaterThan(100);
    }, 10000);
  });

  describe('AST変換の正確性', () => {
    it('Python ASTからTypeScript ASTへの変換が正確', async () => {
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
      expect(ast.body).toHaveLength(1);
      
      const funcDef = ast.body[0];
      expect(funcDef.type).toBe('FunctionDef');
      expect(funcDef.name).toBe('test_function');
      expect(funcDef.args).toBeDefined();
      expect(funcDef.body).toBeDefined();
      expect(Array.isArray(funcDef.body)).toBe(true);
    });

    it('位置情報が正しく保持される', async () => {
      const code = `x = 10\ny = 20`;
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.body).toHaveLength(2);
      
      // 最初の文の位置情報
      const firstStmt = ast.body[0];
      expect(firstStmt.lineno).toBe(1);
      expect(firstStmt.col_offset).toBeDefined();
      
      // 2番目の文の位置情報
      const secondStmt = ast.body[1];
      expect(secondStmt.lineno).toBe(2);
      expect(secondStmt.col_offset).toBeDefined();
    });
  });
});

describe('Pyodideパーサーのユーティリティ関数', () => {
  describe('getPyodideParser', () => {
    it('シングルトンパターンで動作する', async () => {
      const parser1 = await getPyodideParser();
      const parser2 = await getPyodideParser();
      
      expect(parser1).toBe(parser2);
    }, 10000);
  });

  describe('parsePythonWithPyodide', () => {
    it('直接呼び出しで正常に動作する', async () => {
      const code = 'print("Hello, World!")';
      const ast = await parsePythonWithPyodide(code);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.body).toHaveLength(1);
    });
  });
});