// 型定義のエクスポート

// IR関連の型
export * from './ir';

// IGCSE Pseudocode関連の型
export * from './igcse';

// パーサー関連の型
export * from './parser';

// Emitter-related types
export * from './emitter';

// 共通ユーティリティ型
export interface ConversionOptions {
  /** パーサーオプション */
  parser?: import('./parser').ParserOptions;
  /** エミッターオプション */
  emitter?: import('./emitter').EmitterOptions;
  /** デバッグモード */
  debug?: boolean;
  /** 出力ファイル名 */
  outputFile?: string;
  /** 厳格モード */
  strictMode?: boolean;
  /** コメントを含める */
  includeComments?: boolean;
  /** 空白を保持 */
  preserveWhitespace?: boolean;
  /** 最大エラー数 */
  maxErrors?: number;
  /** タイムアウト */
  timeout?: number;
  /** 出力フォーマット */
  outputFormat?: 'plain' | 'markdown';
  /** インデントサイズ */
  indentSize?: number;
  /** インデントタイプ */
  indentType?: 'spaces' | 'tabs';
  /** 行末文字 */
  lineEnding?: '\n' | '\r\n';
  /** 最大行長 */
  maxLineLength?: number;
  /** 美化 */
  beautify?: boolean;
  /** 行番号を含める */
  includeLineNumbers?: boolean;
  /** キーワードを大文字にする */
  uppercaseKeywords?: boolean;
  /** 演算子の周りにスペース */
  spaceAroundOperators?: boolean;
  /** カンマの後にスペース */
  spaceAfterCommas?: boolean;
}

export interface ConversionResult {
  /** 変換されたコード */
  code: string;
  /** パース結果 */
  parseResult: import('./parser').ParseResult;
  /** エミット結果 */
  emitResult: import('./emitter').EmitResult;
  /** 変換統計 */
  stats: ConversionStats;
  /** パースされたAST（デバッグ用） */
  ast?: any;
  /** 中間表現（IR）ツリー */
  ir?: import('./ir').IR[];
}

export interface ConversionStats {
  /** 入力行数 */
  inputLines: number;
  /** 出力行数 */
  outputLines: number;
  /** 変換時間（ミリ秒） */
  conversionTime: number;
  /** パース時間（ミリ秒） */
  parseTime: number;
  /** エミット時間（ミリ秒） */
  emitTime: number;
  /** エラー数 */
  errorCount: number;
  /** 警告数 */
  warningCount: number;
}

// バージョン情報
export const VERSION = '1.0.0';
export const SUPPORTED_PYTHON_VERSION = '3.x';
export const IGCSE_SPEC_VERSION = '2024';