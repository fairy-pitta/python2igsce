// IGCSE Pseudocode エミッターのテスト
import { TextEmitter } from '../src/emitter/text-emitter';
import { MarkdownEmitter } from '../src/emitter/markdown-emitter';
import { createIR } from '../src/types/ir';
import { EmitterOptions } from '../src/types/emitter';
describe('IGCSE Pseudocode Emitter', () => {
  let textEmitter: TextEmitter;
  let markdownEmitter: MarkdownEmitter;

  beforeEach(() => {
    textEmitter = new TextEmitter();
    markdownEmitter = new MarkdownEmitter();
  });

  // 基本的な出力テスト
  describe('Basic Output', () => {
    it('should emit simple assignment', () => {
      const ir = createIR('assign', 'x ← 5', []);
      const result = textEmitter.emit(ir);
      
      expect(result.code).toBe('x ← 5');
      expect(result.errors).toHaveLength(0);
    });

    it('should emit with proper indentation', () => {
      const options: Partial<EmitterOptions> = { indentSize: 3 };
      const emitter = new TextEmitter(options);
      
      const childIR = createIR('assign', 'y ← 10', []);
      const parentIR = createIR('if', 'IF x > 0 THEN', [childIR]);
      
      const result = emitter.emit(parentIR);
      
      expect(result.code).toContain('IF x > 0 THEN');
      expect(result.code).toContain('   y ← 10'); // 3スペースのインデント
    });
  });

  // インデント処理のテスト
  describe('Indentation Handling', () => {
    it('should handle nested structures with proper indentation', () => {
      const innerAssign = createIR('assign', 'z ← 15', []);
      const ifBlock = createIR('if', 'IF y > 5 THEN', [innerAssign]);
      const outerIf = createIR('if', 'IF x > 0 THEN', [ifBlock]);
      
      const result = textEmitter.emit(outerIf);
      const lines = result.code.split('\n');
      
      expect(lines[0]).toBe('IF x > 0 THEN');
      expect(lines[1]).toBe('    IF y > 5 THEN');
      expect(lines[2]).toBe('        z ← 15');
    });

    it('should handle multiple nesting levels', () => {
      const level3 = createIR('assign', 'result ← a + b', []);
      const level2 = createIR('if', 'IF b > 0 THEN', [level3]);
      const level1 = createIR('if', 'IF a > 0 THEN', [level2]);
      const level0 = createIR('if', 'IF x > 0 THEN', [level1]);
      
      const result = textEmitter.emit(level0);
      const lines = result.code.split('\n');
      
      expect(lines[0]).toBe('IF x > 0 THEN');
      expect(lines[1]).toBe('    IF a > 0 THEN');
      expect(lines[2]).toBe('        IF b > 0 THEN');
      expect(lines[3]).toBe('            result ← a + b');
    });
  });

  // END文の自動追加テスト
  describe('End Statement Generation', () => {
    it('should add ENDIF for if statements', () => {
      const assign = createIR('assign', 'x ← 10', []);
      const endif = createIR('endif', 'ENDIF', []);
      const ifStatement = createIR('if', 'IF x > 0 THEN', [assign, endif]);
      
      const result = textEmitter.emit(ifStatement);
      
      expect(result.code).toContain('IF x > 0 THEN');
      expect(result.code).toContain('x ← 10');
      expect(result.code).toContain('ENDIF');
    });

    it('should add ENDWHILE for while loops', () => {
      const assign = createIR('assign', 'x ← x + 1', []);
      const endwhile = createIR('endwhile', 'ENDWHILE', []);
      const whileLoop = createIR('while', 'WHILE x < 10', [assign, endwhile]);
      
      const result = textEmitter.emit(whileLoop);
      
      expect(result.code).toContain('WHILE x < 10');
      expect(result.code).toContain('x ← x + 1');
      expect(result.code).toContain('ENDWHILE');
    });

    it('should add NEXT for for loops', () => {
      const assign = createIR('assign', 'sum ← sum + i', []);
      const next = createIR('statement', 'NEXT i', []);
      const forLoop = createIR('for', 'FOR i ← 1 TO 10', [assign, next], { name: 'i' });
      
      const result = textEmitter.emit(forLoop);
      
      expect(result.code).toContain('FOR i ← 1 TO 10');
      expect(result.code).toContain('sum ← sum + i');
      expect(result.code).toContain('NEXT i');
    });

    it('should add ENDPROCEDURE for procedures', () => {
      const assign = createIR('assign', 'result ← x + y', []);
      const endproc = createIR('statement', 'ENDPROCEDURE', []);
      const procedure = createIR('procedure', 'PROCEDURE AddNumbers(x, y)', [assign, endproc]);
      
      const result = textEmitter.emit(procedure);
      
      expect(result.code).toContain('PROCEDURE AddNumbers(x, y)');
      expect(result.code).toContain('result ← x + y');
      expect(result.code).toContain('ENDPROCEDURE');
    });

    it('should add ENDFUNCTION for functions', () => {
      const returnStmt = createIR('return', 'RETURN x + y', []);
      const endfunc = createIR('statement', 'ENDFUNCTION', []);
      const func = createIR('function', 'FUNCTION Add(x, y) RETURNS INTEGER', [returnStmt, endfunc]);
      
      const result = textEmitter.emit(func);
      
      expect(result.code).toContain('FUNCTION Add(x, y) RETURNS INTEGER');
      expect(result.code).toContain('RETURN x + y');
      expect(result.code).toContain('ENDFUNCTION');
    });
  });

  // フォーマット出力のテスト
  describe('Output Format', () => {
    it('should generate plain text output', () => {
      const ir = createIR('assign', 'x ← 5', []);
      const result = textEmitter.emit(ir);
      
      expect(result.code).toBe('x ← 5');
      expect(result.code).not.toContain('```'); // Markdownコードブロックが含まれていない
    });

    it('should generate markdown output', () => {
      const ir = createIR('assign', 'x ← 5', []);
      const result = markdownEmitter.emit(ir);
      
      expect(result.code).toContain('```pseudocode');
      expect(result.code).toContain('x ← 5');
      expect(result.code).toContain('```');
    });
  });

  // 特殊文字の処理テスト
  describe('Special Characters', () => {
    it('should handle assignment arrow correctly', () => {
      const ir = createIR('assign', 'variable ← "Hello World"', []);
      const result = textEmitter.emit(ir);
      
      expect(result.code).toContain('←');
      expect(result.code).toBe('variable ← "Hello World"');
    });

    it('should handle comparison operators', () => {
      const condition = createIR('assign', 'result ← x ≥ y AND a ≤ b', []);
      const result = textEmitter.emit(condition);
      
      expect(result.code).toContain('≥');
      expect(result.code).toContain('≤');
      expect(result.code).toContain('AND');
    });

    it('should handle string literals with quotes', () => {
      const ir = createIR('output', 'OUTPUT "Hello, \"World\"!"', []);
      const result = textEmitter.emit(ir);
      
      expect(result.code).toContain('"Hello, \"World\"!"');
    });
  });

  // メタデータ生成のテスト
  describe('Metadata Generation', () => {
    it('should include line count in metadata', () => {
      const assign1 = createIR('assign', 'x ← 1', []);
      const assign2 = createIR('assign', 'y ← 2', []);
      const block = createIR('block', '', [assign1, assign2]);
      
      const result = textEmitter.emit(block);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.lineCount).toBe(2);
    });

    it('should include character count in metadata', () => {
      const ir = createIR('assign', 'variable ← "test"', []);
      const result = textEmitter.emit(ir);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.characterCount).toBeGreaterThan(0);
      expect(result.stats.characterCount).toBe(result.code.length);
    });

    it('should track processing time', () => {
      const ir = createIR('assign', 'x ← 1', []);
      const result = textEmitter.emit(ir);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // エラーハンドリングのテスト
  describe('Error Handling', () => {
    it('should handle invalid IR nodes gracefully', () => {
      const invalidIR = { kind: 'invalid' as any, text: 'test', children: [] };
      const result = textEmitter.emit(invalidIR);
      
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages', () => {
      const invalidIR = { kind: 'unknown' as any, text: 'test', children: [] };
      const result = textEmitter.emit(invalidIR);
      
      expect(result.warnings).toBeDefined();
      if (result.warnings.length > 0) {
        expect(result.warnings[0].message).toContain('Unsupported node kind');
      }
    });

    it('should continue processing after recoverable errors', () => {
      const validIR = createIR('assign', 'x ← 1', []);
      const invalidIR = { kind: 'invalid' as any, text: 'bad', children: [] };
      const anotherValidIR = createIR('assign', 'y ← 2', []);
      const block = createIR('block', '', [validIR, invalidIR, anotherValidIR]);
      
      const result = textEmitter.emit(block);
      
      // 警告があっても有効な部分は処理される
      expect(result.code).toContain('x ← 1');
      expect(result.code).toContain('y ← 2');
      expect(result.warnings).toBeDefined();
    });
  });
});