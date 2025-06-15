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
    
    // 演算子の変換（Python → IGCSE）
    formatted = this.convertOperators(formatted);
    
    // キーワードの大文字化
    if (this.context.formatter.uppercaseKeywords) {
      formatted = this.uppercaseKeywords(formatted);
    }
    
    // 演算子周りのスペース
    if (this.context.formatter.spaceAroundOperators) {
      formatted = this.addSpaceAroundOperators(formatted);
    }
    
    // カンマ後のスペース（文字列リテラル内は除外）
    if (this.context.formatter.spaceAfterComma) {
      formatted = this.addSpaceAfterCommaOutsideStrings(formatted);
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
   * 演算子の変換（Python → IGCSE）
   */
  private convertOperators(text: string): string {
    let result = text;
    
    // コメント部分を保護（//で始まるコメントを一時的に置き換え）
    const commentMatches: string[] = [];
    result = result.replace(/\/\/.*$/gm, (match) => {
      const index = commentMatches.length;
      commentMatches.push(match);
      return `__COMMENT_${index}__`;
    });
    
    // 比較演算子を一時的なプレースホルダーに置き換え
    result = result.replace(/!=/g, '__NE__');
    result = result.replace(/<=/g, '__LE__');
    result = result.replace(/>=/g, '__GE__');
    result = result.replace(/==/g, '__EQ__');
    
    // 代入演算子の変換
    result = result.replace(/\s*=\s*/g, ' ← ');
    
    // プレースホルダーを正しい比較演算子に戻す
    result = result.replace(/__NE__/g, '≠');
    result = result.replace(/__LE__/g, '≤');
    result = result.replace(/__GE__/g, '≥');
    result = result.replace(/__EQ__/g, '=');
    
    // 論理演算子の変換
    result = result.replace(/\band\b/gi, 'AND');
    result = result.replace(/\bor\b/gi, 'OR');
    result = result.replace(/\bnot\b/gi, 'NOT');
    
    // 算術演算子の変換（コメント以外の//のみ）
    result = result.replace(/\s*%\s*/g, ' MOD ');
    result = result.replace(/\s*\/\/\s*/g, ' DIV ');
    
    // コメントを復元
    commentMatches.forEach((comment, index) => {
      result = result.replace(`__COMMENT_${index}__`, comment);
    });
    
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
   * 文字列リテラル外のカンマの後にスペースを追加
   */
  private addSpaceAfterCommaOutsideStrings(text: string): string {
    let result = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      
      // 文字列の開始/終了を検出
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      result += char;
      
      // 文字列外のカンマの後にスペースを追加
      if (!inString && char === ',' && i + 1 < text.length && text[i + 1] !== ' ') {
        result += ' ';
      }
    }
    
    return result;
  }

  /**
   * エミット結果の作成
   */
  protected createEmitResult(): EmitResult {
    const endTime = Date.now();
    const emitTime = endTime - this.startTime;
    
    const code = this.context.output.join(this.options.lineEnding);
    const linesGenerated = this.context.output.length;
    const charactersGenerated = code.length;
    
    return {
      code,
      errors: [...this.context.errors],
      warnings: [...this.context.warnings],
      stats: {
        linesGenerated,
        lineCount: linesGenerated, // テスト用エイリアス
        charactersGenerated,
        characterCount: charactersGenerated, // テスト用エイリアス
        nodesProcessed: 0, // 実装時に設定
        emitTime,
        processingTime: emitTime, // テスト用エイリアス
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