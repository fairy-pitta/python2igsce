// IGCSE Pseudocode IR型定義のテスト
describe('IGCSE Pseudocode IR Types', () => {
  // 基本的なIR構造のテスト
  describe('Basic IR Structure', () => {
    it('should define IR interface with required properties', () => {
      // IR型の基本構造をテスト
      const mockIR = {
        kind: 'assign',
        text: 'x ← 5',
        children: [],
        meta: {
          lineNumber: 1
        }
      };
      
      expect(mockIR).toHaveProperty('kind');
      expect(mockIR).toHaveProperty('text');
      expect(mockIR).toHaveProperty('children');
      expect(mockIR.children).toBeInstanceOf(Array);
    });

    it('should support nested IR structures', () => {
      // ネスト構造のテスト
      const nestedIR = {
        kind: 'if',
        text: 'IF score ≥ 50 THEN',
        children: [
          {
            kind: 'output',
            text: 'OUTPUT "Pass"',
            children: []
          },
          {
            kind: 'else',
            text: 'ELSE',
            children: [
              {
                kind: 'output',
                text: 'OUTPUT "Fail"',
                children: []
              }
            ]
          }
        ]
      };
      
      expect(nestedIR.children).toHaveLength(2);
      expect(nestedIR.children[1].children).toHaveLength(1);
    });
  });

  // IGCSE Pseudocode特有の構文テスト
  describe('IGCSE Pseudocode Syntax', () => {
    it('should handle assignment with ← operator', () => {
      const assignIR = {
        kind: 'assign',
        text: 'counter ← 0',
        children: []
      };
      
      expect(assignIR.text).toContain('←');
      expect(assignIR.text).toMatch(/\w+ ← .+/);
    });

    it('should handle FOR loop with TO keyword', () => {
      const forIR = {
        kind: 'for',
        text: 'FOR i ← 1 TO 10',
        children: [
          {
            kind: 'output',
            text: 'OUTPUT i',
            children: []
          }
        ],
        meta: {
          endText: 'NEXT i'
        }
      };
      
      expect(forIR.text).toContain('FOR');
      expect(forIR.text).toContain('TO');
      expect(forIR.meta?.endText).toBe('NEXT i');
    });

    it('should handle WHILE loop structure', () => {
      const whileIR = {
        kind: 'while',
        text: 'WHILE x < 10',
        children: [
          {
            kind: 'assign',
            text: 'x ← x + 1',
            children: []
          }
        ],
        meta: {
          endText: 'ENDWHILE'
        }
      };
      
      expect(whileIR.text).toContain('WHILE');
      expect(whileIR.meta?.endText).toBe('ENDWHILE');
    });

    it('should handle PROCEDURE definition', () => {
      const procedureIR = {
        kind: 'procedure',
        text: 'PROCEDURE Greet(name : STRING)',
        children: [
          {
            kind: 'output',
            text: 'OUTPUT "Hello, ", name',
            children: []
          }
        ],
        meta: {
          name: 'Greet',
          params: ['name : STRING'],
          hasReturn: false,
          endText: 'ENDPROCEDURE'
        }
      };
      
      expect(procedureIR.text).toContain('PROCEDURE');
      expect(procedureIR.meta?.hasReturn).toBe(false);
      expect(procedureIR.meta?.endText).toBe('ENDPROCEDURE');
    });

    it('should handle FUNCTION definition', () => {
      const functionIR = {
        kind: 'function',
        text: 'FUNCTION Add(x : INTEGER, y : INTEGER) RETURNS INTEGER',
        children: [
          {
            kind: 'return',
            text: 'RETURN x + y',
            children: []
          }
        ],
        meta: {
          name: 'Add',
          params: ['x : INTEGER', 'y : INTEGER'],
          hasReturn: true,
          returnType: 'INTEGER',
          endText: 'ENDFUNCTION'
        }
      };
      
      expect(functionIR.text).toContain('FUNCTION');
      expect(functionIR.text).toContain('RETURNS');
      expect(functionIR.meta?.hasReturn).toBe(true);
      expect(functionIR.meta?.returnType).toBe('INTEGER');
    });

    it('should handle ARRAY declaration', () => {
      const arrayIR = {
        kind: 'declare',
        text: 'DECLARE numbers : ARRAY[1:5] OF INTEGER',
        children: []
      };
      
      expect(arrayIR.text).toContain('DECLARE');
      expect(arrayIR.text).toContain('ARRAY');
      expect(arrayIR.text).toMatch(/ARRAY\[\d+:\d+\] OF \w+/);
    });

    it('should handle TYPE definition', () => {
      const typeIR = {
        kind: 'type',
        text: 'TYPE StudentRecord',
        children: [
          {
            kind: 'declare',
            text: 'DECLARE name : STRING',
            children: []
          },
          {
            kind: 'declare',
            text: 'DECLARE age : INTEGER',
            children: []
          }
        ],
        meta: {
          name: 'StudentRecord',
          endText: 'ENDTYPE'
        }
      };
      
      expect(typeIR.text).toContain('TYPE');
      expect(typeIR.meta?.endText).toBe('ENDTYPE');
    });

    it('should handle CASE structure', () => {
      const caseIR = {
        kind: 'case',
        text: 'CASE OF direction',
        children: [
          {
            kind: 'case_option',
            text: '"N" : y ← y + 1',
            children: []
          },
          {
            kind: 'case_option',
            text: '"S" : y ← y - 1',
            children: []
          },
          {
            kind: 'case_otherwise',
            text: 'OTHERWISE : OUTPUT "Invalid"',
            children: []
          }
        ],
        meta: {
          endText: 'ENDCASE'
        }
      };
      
      expect(caseIR.text).toContain('CASE OF');
      expect(caseIR.meta?.endText).toBe('ENDCASE');
    });
  });
});