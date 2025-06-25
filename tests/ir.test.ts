// IGCSE Pseudocode IR型のテスト
import { describe, it, expect } from 'vitest';
import { IR, createIR } from '../src/types/ir';
import { PythonASTVisitor } from '../src/parser/visitor';

describe('IGCSE Pseudocode IR Types', () => {
  // 基本的なIR構造のテスト
  describe('Basic IR Structure', () => {
    it('should create IR node with required properties', () => {
      const assignIR = createIR('assign', 'x ← 5');
      
      expect(assignIR).toHaveProperty('kind');
      expect(assignIR).toHaveProperty('text');
      expect(assignIR).toHaveProperty('children');
      expect(assignIR.kind).toBe('assign');
      expect(assignIR.text).toBe('x ← 5');
      expect(assignIR.children).toBeInstanceOf(Array);
      expect(assignIR.children).toHaveLength(0);
    });

    it('should support nested IR structures', () => {
      const ifIR = createIR('if', 'IF score ≥ 50 THEN');
    const outputPass = createIR('output', 'OUTPUT "Pass"');
    const elseIR = createIR('else', 'ELSE');
    const outputFail = createIR('output', 'OUTPUT "Fail"');
      
      elseIR.children.push(outputFail);
      ifIR.children.push(outputPass, elseIR);
      
      expect(ifIR.children).toHaveLength(2);
      expect(ifIR.children[0].kind).toBe('output');
      expect(ifIR.children[1].kind).toBe('else');
      expect(ifIR.children[1].children).toHaveLength(1);
      expect(ifIR.children[1].children[0].kind).toBe('output');
    });

    it('should handle IR node metadata', () => {
      const forIR = createIR('for', 'FOR i ← 1 TO 10');
      forIR.meta = { endText: 'NEXT i', variable: 'i' };
      
      expect(forIR.meta).toBeDefined();
      expect(forIR.meta?.endText).toBe('NEXT i');
      expect(forIR.meta?.variable).toBe('i');
    });
  });

  // IGCSE Pseudocode特有の構文テスト
  describe('IGCSE Pseudocode Syntax', () => {
    it('should handle assignment with ← operator', () => {
      const assignIR = createIR('assign', 'counter ← 0');
      
      expect(assignIR.text).toContain('←');
      expect(assignIR.text).toMatch(/\w+ ← .+/);
      expect(assignIR.kind).toBe('assign');
    });

    it('should handle FOR loop with TO keyword', () => {
      const forIR = createIR('for', 'FOR i ← 1 TO 10');
    const outputIR = createIR('output', 'OUTPUT i');
      forIR.children.push(outputIR);
      forIR.meta = { name: 'i', startValue: '1', endValue: '10' };
      
      expect(forIR.text).toContain('FOR');
      expect(forIR.text).toContain('TO');
      expect(forIR.text).toContain('←');
      expect(forIR.meta?.name).toBe('i');
      expect(forIR.children).toHaveLength(1);
    });

    it('should handle WHILE loop structure', () => {
      const whileIR = createIR('while', 'WHILE x < 10');
    const assignIR = createIR('assign', 'x ← x + 1');
      whileIR.children.push(assignIR);
      whileIR.meta = { endText: 'ENDWHILE' };
      
      expect(whileIR.text).toContain('WHILE');
      expect(whileIR.meta?.endText).toBe('ENDWHILE');
      expect(whileIR.children).toHaveLength(1);
      expect(whileIR.children[0].kind).toBe('assign');
    });

    it('should handle PROCEDURE definition', () => {
      const procedureIR = createIR('procedure', 'PROCEDURE Greet(name : STRING)');
    const outputIR = createIR('output', 'OUTPUT "Hello, ", name');
      procedureIR.children.push(outputIR);
      procedureIR.meta = {
        name: 'Greet',
        params: ['name : STRING'],
        hasReturn: false,
        endText: 'ENDPROCEDURE'
      };
      
      expect(procedureIR.text).toContain('PROCEDURE');
      expect(procedureIR.meta?.hasReturn).toBe(false);
      expect(procedureIR.meta?.endText).toBe('ENDPROCEDURE');
      expect(procedureIR.meta?.name).toBe('Greet');
    });

    it('should handle FUNCTION definition', () => {
      const functionIR = createIR('function', 'FUNCTION Add(x : INTEGER, y : INTEGER) RETURNS INTEGER');
    const returnIR = createIR('return', 'RETURN x + y');
      functionIR.children.push(returnIR);
      functionIR.meta = {
        name: 'Add',
        params: ['x : INTEGER', 'y : INTEGER'],
        hasReturn: true,
        returnType: 'INTEGER'
      };
      
      expect(functionIR.text).toContain('FUNCTION');
      expect(functionIR.text).toContain('RETURNS');
      expect(functionIR.meta?.hasReturn).toBe(true);
      expect(functionIR.meta?.returnType).toBe('INTEGER');
      expect(functionIR.meta?.name).toBe('Add');
    });

    it('should handle ARRAY declaration', () => {
      const arrayIR = createIR('array', 'DECLARE numbers : ARRAY[1:5] OF INTEGER');
      
      expect(arrayIR.text).toContain('DECLARE');
      expect(arrayIR.text).toContain('ARRAY');
      expect(arrayIR.text).toMatch(/ARRAY\[\d+:\d+\] OF \w+/);
      expect(arrayIR.kind).toBe('array');
    });

    it('should handle TYPE definition', () => {
      const typeIR = createIR('type', 'TYPE StudentRecord');
    const nameDecl = createIR('statement', 'name : STRING');
    const ageDecl = createIR('statement', 'age : INTEGER');
      
      typeIR.children.push(nameDecl, ageDecl);
      typeIR.meta = {
        name: 'StudentRecord'
      };
      
      expect(typeIR.text).toContain('TYPE');
      expect(typeIR.meta?.name).toBe('StudentRecord');
      expect(typeIR.children).toHaveLength(2);
    });

    it('should handle CASE structure', () => {
      const caseIR = createIR('case', 'CASE OF direction');
    const option1 = createIR('statement', '"N" : y ← y + 1');
    const option2 = createIR('statement', '"S" : y ← y - 1');
    const otherwise = createIR('statement', 'OTHERWISE : OUTPUT "Invalid"');
      
      caseIR.children.push(option1, option2, otherwise);
      caseIR.meta = { endText: 'ENDCASE' };
      
      expect(caseIR.text).toContain('CASE OF');
      expect(caseIR.meta?.endText).toBe('ENDCASE');
      expect(caseIR.children).toHaveLength(3);
      expect(caseIR.children[2].kind).toBe('statement');
    });
  });

  // PythonASTVisitorとの統合テスト
  describe('Visitor Integration', () => {
    it('should create IR nodes through visitor', () => {
      const visitor = new PythonASTVisitor();
      const assignIR = createIR('assign', 'x ← 5');
      
      expect(assignIR.kind).toBe('assign');
      expect(assignIR.text).toBe('x ← 5');
      expect(assignIR.children).toBeInstanceOf(Array);
    });

    it('should handle complex IR structures', () => {
      const visitor = new PythonASTVisitor();
      const programIR = createIR('program', '');
    const ifIR = createIR('if', 'IF x > 0 THEN');
    const outputIR = createIR('output', 'OUTPUT "Positive"');
      
      ifIR.children.push(outputIR);
      programIR.children.push(ifIR);
      
      expect(programIR.children).toHaveLength(1);
      expect(programIR.children[0].children).toHaveLength(1);
      expect(programIR.children[0].children[0].text).toBe('OUTPUT "Positive"');
    });
  });
});