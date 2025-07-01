// ネスト構造の包括的テスト
import { describe, it, expect } from 'vitest';
import { Converter } from '../src/converter';
import { IR, getIRDepth, countIRNodes } from '../src/types/ir';

const converter = new Converter();

describe('Nested Structures Comprehensive Tests', () => {
  // 深いネスト構造のテスト
  describe('Deep Nesting Tests', () => {
    it('should handle simple nested IF statements', async () => {
      const pythonCode = 'if a > 0:\n    if b > 0:\n        print("Both positive")';
      
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('IF a > 0 THEN');
      expect(result.code).toContain('IF b > 0 THEN');
    });

    it('should handle nested FOR loops', async () => {
      const pythonCode = 'for i in range(2):\n    for j in range(2):\n        print("nested")';
      
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('FOR i ← 0 TO 1');
      expect(result.code).toContain('FOR j ← 0 TO 1');
    });

    it('should handle FOR with nested IF', async () => {
      const pythonCode = 'for i in range(3):\n    if i > 0:\n        print(i)';
      
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('FOR i ← 0 TO 2');
      expect(result.code).toContain('IF i > 0 THEN');
    });

    it('should handle nested WHILE loops', async () => {
      const pythonCode = 'i = 0\nwhile i < 2:\n    j = 0\n    while j < 2:\n        print("nested")\n        j += 1\n    i += 1';
      
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('WHILE i < 2');
      expect(result.code).toContain('WHILE j < 2');
    });

    it('should handle deeply nested IF statements', async () => {
      const pythonCode = 'if a > 0:\n    if b > 0:\n        if c > 0:\n            print("all positive")';
      
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('IF a > 0 THEN');
      expect(result.code).toContain('IF b > 0 THEN');
      expect(result.code).toContain('IF c > 0 THEN');
    });

    it('should calculate correct IR depth for nested structures', async () => {
      const pythonCode = 'if x > 0:\n    for i in range(2):\n        print(i)';
      
      const result = await converter.convert(pythonCode);
      if (result.ir && result.ir.length > 0) {
        const depth = getIRDepth(result.ir[0]);
        expect(depth).toBeGreaterThan(1);
      }
    });

    it('should count IR nodes correctly in nested structures', async () => {
      const pythonCode = 'if a > 0:\n    print("positive")\nelse:\n    print("not positive")';
      
      const result = await converter.convert(pythonCode);
      if (result.ir && result.ir.length > 0) {
        const totalNodeCount = result.ir.reduce((sum, node) => sum + countIRNodes(node), 0);
        expect(totalNodeCount).toBeGreaterThan(3);
      }
    });
  });

});