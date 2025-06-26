// パーサー関連の型定義
import { IR } from './ir';
import { IGCSEDataType } from './igcse';

/**
 * パーサーの設定オプション
 */
export interface ParserOptions {
  /** デバッグモードの有効化 */
  debug?: boolean;
  /** 厳密な型チェック */
  strictTypes?: boolean;
  /** 厳密モード */
  strictMode?: boolean;
  /** コメントの保持 */
  preserveComments?: boolean;
  /** コメントを含める */
  includeComments?: boolean;
  /** 空白の保持 */
  preserveWhitespace?: boolean;
  /** インデントサイズ */
  indentSize?: number;
  /** 最大ネスト深度 */
  maxDepth?: number;
  /** 最大エラー数 */
  maxErrors?: number;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * パーサーの結果
 */
export interface ParseResult {
  /** 生成されたIR */
  ir: IR[];
  /** エラーメッセージ */
  errors: ParseError[];
  /** 警告メッセージ */
  warnings: ParseWarning[];
  /** パース統計 */
  stats: ParseStats;
}

/**
 * パースエラー
 */
export interface ParseError {
  /** エラーメッセージ */
  message: string;
  /** エラーの種類 */
  type: ParseErrorType;
  /** 行番号 */
  line?: number;
  /** 列番号 */
  column?: number;
  /** エラーの重要度 */
  severity: 'error' | 'warning';
}

/**
 * パース警告
 */
export interface ParseWarning {
  /** 警告メッセージ */
  message: string;
  /** 警告の種類 */
  type: ParseWarningType;
  /** 行番号 */
  line?: number;
  /** 列番号 */
  column?: number;
}

/**
 * パースエラーの種類
 */
export type ParseErrorType = 
  | 'syntax_error'        // 構文エラー
  | 'type_error'          // 型エラー
  | 'name_error'          // 名前エラー
  | 'unsupported_feature' // サポートされていない機能
  | 'conversion_error'    // 変換エラー
  | 'validation_error';   // 検証エラー

/**
 * パース警告の種類
 */
export type ParseWarningType = 
  | 'type_inference'      // 型推論
  | 'implicit_conversion' // 暗黙的変換
  | 'deprecated_syntax'   // 非推奨構文
  | 'performance_hint'    // パフォーマンスヒント
  | 'style_suggestion';   // スタイル提案

/**
 * パース統計
 */
export interface ParseStats {
  /** 処理した行数 */
  linesProcessed: number;
  /** 生成されたIRノード数 */
  nodesGenerated: number;
  /** パース時間（ミリ秒） */
  parseTime: number;
  /** 検出された関数数 */
  functionsFound: number;
  /** 検出されたクラス数 */
  classesFound: number;
  /** 検出された変数数 */
  variablesFound: number;
}

/**
 * 変数情報
 */
export interface VariableInfo {
  /** 変数名 */
  name: string;
  /** データ型 */
  type: IGCSEDataType;
  /** スコープ */
  scope: string;
  /** 初期化済みかどうか */
  initialized: boolean;
  /** 定義された行番号 */
  definedAt?: number | undefined;
}

/**
 * 関数情報
 */
export interface FunctionInfo {
  /** 関数名 */
  name: string;
  /** パラメータリスト */
  parameters: ParameterInfo[];
  /** 戻り値の型 */
  returnType?: IGCSEDataType | undefined;
  /** 関数かプロシージャか */
  isFunction: boolean;
  /** 戻り値があるか */
  hasReturn: boolean;
  /** 定義された行番号 */
  definedAt?: number | undefined;
}

/**
 * パラメータ情報
 */
export interface ParameterInfo {
  /** パラメータ名 */
  name: string;
  /** データ型 */
  type: IGCSEDataType;
  /** デフォルト値 */
  defaultValue?: string;
  /** 参照渡しかどうか */
  byReference?: boolean;
}

/**
 * スコープ情報
 */
export interface ScopeInfo {
  /** スコープ名 */
  name: string;
  /** 親スコープ */
  parent?: ScopeInfo;
  /** 変数リスト */
  variables: Map<string, VariableInfo>;
  /** 関数リスト */
  functions: Map<string, FunctionInfo>;
  /** スコープの種類 */
  type: ScopeType;
}

/**
 * スコープの種類
 */
export type ScopeType = 
  | 'global'     // グローバルスコープ
  | 'function'   // 関数スコープ
  | 'class'      // クラススコープ
  | 'block'      // ブロックスコープ
  | 'while'      // whileループスコープ
  | 'for';       // forループスコープ

/**
 * 位置情報
 */
export interface Position {
  /** 行番号（1から開始） */
  line: number;
  /** 列番号（1から開始） */
  column: number;
}

/**
 * 範囲情報
 */
export interface Range {
  /** 開始位置 */
  start: Position;
  /** 終了位置 */
  end: Position;
}

/**
 * ソースロケーション
 */
export interface SourceLocation {
  /** ファイル名 */
  filename?: string;
  /** 範囲 */
  range: Range;
}

/**
 * パーサーコンテキスト
 */
export interface ParserContext {
  /** 現在のスコープ */
  currentScope: ScopeInfo;
  /** スコープスタック */
  scopeStack: ScopeInfo[];
  /** 現在の関数 */
  currentFunction?: FunctionInfo;
  /** 現在のクラス */
  currentClass?: string;
  /** インデントレベル */
  indentLevel: number;
  /** エラーリスト */
  errors: ParseError[];
  /** 警告リスト */
  warnings: ParseWarning[];
  /** 配列情報 */
  arrayInfo: { [key: string]: { size: number; elementType: string; currentIndex: number } };
  /** パラメータマッピング（コンストラクタ用） */
  parameterMapping: { [key: string]: string };
  /** パース開始時刻 */
  startTime: number;
}

/**
 * パーサーのヘルパー関数
 */
export function createParseError(
  message: string,
  type: ParseErrorType,
  line?: number,
  column?: number,
  severity: 'error' | 'warning' = 'error'
): ParseError {
  const error: ParseError = {
    message,
    type,
    severity
  };
  if (line !== undefined) error.line = line;
  if (column !== undefined) error.column = column;
  return error;
}

export function createParseWarning(
  message: string,
  type: ParseWarningType,
  line?: number,
  column?: number
): ParseWarning {
  const warning: ParseWarning = {
    message,
    type
  };
  if (line !== undefined) warning.line = line;
  if (column !== undefined) warning.column = column;
  return warning;
}

export function createPosition(line: number, column: number): Position {
  return { line, column };
}

export function createRange(start: Position, end: Position): Range {
  return { start, end };
}