// Python → IGCSE Pseudocode 統合テスト
import { describe, it, expect, beforeEach } from 'vitest';
import { Converter } from '../src/converter';

describe('Python to IGCSE Pseudocode Integration Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // 基本的なプログラムの変換テスト
  describe('Basic Programs', () => {
    it('should convert simple calculator program', () => {
      const pythonCode = `num1 = 5
num2 = 3
result = num1 + num2
print(result)`;

      const result = converter.convert(pythonCode);
      
      const expected = `num1 ← 5
num2 ← 3
result ← num1 + num2
OUTPUT result`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple assignment', () => {
      const pythonCode = `x = 10
y = 20
z = x + y`;

      const result = converter.convert(pythonCode);
      
      const expected = `x ← 10
y ← 20
z ← x + y`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple if statement', () => {
      const pythonCode = `x = 5
if x > 0:
    print("positive")`;

      const result = converter.convert(pythonCode);
      
      const expected = `x ← 5
IF x > 0 THEN
  OUTPUT "positive"
ENDIF`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple arithmetic', () => {
      const pythonCode = `a = 10
b = 5
c = a * b`;

      const result = converter.convert(pythonCode);
      
      const expected = `a ← 10
b ← 5
c ← a * b`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple function', () => {
      const pythonCode = `def add(a, b):
    return a + b

result = add(3, 4)`;

      const result = converter.convert(pythonCode);
      
      const expected = `FUNCTION add(a : INTEGER, b : INTEGER) RETURNS INTEGER
  RETURN a + b
ENDFUNCTION

result ← add(3, 4)`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple loop', () => {
      const pythonCode = `for i in range(5):
    print(i)`;

      const result = converter.convert(pythonCode);
      
      const expected = `FOR i ← 0 TO 4
  OUTPUT i
NEXT i`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple while loop', () => {
      const pythonCode = `i = 0
while i < 5:
    print(i)
    i = i + 1`;

      const result = converter.convert(pythonCode);
      
      const expected = `i ← 0
WHILE i < 5 DO
  OUTPUT i
  i ← i + 1
ENDWHILE`;
      expect(result.code).toBe(expected);
    });

    it('should convert simple list', () => {
      const pythonCode = `numbers = [1, 2, 3]
first = numbers[0]`;

      const result = converter.convert(pythonCode);
      
      const expected = `DECLARE numbers : ARRAY[1:3] OF INTEGER
numbers[1] ← 1
numbers[2] ← 2
numbers[3] ← 3
first ← numbers[1]`;
      expect(result.code).toBe(expected);
    });

    it('should convert string operations', () => {
      const pythonCode = `name = "Alice"
greeting = "Hello " + name`;

      const result = converter.convert(pythonCode);
      
      const expected = `name ← "Alice"
greeting ← "Hello " + name`;
      expect(result.code).toBe(expected);
    });
  });


});