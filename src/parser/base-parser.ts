// Base class for parsers
import { IR, createIR } from '../types/ir';
import { 
  ParserOptions, 
  ParseResult, 
  ParserContext,
  ScopeInfo,
  VariableInfo,
  FunctionInfo,
  createParseError,
  createParseWarning
} from '../types/parser';
import { IGCSEDataType } from '../types/igcse';

/**
 * Base class for parsers.
 * Provides common parsing functionality.
 */
export abstract class BaseParser {
  protected options: Required<ParserOptions>;
  protected context: ParserContext;
  protected startTime: number = 0;

  constructor(options: ParserOptions = {}) {
    this.options = this.getDefaultOptions(options);
    this.context = this.createInitialContext();
  }

  /**
   * Gets the default options.
   */
  private getDefaultOptions(options: ParserOptions): Required<ParserOptions> {
    return {
      debug: options.debug ?? false,
      strictTypes: options.strictTypes ?? true,
      strictMode: options.strictMode ?? false,
      preserveComments: options.preserveComments ?? true,
      includeComments: options.includeComments ?? true,
      preserveWhitespace: options.preserveWhitespace ?? false,
      indentSize: options.indentSize ?? 3,
      maxDepth: options.maxDepth ?? 50,
      maxErrors: options.maxErrors ?? 100,
      timeout: options.timeout ?? 30000,
      usePyodide: options.usePyodide ?? false
    };
  }

  /**
   * Creates the initial context.
   */
  private createInitialContext(): ParserContext {
    const globalScope: ScopeInfo = {
      name: 'global',
      variables: new Map(),
      functions: new Map(),
      type: 'global'
    };

    return {
      currentScope: globalScope,
      scopeStack: [globalScope],
      indentLevel: 0,
      errors: [],
      warnings: [],
      arrayInfo: {},
      parameterMapping: {},
      startTime: Date.now()
    };
  }

  /**
   * Executes parsing (abstract method).
   */
  abstract parse(source: string): Promise<ParseResult>;

  /**
   * Adds an error.
   */
  protected addError(
    message: string,
    type: import('../types/parser').ParseErrorType,
    line?: number,
    column?: number
  ): void {
    const error = createParseError(message, type, line, column);
    this.context.errors.push(error);
    
    if (this.options.debug) {
      console.error(`Parse Error: ${message} at line ${line}:${column}`);
    }
  }

  /**
   * Adds a warning.
   */
  protected addWarning(
    message: string,
    type: import('../types/parser').ParseWarningType,
    line?: number,
    column?: number
  ): void {
    const warning = createParseWarning(message, type, line, column);
    this.context.warnings.push(warning);
    
    if (this.options.debug) {
      console.warn(`Parse Warning: ${message} at line ${line}:${column}`);
    }
  }

  /**
   * Enters a new scope.
   */
  protected enterScope(name: string, type: import('../types/parser').ScopeType): void {
    const newScope: ScopeInfo = {
      name,
      parent: this.context.currentScope,
      variables: new Map(),
      functions: new Map(),
      type
    };
    
    this.context.scopeStack.push(newScope);
    this.context.currentScope = newScope;
  }

  /**
   * Exits the current scope.
   */
  protected exitScope(): void {
    if (this.context.scopeStack.length > 1) {
      this.context.scopeStack.pop();
      this.context.currentScope = this.context.scopeStack[this.context.scopeStack.length - 1];
    }
  }

  /**
   * Gets the current loop type.
   */
  protected getCurrentLoopType(): 'while' | 'for' | null {
    // Search the scope stack in reverse order and return the first loop scope found.
    for (let i = this.context.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.context.scopeStack[i];
      if (scope.type === 'while' || scope.type === 'for') {
        return scope.type;
      }
    }
    return null;
  }

  /**
   * Registers a variable.
   */
  protected registerVariable(
    name: string,
    type: IGCSEDataType,
    line?: number,
    arraySize?: number
  ): void {
    const variable: VariableInfo = {
      name,
      type,
      scope: this.context.currentScope.name,
      initialized: false,
      definedAt: line,
      ...(arraySize !== undefined && { arraySize })
    };
    
    this.context.currentScope.variables.set(name, variable);
  }

  /**
   * Registers a function.
   */
  protected registerFunction(
    name: string,
    parameters: import('../types/parser').ParameterInfo[],
    returnType?: IGCSEDataType,
    line?: number
  ): void {
    const func: FunctionInfo = {
      name,
      parameters,
      returnType,
      isFunction: returnType !== undefined,
      hasReturn: returnType !== undefined,
      definedAt: line
    };
    
    this.context.currentScope.functions.set(name, func);
    this.context.currentFunction = func;
  }

  /**
   * Finds a variable.
   */
  protected findVariable(name: string): VariableInfo | undefined {
    // Search from the current scope to the parent scopes.
    let scope: ScopeInfo | undefined = this.context.currentScope;
    
    while (scope) {
      const variable = scope.variables.get(name);
      if (variable) {
        return variable;
      }
      scope = scope.parent;
    }
    
    return undefined;
  }

  /**
   * 変数情報の取得
   */
  protected getVariableInfo(name: string): VariableInfo | undefined {
    return this.findVariable(name);
  }

  /**
   * 関数の検索
   */
  protected findFunction(name: string): FunctionInfo | undefined {
    // 現在のスコープから上位スコープへ順番に検索
    let scope: ScopeInfo | undefined = this.context.currentScope;
    
    while (scope) {
      const func = scope.functions.get(name);
      if (func) {
        return func;
      }
      scope = scope.parent;
    }
    
    return undefined;
  }

  /**
   * クラスの登録
   */
  protected registerClass(name: string, line?: number): void {
    // クラス情報を現在のスコープに登録
    // 実装は簡略化し、デバッグ出力のみ
    if (this.options.debug) {
      console.log(`Registering class: ${name} at line ${line}`);
    }
  }

  /**
   * インデントレベルの増加
   */
  protected increaseIndent(): void {
    this.context.indentLevel++;
    
    if (this.context.indentLevel > this.options.maxDepth) {
      this.addError(
        `Maximum nesting depth (${this.options.maxDepth}) exceeded`,
        'validation_error'
      );
    }
  }

  /**
   * インデントレベルの減少
   */
  protected decreaseIndent(): void {
    if (this.context.indentLevel > 0) {
      this.context.indentLevel--;
    }
  }

  /**
   * IRノードの作成（ヘルパー）
   */
  protected createIRNode(
    kind: import('../types/ir').IRKind,
    text: string,
    children: IR[] = [],
    meta?: import('../types/ir').IRMeta
  ): IR {
    return createIR(kind, text, children, meta);
  }

  /**
   * パース結果の作成
   */
  protected createParseResult(ir: IR[]): ParseResult {
    const endTime = Date.now();
    const parseTime = endTime - this.startTime;
    
    return {
      ir,
      errors: [...this.context.errors],
      warnings: [...this.context.warnings],
      stats: {
        linesProcessed: 0, // 実装時に設定
        nodesGenerated: ir.reduce((sum, node) => sum + this.countNodes(node), 0),
        parseTime,
        functionsFound: this.countFunctions(),
        classesFound: 0, // 実装時に設定
        variablesFound: this.countVariables()
      }
    };
  }

  /**
   * IRノード数のカウント
   */
  protected countNodes(ir: IR): number {
    return 1 + ir.children.reduce((sum, child) => sum + this.countNodes(child), 0);
  }

  /**
   * 関数数のカウント
   */
  protected countFunctions(): number {
    let count = 0;
    for (const scope of this.context.scopeStack) {
      count += scope.functions.size;
    }
    return count;
  }

  /**
   * 変数数のカウント
   */
  protected countVariables(): number {
    let count = 0;
    for (const scope of this.context.scopeStack) {
      count += scope.variables.size;
    }
    return count;
  }

  /**
   * パースの開始時刻を記録
   */
  protected startParsing(): void {
    this.startTime = Date.now();
  }

  /**
   * デバッグ情報の出力
   */
  protected debug(_message: string): void {
    // Debug logging disabled
  }

  /**
   * コンテキストのリセット
   */
  protected resetContext(): void {
    this.context = this.createInitialContext();
  }

  /**
   * エラーの取得
   */
  protected getErrors(): import('../types/parser').ParseError[] {
    return this.context.errors;
  }

  /**
   * 警告の取得
   */
  protected getWarnings(): import('../types/parser').ParseWarning[] {
    return this.context.warnings;
  }
}