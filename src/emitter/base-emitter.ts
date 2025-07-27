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
   * テキストのフォーマット（Python → IGCSE）
   */
  protected formatText(text: string): string {
    let result = text;
    
    // 演算子の変換
    result = this.convertOperators(result);
    
    // キーワードの大文字化
    result = this.uppercaseKeywords(result);
    
    return result;
  }

  /**
   * キーワードの大文字化（文字列リテラル外のみ）
   */
  private uppercaseKeywords(text: string): string {
    let result = text;
    
    // 文字列リテラルを一時的に保護
    const stringLiterals: string[] = [];
    result = result.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, (match) => {
      const index = stringLiterals.length;
      stringLiterals.push(match);
      return `__STRING_${index}__`;
    });
    
    // IGCSEキーワードの大文字化（文字列リテラル外のみ）
    const keywords = [
      'if', 'then', 'else', 'endif', 'elseif',
      'for', 'to', 'step', 'next', 'while', 'endwhile',
      'repeat', 'until', 'do',
      'procedure', 'endprocedure', 'function', 'endfunction', 'return',
      'declare', 'constant', 'array', 'of', 'type',
      'input', 'output', 'read', 'write',
      'and', 'or', 'not',
      'true', 'false', 'null',
      'case', 'of', 'otherwise', 'endcase',
      'class', 'endclass', 'new', 'super', 'this',
      'public', 'private', 'inherits'
    ];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      result = result.replace(regex, keyword.toUpperCase());
    });
    
    // 文字列リテラルを復元
    stringLiterals.forEach((literal, index) => {
      result = result.replace(`__STRING_${index}__`, literal);
    });
    
    return result;
  }

  /**
   * 演算子の変換（Python → IGCSE）
   */
  private convertOperators(text: string): string {
    let result = text;
    
    // コメント部分を保護（Pythonの#コメントとIGCSEの//コメントを一時的に置き換え）
    const commentMatches: string[] = [];
    result = result.replace(/(#.*$|\/\/.*$)/gm, (match) => {
      const index = commentMatches.length;
      commentMatches.push(match);
      return `__COMMENT_${index}__`;
    });
    
    // 文字列リテラルを一時的に保護
    const stringLiterals: string[] = [];
    result = result.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, (match) => {
      const index = stringLiterals.length;
      stringLiterals.push(match);
      return `__STRING_${index}__`;
    });
    
    // 比較演算子の変換（代入演算子より先に処理）
    result = result.replace(/!=/g, '≠');
    result = result.replace(/<=/g, '≤');
    result = result.replace(/>=/g, '≥');
    result = result.replace(/==/g, '=');
    
    // 代入演算子の変換（比較演算子以外の=のみ）
    // 行の先頭から変数名 = の形式を ← に変換
    result = result.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/gm, '$1$2 ← ');
    
    // 論理演算子の変換（単語境界を使用）
    result = result.replace(/\band\b/g, ' AND ');
    result = result.replace(/\bor\b/g, ' OR ');
    result = result.replace(/\bnot\b/g, 'NOT ');
    
    // 文字列リテラルを復元
    stringLiterals.forEach((literal, index) => {
      result = result.replace(`__STRING_${index}__`, literal);
    });
    
    // 文字列連結の変換（文字列リテラルが含まれる行の+を&に変換）
    const lines = result.split('\n');
    result = lines.map(line => {
      // 文字列リテラル（"または'で囲まれた部分）が含まれる行かチェック
      if (/["']/.test(line)) {
        // 文字列連結の+を&に変換（スペースの調整も行う）
        return line.replace(/\s*\+\s*/g, ' & ');
      }
      return line;
    }).join('\n');
    
    // 余分なスペースを削除（演算子周りの重複スペースを修正）
    result = result.replace(/\s{2,}/g, ' ');
    
    // コメントを復元（Pythonの#コメントをIGCSEの//コメントに変換）
    commentMatches.forEach((comment, index) => {
      let convertedComment = comment;
      // Pythonの#コメントをIGCSEの//コメントに変換
      if (comment.startsWith('#')) {
        convertedComment = comment.replace(/^#/, '//');
      }
      result = result.replace(`__COMMENT_${index}__`, convertedComment);
    });
    
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