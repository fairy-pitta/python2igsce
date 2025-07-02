// Pyodide AST parser

let loadPyodide: any;

// Dynamically import Pyodide
async function importPyodide() {
  try {
    // @ts-ignore
    const pyodideModule = await import('pyodide');
    loadPyodide = pyodideModule.loadPyodide;
    return true;
  } catch (error) {
    console.warn('Pyodide import failed:', error);
    return false;
  }
}

// ASTNode type definition (for Pyodide)
export interface ASTNode {
  type: string;
  body?: ASTNode[];
  lineno?: number;
  col_offset?: number;
  [key: string]: any;
}

// Implementation of the ParseError class
export class ParseError extends Error {
  public line?: number;
  public column?: number;
  public lineno: number;
  public msg: string;
  public errorType?: string;

  constructor(message: string, errorType?: string, line?: number, column?: number) {
    super(message);
    this.name = 'ParseError';
    if (errorType !== undefined) this.errorType = errorType;
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
    this.lineno = line ?? 0;
    this.msg = message;
  }
}

/**
 * Pyodide-based Python AST parser.
 * Uses Python's standard `ast` module for accurate AST parsing.
 */
export class PyodideASTParser {
  private pyodide: any | null = null;
  private initialized = false;

  /**
   * Initializes Pyodide.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Pyodide...');
      
      // Dynamic import of Pyodide
      const importSuccess = await importPyodide();
      if (!importSuccess) {
        throw new Error('Failed to import Pyodide module');
      }
      
      this.pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      });

      // Set up the Python AST parser.
      await this.pyodide.runPython(`
import ast
import json
from typing import Dict, Any, List, Union

def node_to_dict(node: ast.AST) -> Dict[str, Any]:
    """Convert AST node to a dictionary format"""
    if node is None:
        return None
    
    result = {
        'type': node.__class__.__name__,
        'lineno': getattr(node, 'lineno', None),
        'col_offset': getattr(node, 'col_offset', None),
        'end_lineno': getattr(node, 'end_lineno', None),
        'end_col_offset': getattr(node, 'end_col_offset', None)
    }
    
    # Process node attributes
    for field, value in ast.iter_fields(node):
        if isinstance(value, list):
            result[field] = [node_to_dict(item) if isinstance(item, ast.AST) else item for item in value]
        elif isinstance(value, ast.AST):
            result[field] = node_to_dict(value)
        else:
            result[field] = value
    
    return result

def parse_python_code(source_code: str) -> str:
    """Parse Python code and return a JSON-formatted AST"""
    try:
        tree = ast.parse(source_code)
        ast_dict = node_to_dict(tree)
        return json.dumps(ast_dict, ensure_ascii=False, indent=2)
    except SyntaxError as e:
        error_info = {
            'error': 'SyntaxError',
            'message': str(e),
            'lineno': e.lineno,
            'offset': e.offset,
            'text': e.text
        }
        return json.dumps({'error': error_info}, ensure_ascii=False)
    except Exception as e:
        error_info = {
            'error': type(e).__name__,
            'message': str(e)
        }
        return json.dumps({'error': error_info}, ensure_ascii=False)
      `);

      this.initialized = true;
      console.log('Pyodide initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pyodide:', error);
      throw new Error(`Pyodide initialization failed: ${error}`);
    }
  }

  /**
   * Converts Python code to an AST.
   */
  async parseToAST(sourceCode: string): Promise<ASTNode> {
    if (!this.initialized || !this.pyodide) {
      try {
        await this.initialize();
      } catch (error) {
        throw new ParseError(
          `Pyodide initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'initialization_error'
        );
      }
    }

    try {
      // Execute Python code to get the AST
      const result = this.pyodide!.runPython(`parse_python_code('''${sourceCode.replace(/'''/g, "\\'''")}''')`);
      const astData = JSON.parse(result);

      // Error checking
      if (astData.error) {
        const error = astData.error;
        throw new ParseError(
          `Python syntax error: ${error.message}`,
          'syntax_error',
          error.lineno || 0,
          error.offset || 0
        );
      }

      // Convert Python AST to TypeScript ASTNode
      return this.convertPythonASTToASTNode(astData);
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `AST parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parse_error'
      );
    }
  }

  /**
   * Converts a Python AST dictionary to an ASTNode.
   */
  private convertPythonASTToASTNode(pythonAST: any): ASTNode {
    if (!pythonAST || typeof pythonAST !== 'object') {
      throw new Error('Invalid Python AST data');
    }

    const node: ASTNode = {
      type: pythonAST.type || 'Unknown',
      lineno: pythonAST.lineno || 1,
      col_offset: pythonAST.col_offset || 0,
      end_lineno: pythonAST.end_lineno,
      end_col_offset: pythonAST.end_col_offset
    };

    // Process each field
    for (const [key, value] of Object.entries(pythonAST)) {
      if (['type', 'lineno', 'col_offset', 'end_lineno', 'end_col_offset'].includes(key)) {
        continue; // Already processed
      }

      if (Array.isArray(value)) {
        // 配列の場合、各要素を再帰的に変換
        (node as any)[key] = value.map(item => 
          (item && typeof item === 'object' && (item as any).type) 
            ? this.convertPythonASTToASTNode(item)
            : item
        );
      } else if (value && typeof value === 'object' && (value as any).type) {
        // ASTノードの場合、再帰的に変換
        (node as any)[key] = this.convertPythonASTToASTNode(value);
      } else {
        // プリミティブ値はそのまま
        (node as any)[key] = value;
      }
    }

    return node;
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.pyodide) {
      // Pyodideのクリーンアップ（必要に応じて）
      this.pyodide = null;
      this.initialized = false;
    }
  }

  /**
   * 初期化状態の確認
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// シングルトンインスタンス
let globalParser: PyodideASTParser | null = null;

/**
 * グローバルPyodideパーサーインスタンスを取得
 */
export function getPyodideParser(): PyodideASTParser {
  if (!globalParser) {
    globalParser = new PyodideASTParser();
  }
  return globalParser;
}

/**
 * 便利関数：PythonコードをASTに変換
 */
export async function parsePythonWithPyodide(sourceCode: string): Promise<ASTNode> {
  const parser = getPyodideParser();
  return await parser.parseToAST(sourceCode);
}