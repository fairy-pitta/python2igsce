// IR基本構造の定義
import { IGCSEDataType } from './igcse';

/**
 * 中間表現（IR）の基本インターフェース
 * 再帰的な構造でネストされたコードブロックを表現
 */
export interface IR {
  /** IRノードの種類 */
  kind: IRKind;
  /** 出力されるテキスト */
  text: string;
  /** 子IRノード（ネスト構造用） */
  children: IR[];
  /** 追加のメタデータ */
  meta?: IRMeta;
}

/**
 * IRノードの種類
 */
export type IRKind = 
  // プログラム構造
  | 'program'    // プログラム全体
  
  // 基本構文
  | 'assign'     // 代入文
  | 'output'     // 出力文
  | 'input'      // 入力文
  | 'comment'    // コメント
  
  // 制御構文
  | 'if'         // IF文
  | 'else'       // ELSE文
  | 'elseif'     // ELSE IF文
  | 'endif'      // ENDIF文
  | 'for'        // FOR文
  | 'while'      // WHILE文
  | 'endwhile'   // ENDWHILE文
  | 'repeat'     // REPEAT文
  | 'until'      // UNTIL文
  | 'break'      // BREAK文（EXIT WHILE/FOR）
  
  // 関数・プロシージャ
  | 'procedure'  // PROCEDURE定義
  | 'function'   // FUNCTION定義
  | 'return'     // RETURN文
  
  // データ構造
  | 'array'      // 配列宣言
  | 'array_literal' // 配列リテラル
  | 'type'       // TYPE定義
  | 'class'      // CLASS定義
  
  // その他
  | 'block'      // 複数のIRノードのグループ化
  | 'case'       // CASE文
  | 'statement'  // 一般的な文
  | 'expression' // 式
  | 'compound'   // 複合文（複数の文をまとめる）
  | 'module';    // モジュール

/**
 * 引数の詳細情報（文字列リテラルと変数を区別）
 */
export interface IRArgument {
  /** 引数の値 */
  value: string;
  /** 引数の型 */
  type: 'literal' | 'variable' | 'expression';
  /** データ型 */
  dataType?: IGCSEDataType;
}

/**
 * IRノードのメタデータ
 */
export interface IRMeta {
  /** 名前（変数名、関数名など） */
  name?: string;
  /** パラメータリスト */
  params?: string[];
  /** 戻り値の有無（FUNCTION判定用） */
  hasReturn?: boolean;
  /** 元のPythonコードの行番号 */
  lineNumber?: number;
  /** データ型 */
  dataType?: IGCSEDataType;
  /** 開始値（FOR文用） */
  startValue?: string;
  /** 終了値（FOR文用） */
  endValue?: string;
  /** ステップ値（FOR文用） */
  stepValue?: string;
  /** 条件式 */
  condition?: string;
  /** THEN側のステートメント（IF文用） */
  consequent?: IR[];
  /** ELSE側のステートメント（IF文用） */
  alternate?: IR[];
  /** 基底クラス名（クラス継承用） */
  baseClass?: string;
  /** 戻り値の型 */
  returnType?: IGCSEDataType;
  /** 配列のサイズ */
  size?: number;
  /** 配列のインデックス */
  index?: number | string;
  /** 文字列リテラルかどうか */
  isStringLiteral?: boolean;
  /** インラインコメントがあるかどうか */
  hasInlineComment?: boolean;
  /** 引数の詳細情報（型と値を区別） */
  arguments?: IRArgument[];
  /** 配列の要素型 */
  elementType?: string;
  /** 配列の要素 */
  elements?: any[];
  /** input関数にプロンプトがあるかどうか */
  hasPrompt?: boolean;
  /** input関数のプロンプト文字列 */
  prompt?: string;
  /** 終了テキスト（ENDPROCEDURE、ENDFUNCTION等） */
  endText?: string;
  /** 変数名（FOR文のループ変数など） */
  variable?: string;
}

/**
 * IRノード作成のヘルパー関数
 */
export function createIR(
  kind: IRKind,
  text: string,
  children: IR[] = [],
  meta?: IRMeta
): IR {
  const ir: IR = {
    kind,
    text,
    children
  };
  if (meta !== undefined) ir.meta = meta;
  return ir;
}

/**
 * IRツリーの深さを計算
 */
export function getIRDepth(ir: IR): number {
  if (ir.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...ir.children.map(child => getIRDepth(child)));
}

/**
 * IRツリーのノード数を計算
 */
export function countIRNodes(ir: IR): number {
  return 1 + ir.children.reduce((sum, child) => sum + countIRNodes(child), 0);
}

/**
 * 特定の種類のIRノードを検索
 */
export function findIRNodes(ir: IR, kind: IRKind): IR[] {
  const result: IR[] = [];
  
  if (ir.kind === kind) {
    result.push(ir);
  }
  
  for (const child of ir.children) {
    result.push(...findIRNodes(child, kind));
  }
  
  return result;
}