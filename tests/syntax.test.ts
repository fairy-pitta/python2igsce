import { Converter } from '../src/converter';

describe('Syntax Tests - Basic Constructs', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // 代入文 (Assignment)
  describe('Assignment Statements', () => {
    it('should convert simple integer assignment', async () => {
      const pythonCode = 'x = 10';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('x ← 10');
    });

    it('should convert simple string assignment', async () => {
      const pythonCode = 'name = "Alice"';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('name ← "Alice"');
    });

    it('should convert assignment with expression', async () => {
      const pythonCode = 'result = a + b';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('result ← a + b');
    });
  });

  // 出力文 (Output)
  describe('Output Statements', () => {
    it('should convert print with a variable', async () => {
      const pythonCode = 'print(message)';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('OUTPUT message');
    });

    it('should convert print with a string literal', async () => {
      const pythonCode = 'print("Hello, world!")';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('OUTPUT "Hello, world!"');
    });

    it('should convert print with multiple arguments', async () => {
      const pythonCode = 'print("Value:", x)';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('OUTPUT "Value:", x');
    });
  });

  // 入力文 (Input)
  describe('Input Statements', () => {
    it('should convert simple input to a variable', async () => {
      const pythonCode = 'value = input()';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('INPUT value');
    });

    it('should convert input with a prompt', async () => {
      const pythonCode = 'name = input("Enter your name: ")';
      const result = await converter.convert(pythonCode);
      // Pythonのinput()はプロンプトを標準出力に出してから入力を待つので、OUTPUTとINPUTが同じ行に出力される
      const expected = 'OUTPUT "Enter your name: " INPUT name';
      expect(result.code).toBe(expected);
    });
  });

  // コメント (Comments)
  describe('Comments', () => {
    it('should convert single-line comments', async () => {
      const pythonCode = '# This is a comment\nx = 1';
      const result = await converter.convert(pythonCode);
      const expected = '// This is a comment\nx ← 1';
      expect(result.code).toBe(expected);
    });

    it('should place comments correctly relative to code', async () => {
      const pythonCode = 'y = 2 # Inline comment';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('y ← 2 // Inline comment');
    });
  });

  // 演算子 (Operators) - 代表的なもの
  describe('Operators', () => {
    it('should handle arithmetic operators', async () => {
      const pythonCode = 'calc = (a + b) * c / d - e';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('calc ← (a + b) * c / d - e');
    });

    it('should handle MOD operator', async () => {
      const pythonCode = 'remainder = x % y';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('remainder ← x MOD y');
    });

    it('should handle DIV operator (integer division)', async () => {
      const pythonCode = 'quotient = x // y';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('quotient ← x DIV y');
    });

    it('should handle comparison operators', async () => {
      const pythonCode = 'is_equal = (a == b)\nis_not_equal = (a != b)\nis_greater = (a > b)\nis_less = (a < b)\nis_greater_equal = (a >= b)\nis_less_equal = (a <= b)';
      const result = await converter.convert(pythonCode);
      const expected = 'is_equal ← (a = b)\nis_not_equal ← (a ≠ b)\nis_greater ← (a > b)\nis_less ← (a < b)\nis_greater_equal ← (a ≥ b)\nis_less_equal ← (a ≤ b)';
      expect(result.code).toBe(expected);
    });

    it('should handle logical operators AND, OR, NOT', async () => {
      const pythonCode = 'res_and = (p and q)\nres_or = (p or q)\nres_not = (not p)';
      const result = await converter.convert(pythonCode);
      const expected = 'res_and ← (p AND q)\nres_or ← (p OR q)\nres_not ← (NOT p)';
      expect(result.code).toBe(expected);
    });

    it('should handle string concatenation', async () => {
      const pythonCode = 'full_name = first_name + " " + last_name';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('full_name ← first_name & " " & last_name'); // Pseudocode uses &
    });
  });
});