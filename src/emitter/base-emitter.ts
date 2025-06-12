// エミッターの基本クラス
import { IR } from '../types/ir';
import {
  EmitterOptions,
  EmitResult,
  EmitContext,
  FormatterConfig,
  createEmitError,
  createEmitWarning,
  createIndentInfo,
  getDefaultEmitterOptions,
  getDefaultFormatterConfig
} from '../types/emitter';

/**
 * エミッターの基本クラス
 * IRからテキストへの変換機能を提供
 */
export abstract class BaseEmitter {
  protected options: EmitterOptions;
  protected context: EmitContext;
  protected startTime: number = 0;

  constructor(options: Partial<EmitterOptions> = {}) {
    this.options = { ...getDefaultEmitterOptions(), ...options };
    this.context = this.createInitialContext();
  }

  /**
   * 初期コンテキストの作成
   */
  private createInitialContext(): EmitContext {
    return {
      indent: createIndentInfo(0, this.options.indentChar, this.options.indentSize),
      output: [],
      currentLine: 1,
      errors: [],
      warnings: [],
      formatter: getDefaultFormatterConfig()
    };
  }

  /**
   * エミットの実行（抽象メソッド）
   */
  abstract emit(ir: IR): EmitResult;

  /**
   * エラーの追加
   */
  protected addError(
    message: string,
    type: import('../types/emitter').EmitErrorType,
    node?: IR
  ): void {
    const error = createEmitError(message, type, node);
    this.context.errors.push(error);
    
    if (this.options.includeDebugInfo) {
      console.error(`Emit Error: ${message}`);
    }
  }

  /**
   * 警告の追加
   */
  protected addWarning(
    message: string,
    type: import('../types/emitter').EmitWarningType,
    node?: IR
  ): void {
    const warning = createEmitWarning(message, type, node);
    this.context.warnings.push(warning);
    
    if (this.options.includeDebugInfo) {
      console.warn(`Emit Warning: ${message}`);
    }
  }

  /**
   * インデントレベルの増加
   */
  protected increaseIndent(): void {
    this.context.indent = createIndentInfo(
      this.context.indent.level + 1,
      this.options.indentChar,
      this.options.indentSize
    );
  }

  /**
   * インデントレベルの減少
   */
  protected decreaseIndent(): void {
    if (this.context.indent.level > 0) {
      this.context.indent = createIndentInfo(
        this.context.indent.level - 1,
        this.options.indentChar,
        this.options.indentSize
      );
    }
  }

  /**
   * 行の出力
   */
  protected emitLine(text: string, indent: boolean = true): void {
    const indentedText = indent ? this.context.indent.string + text : text;
    
    // 行長チェック
    if (this.options.maxLineLength && indentedText.length > this.options.maxLineLength) {
      this.addWarning(
        `Line exceeds maximum length (${indentedText.length} > ${this.options.maxLineLength})`,
        'long_line'
      );
    }
    
    // 行番号付きの出力
    if (this.options.includeLineNumbers) {
      const lineNumber = this.context.currentLine.toString().padStart(3, ' ');
      this.context.output.push(`${lineNumber}: ${indentedText}`);
    } else {
      this.context.output.push(indentedText);
    }
    
    this.context.currentLine++;
  }

  /**
   * 空行の出力
   */
  protected emitBlankLine(): void {
    this.context.output.push('');
    this.context.currentLine++;
  }

  /**
   * コメントの出力
   */
  protected emitComment(text: string): void {
    if (this.options.includeComments) {
      this.emitLine(text);
    }
  }

  /**
   * IRノードの処理（抽象メソッド）
   */
  protected abstract emitNode(node: IR): void;

  /**
   * 子ノードの処理
   */
  protected emitChildren(node: IR): void {
    for (const child of node.children) {
      this.emitNode(child);
    }
  }

  /**
   * テキストのフォーマット
   */
  protected formatText(text: string): string {
    let formatted = text;
    
    // キーワードの大文字化
    if (this.context.formatter.uppercaseKeywords) {
      formatted = this.uppercaseKeywords(formatted);
    }
    
    // 演算子周りのスペース
    if (this.context.formatter.spaceAroundOperators) {
      formatted = this.addSpaceAroundOperators(formatted);
    }
    
    // カンマ後のスペース
    if (this.context.formatter.spaceAfterComma) {
      formatted = formatted.replace(/,(?!\s)/g, ', ');
    }
    
    return formatted;
  }

  /**
   * キーワードの大文字化
   */
  private uppercaseKeywords(text: string): string {
    const keywords = [
      'IF', 'THEN', 'ELSE', 'ENDIF',
      'FOR', 'TO', 'STEP', 'NEXT',
      'WHILE', 'ENDWHILE', 'REPEAT', 'UNTIL',
      'PROCEDURE', 'ENDPROCEDURE', 'FUNCTION', 'ENDFUNCTION',
      'RETURN', 'INPUT', 'OUTPUT',
      'CASE', 'OF', 'OTHERWISE', 'ENDCASE',
      'TYPE', 'ENDTYPE', 'CLASS', 'ENDCLASS',
      'DECLARE', 'CONSTANT', 'ARRAY', 'RECORD',
      'AND', 'OR', 'NOT', 'MOD', 'DIV'
    ];
    
    let result = text;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      result = result.replace(regex, keyword);
    }
    
    return result;
  }

  /**
   * 演算子周りのスペース追加
   */
  private addSpaceAroundOperators(text: string): string {
    const operators = ['←', '=', '≠', '<', '>', '≤', '≥', '+', '-', '*', '/', 'MOD', 'DIV'];
    
    let result = text;
    for (const op of operators) {
      // 既にスペースがある場合は処理しない
      const regex = new RegExp(`(?<!\\s)${this.escapeRegex(op)}(?!\\s)`, 'g');
      result = result.replace(regex, ` ${op} `);
    }
    
    // 重複するスペースを除去
    result = result.replace(/\s+/g, ' ');
    
    return result;
  }

  /**
   * 正規表現用のエスケープ
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * エミット結果の作成
   */
  protected createEmitResult(): EmitResult {
    const endTime = Date.now();
    const emitTime = endTime - this.startTime;
    
    const code = this.context.output.join(this.options.lineEnding);
    
    return {
      code,
      errors: [...this.context.errors],
      warnings: [...this.context.warnings],
      stats: {
        linesGenerated: this.context.output.length,
        charactersGenerated: code.length,
        nodesProcessed: 0, // 実装時に設定
        emitTime,
        maxNestingDepth: this.context.indent.level,
        maxLineLength: Math.max(...this.context.output.map(line => line.length))
      }
    };
  }

  /**
   * エミットの開始時刻を記録
   */
  protected startEmitting(): void {
    this.startTime = Date.now();
  }

  /**
   * デバッグ情報の出力
   */
  protected debug(message: string): void {
    if (this.options.includeDebugInfo) {
      console.log(`[Emitter Debug] ${message}`);
    }
  }

  /**
   * コンテキストのリセット
   */
  protected resetContext(): void {
    this.context = this.createInitialContext();
  }

  /**
   * 長い行の折り返し
   */
  protected wrapLongLine(text: string, maxLength?: number): string[] {
    const limit = maxLength || this.options.maxLineLength || 80;
    
    if (text.length <= limit) {
      return [text];
    }
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= limit) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * 設定の更新
   */
  updateOptions(options: Partial<EmitterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * フォーマッター設定の更新
   */
  updateFormatterConfig(config: Partial<FormatterConfig>): void {
    this.context.formatter = { ...this.context.formatter, ...config };
  }
}