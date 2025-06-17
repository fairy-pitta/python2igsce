// エミッター関連の型定義
import { IR } from './ir';

/**
 * エミッターの設定オプション
 */
export interface EmitterOptions {
  /** 出力フォーマット */
  format: OutputFormat;
  /** インデントサイズ */
  indentSize: number;
  /** インデント文字（スペースまたはタブ） */
  indentChar: ' ' | '\t';
  /** インデントタイプ */
  indentType?: 'spaces' | 'tabs';
  /** 行末文字 */
  lineEnding: '\n' | '\r\n';
  /** 最大行長 */
  maxLineLength?: number;
  /** コメントの出力 */
  includeComments: boolean;
  /** 行番号の出力 */
  includeLineNumbers: boolean;
  /** デバッグ情報の出力 */
  includeDebugInfo: boolean;
  /** 美化オプション */
  beautify: boolean;
}

/**
 * 出力フォーマット
 */
export type OutputFormat = 
  | 'plain'     // プレーンテキスト
  | 'markdown'  // Markdown形式
  | 'html'      // HTML形式
  | 'latex';    // LaTeX形式

/**
 * エミッターの結果
 */
export interface EmitResult {
  /** 生成されたコード */
  code: string;
  /** エラーメッセージ */
  errors: EmitError[];
  /** 警告メッセージ */
  warnings: EmitWarning[];
  /** 出力統計 */
  stats: EmitStats;
}

/**
 * エミットエラー
 */
export interface EmitError {
  /** エラーメッセージ */
  message: string;
  /** エラーの種類 */
  type: EmitErrorType;
  /** 対象のIRノード */
  node?: IR;
  /** エラーの重要度 */
  severity: 'error' | 'warning';
}

/**
 * エミット警告
 */
export interface EmitWarning {
  /** 警告メッセージ */
  message: string;
  /** 警告の種類 */
  type: EmitWarningType;
  /** 対象のIRノード */
  node?: IR;
}

/**
 * エミットエラーの種類
 */
export type EmitErrorType = 
  | 'invalid_ir'          // 無効なIR
  | 'unsupported_node'    // サポートされていないノード
  | 'formatting_error'    // フォーマットエラー
  | 'output_error'        // 出力エラー
  | 'validation_error';   // 検証エラー

/**
 * エミット警告の種類
 */
export type EmitWarningType = 
  | 'long_line'           // 長い行
  | 'deep_nesting'        // 深いネスト
  | 'complex_expression'  // 複雑な式
  | 'style_issue';        // スタイルの問題

/**
 * エミット統計
 */
export interface EmitStats {
  /** 出力行数 */
  linesGenerated: number;
  /** 出力行数（テスト用エイリアス） */
  lineCount: number;
  /** 出力文字数 */
  charactersGenerated: number;
  /** 出力文字数（テスト用エイリアス） */
  characterCount: number;
  /** 処理したIRノード数 */
  nodesProcessed: number;
  /** エミット時間（ミリ秒） */
  emitTime: number;
  /** 処理時間（テスト用エイリアス） */
  processingTime: number;
  /** 最大ネスト深度 */
  maxNestingDepth: number;
  /** 最大行長 */
  maxLineLength: number;
}

/**
 * インデント情報
 */
export interface IndentInfo {
  /** 現在のインデントレベル */
  level: number;
  /** インデント文字列 */
  string: string;
  /** 次のレベルのインデント文字列 */
  next: string;
}

/**
 * フォーマッター設定
 */
export interface FormatterConfig {
  /** キーワードの大文字化 */
  uppercaseKeywords: boolean;
  /** 演算子周りのスペース */
  spaceAroundOperators: boolean;
  /** カンマ後のスペース */
  spaceAfterComma: boolean;
  /** 括弧内のスペース */
  spaceInsideParentheses: boolean;
  /** 空行の挿入 */
  insertBlankLines: boolean;
  /** 行の折り返し */
  wrapLongLines: boolean;
}

/**
 * 出力コンテキスト
 */
export interface EmitContext {
  /** 現在のインデント情報 */
  indent: IndentInfo;
  /** 出力バッファ */
  output: string[];
  /** 現在の行番号 */
  currentLine: number;
  /** エラーリスト */
  errors: EmitError[];
  /** 警告リスト */
  warnings: EmitWarning[];
  /** フォーマッター設定 */
  formatter: FormatterConfig;
  /** 現在処理中のIRノード */
  currentNode?: IR;
}

/**
 * テンプレート情報
 */
export interface Template {
  /** テンプレート名 */
  name: string;
  /** テンプレート内容 */
  content: string;
  /** 変数プレースホルダー */
  variables: string[];
}

/**
 * Markdown出力用の設定
 */
export interface MarkdownConfig {
  /** コードブロックの言語指定 */
  codeBlockLanguage: string;
  /** 見出しレベル */
  headingLevel: number;
  /** 説明文の追加 */
  includeDescription: boolean;
  /** 目次の生成 */
  generateToc: boolean;
}

/**
 * HTML出力用の設定
 */
export interface HtmlConfig {
  /** CSSクラス名のプレフィックス */
  cssPrefix: string;
  /** インラインスタイルの使用 */
  useInlineStyles: boolean;
  /** シンタックスハイライト */
  syntaxHighlight: boolean;
  /** 行番号の表示 */
  showLineNumbers: boolean;
}

/**
 * LaTeX出力用の設定
 */
export interface LatexConfig {
  /** パッケージリスト */
  packages: string[];
  /** フォント設定 */
  fontFamily: string;
  /** コードブロック環境 */
  codeEnvironment: string;
  /** 数式モード */
  mathMode: boolean;
}

/**
 * エミッターのヘルパー関数
 */
export function createEmitError(
  message: string,
  type: EmitErrorType,
  node?: IR,
  severity: 'error' | 'warning' = 'error'
): EmitError {
  const error: EmitError = {
    message,
    type,
    severity
  };
  if (node !== undefined) error.node = node;
  return error;
}

export function createEmitWarning(
  message: string,
  type: EmitWarningType,
  node?: IR
): EmitWarning {
  const warning: EmitWarning = {
    message,
    type
  };
  if (node !== undefined) warning.node = node;
  return warning;
}

export function createIndentInfo(
  level: number,
  indentChar: ' ' | '\t',
  indentSize: number
): IndentInfo {
  const unit = indentChar.repeat(indentSize);
  const string = unit.repeat(level);
  const next = unit.repeat(level + 1);
  
  return {
    level,
    string,
    next
  };
}

export function getDefaultEmitterOptions(): EmitterOptions {
  return {
    format: 'plain',
    indentSize: 2,
    indentChar: ' ',
    lineEnding: '\n',
    maxLineLength: 80,
    includeComments: true,
    includeLineNumbers: false,
    includeDebugInfo: false,
    beautify: true
  };
}

export function getDefaultFormatterConfig(): FormatterConfig {
  return {
    uppercaseKeywords: true,
    spaceAroundOperators: true,
    spaceAfterComma: true,
    spaceInsideParentheses: false,
    insertBlankLines: false,
    wrapLongLines: true
  };
}