// TypeScript型定義のテスト
describe('TypeScript Type Definitions', () => {
  // IR型の定義テスト
  describe('IR Type Definition', () => {
    it('should define IR interface correctly', () => {
      // IR型の基本構造
      interface IR {
        kind: string;
        text: string;
        children: IR[];
        meta?: {
          name?: string;
          params?: string[];
          hasReturn?: boolean;
          returnType?: string;
          lineNumber?: number;
          endText?: string;
        };
      }
      
      const testIR: IR = {
        kind: 'assign',
        text: 'x ← 5',
        children: []
      };
      
      expect(testIR).toHaveProperty('kind');
      expect(testIR).toHaveProperty('text');
      expect(testIR).toHaveProperty('children');
      expect(typeof testIR.kind).toBe('string');
      expect(typeof testIR.text).toBe('string');
      expect(Array.isArray(testIR.children)).toBe(true);
    });

    it('should support optional meta properties', () => {
      interface IR {
        kind: string;
        text: string;
        children: IR[];
        meta?: {
          name?: string;
          params?: string[];
          hasReturn?: boolean;
          returnType?: string;
          lineNumber?: number;
          endText?: string;
        };
      }
      
      const testIRWithMeta: IR = {
        kind: 'function',
        text: 'FUNCTION Add(x : INTEGER, y : INTEGER) RETURNS INTEGER',
        children: [],
        meta: {
          name: 'Add',
          params: ['x : INTEGER', 'y : INTEGER'],
          hasReturn: true,
          returnType: 'INTEGER'
        }
      };
      
      expect(testIRWithMeta.meta).toBeDefined();
      expect(testIRWithMeta.meta?.name).toBe('Add');
      expect(testIRWithMeta.meta?.hasReturn).toBe(true);
    });
  });

  // IGCSE型の定義テスト
  describe('IGCSE Type Definitions', () => {
    it('should define data types correctly', () => {
      type IGCSEDataType = 
        | 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN' | 'CHAR'
        | 'ARRAY' | 'RECORD';
      
      const integerType: IGCSEDataType = 'INTEGER';
      const realType: IGCSEDataType = 'REAL';
      const stringType: IGCSEDataType = 'STRING';
      
      expect(integerType).toBe('INTEGER');
      expect(realType).toBe('REAL');
      expect(stringType).toBe('STRING');
    });

    it('should define operators correctly', () => {
      type IGCSEOperator = 
        | '←' | '=' | '≠' | '<' | '>' | '≤' | '≥'
        | 'AND' | 'OR' | 'NOT'
        | 'MOD' | 'DIV';
      
      const assignOp: IGCSEOperator = '←';
      const equalOp: IGCSEOperator = '=';
      const notEqualOp: IGCSEOperator = '≠';
      
      expect(assignOp).toBe('←');
      expect(equalOp).toBe('=');
      expect(notEqualOp).toBe('≠');
    });

    it('should define keywords correctly', () => {
      type IGCSEKeyword = 
        | 'IF' | 'THEN' | 'ELSE' | 'ENDIF'
        | 'FOR' | 'TO' | 'STEP' | 'NEXT'
        | 'WHILE' | 'ENDWHILE'
        | 'REPEAT' | 'UNTIL'
        | 'PROCEDURE' | 'ENDPROCEDURE'
        | 'FUNCTION' | 'RETURNS' | 'ENDFUNCTION'
        | 'INPUT' | 'OUTPUT'
        | 'CASE' | 'OF' | 'OTHERWISE' | 'ENDCASE'
        | 'TYPE' | 'ENDTYPE'
        | 'CLASS' | 'ENDCLASS';
      
      const ifKeyword: IGCSEKeyword = 'IF';
      const forKeyword: IGCSEKeyword = 'FOR';
      const procedureKeyword: IGCSEKeyword = 'PROCEDURE';
      
      expect(ifKeyword).toBe('IF');
      expect(forKeyword).toBe('FOR');
      expect(procedureKeyword).toBe('PROCEDURE');
    });
  });

  // パーサー型の定義テスト
  describe('Parser Type Definitions', () => {
    it('should define parser options correctly', () => {
      interface ParserOptions {
        indentSize: number;
        preserveComments: boolean;
        strictMode: boolean;
      }
      
      const options: ParserOptions = {
        indentSize: 4,
        preserveComments: true,
        strictMode: false
      };
      
      expect(options.indentSize).toBe(4);
      expect(options.preserveComments).toBe(true);
      expect(options.strictMode).toBe(false);
    });

    it('should define parse result correctly', () => {
      interface ParseError {
        message: string;
        line: number;
        column: number;
        severity: 'error' | 'warning';
      }
      
      interface ParseResult {
        ir: any[]; // IR型は別で定義
        errors: ParseError[];
        warnings: ParseError[];
      }
      
      const result: ParseResult = {
        ir: [],
        errors: [],
        warnings: []
      };
      
      expect(Array.isArray(result.ir)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // エミッター型の定義テスト
  describe('Emitter Type Definitions', () => {
    it('should define emitter options correctly', () => {
      interface EmitterOptions {
        format: 'plain' | 'markdown';
        indentSize: number;
        lineEnding: '\n' | '\r\n';
      }
      
      const options: EmitterOptions = {
        format: 'plain',
        indentSize: 3,
        lineEnding: '\n'
      };
      
      expect(options.format).toBe('plain');
      expect(options.indentSize).toBe(3);
      expect(options.lineEnding).toBe('\n');
    });

    it('should define emit result correctly', () => {
      interface EmitMetadata {
        lineCount: number;
        procedureCount: number;
        functionCount: number;
      }
      
      interface EmitResult {
        output: string;
        metadata: EmitMetadata;
      }
      
      const result: EmitResult = {
        output: 'x ← 5\nOUTPUT x',
        metadata: {
          lineCount: 2,
          procedureCount: 0,
          functionCount: 0
        }
      };
      
      expect(typeof result.output).toBe('string');
      expect(result.metadata.lineCount).toBe(2);
      expect(result.metadata.procedureCount).toBe(0);
    });
  });

  // ユーティリティ型の定義テスト
  describe('Utility Type Definitions', () => {
    it('should define position and location correctly', () => {
      interface Position {
        line: number;
        column: number;
      }
      
      interface Location {
        start: Position;
        end: Position;
      }
      
      const location: Location = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 }
      };
      
      expect(location.start.line).toBe(1);
      expect(location.end.column).toBe(10);
    });

    it('should define visitor pattern correctly', () => {
      interface Visitor<T> {
        visit(node: any): T;
      }
      
      class TestVisitor implements Visitor<string> {
        visit(node: any): string {
          return node.toString();
        }
      }
      
      const visitor = new TestVisitor();
      const result = visitor.visit({ value: 'test' });
      
      expect(typeof result).toBe('string');
    });
  });
});