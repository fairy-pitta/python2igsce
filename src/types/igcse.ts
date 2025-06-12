// IGCSE Pseudocode特有の型定義

/**
 * IGCSE Pseudocodeでサポートされるデータ型
 */
export type IGCSEDataType = 
  | 'INTEGER'   // 整数型
  | 'REAL'      // 実数型
  | 'STRING'    // 文字列型
  | 'BOOLEAN'   // 真偽値型
  | 'CHAR'      // 文字型
  | 'ARRAY'     // 配列型
  | 'RECORD';   // レコード型

/**
 * IGCSE Pseudocodeの演算子
 */
export type IGCSEOperator = 
  // 代入演算子
  | '←'         // 代入
  
  // 比較演算子
  | '='         // 等しい
  | '≠'         // 等しくない
  | '<'         // より小さい
  | '>'         // より大きい
  | '≤'         // 以下
  | '≥'         // 以上
  
  // 論理演算子
  | 'AND'       // 論理積
  | 'OR'        // 論理和
  | 'NOT'       // 論理否定
  
  // 算術演算子
  | '+'         // 加算
  | '-'         // 減算
  | '*'         // 乗算
  | '/'         // 除算
  | 'MOD'       // 剰余
  | 'DIV';      // 整数除算

/**
 * IGCSE Pseudocodeのキーワード
 */
export type IGCSEKeyword = 
  // 条件文
  | 'IF'        // IF文開始
  | 'THEN'      // THEN
  | 'ELSE'      // ELSE文
  | 'ENDIF'     // IF文終了
  
  // ループ文
  | 'FOR'       // FOR文開始
  | 'TO'        // TO（FOR文用）
  | 'STEP'      // STEP（FOR文用）
  | 'NEXT'      // FOR文終了
  | 'WHILE'     // WHILE文開始
  | 'ENDWHILE'  // WHILE文終了
  | 'REPEAT'    // REPEAT文開始
  | 'UNTIL'     // REPEAT文終了
  
  // 関数・プロシージャ
  | 'PROCEDURE' // プロシージャ開始
  | 'ENDPROCEDURE' // プロシージャ終了
  | 'FUNCTION'  // 関数開始
  | 'RETURNS'   // 戻り値型指定
  | 'ENDFUNCTION' // 関数終了
  | 'RETURN'    // 戻り値
  
  // 入出力
  | 'INPUT'     // 入力
  | 'OUTPUT'    // 出力
  
  // 選択文
  | 'CASE'      // CASE文開始
  | 'OF'        // OF（CASE文用）
  | 'OTHERWISE' // OTHERWISE（CASE文用）
  | 'ENDCASE'   // CASE文終了
  
  // データ構造
  | 'TYPE'      // TYPE定義開始
  | 'ENDTYPE'   // TYPE定義終了
  | 'CLASS'     // CLASS定義開始
  | 'ENDCLASS'  // CLASS定義終了
  | 'DECLARE'   // 変数宣言
  
  // その他
  | 'CONSTANT'  // 定数
  | 'ARRAY'     // 配列
  | 'RECORD';   // レコード

/**
 * Python演算子からIGCSE演算子へのマッピング
 */
export const PYTHON_TO_IGCSE_OPERATORS: Record<string, IGCSEOperator> = {
  '=': '←',
  '==': '=',
  '!=': '≠',
  '<': '<',
  '>': '>',
  '<=': '≤',
  '>=': '≥',
  'and': 'AND',
  'or': 'OR',
  'not': 'NOT',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': 'MOD',
  '//': 'DIV'
};

/**
 * Python型からIGCSE型へのマッピング
 */
export const PYTHON_TO_IGCSE_TYPES: Record<string, IGCSEDataType> = {
  'int': 'INTEGER',
  'float': 'REAL',
  'str': 'STRING',
  'bool': 'BOOLEAN',
  'list': 'ARRAY',
  'dict': 'RECORD'
};

/**
 * IGCSE Pseudocodeの予約語チェック
 */
export function isIGCSEKeyword(word: string): boolean {
  const keywords: IGCSEKeyword[] = [
    'IF', 'THEN', 'ELSE', 'ENDIF',
    'FOR', 'TO', 'STEP', 'NEXT',
    'WHILE', 'ENDWHILE', 'REPEAT', 'UNTIL',
    'PROCEDURE', 'ENDPROCEDURE', 'FUNCTION', 'RETURNS', 'ENDFUNCTION', 'RETURN',
    'INPUT', 'OUTPUT',
    'CASE', 'OF', 'OTHERWISE', 'ENDCASE',
    'TYPE', 'ENDTYPE', 'CLASS', 'ENDCLASS', 'DECLARE',
    'CONSTANT', 'ARRAY', 'RECORD'
  ];
  return keywords.includes(word.toUpperCase() as IGCSEKeyword);
}

/**
 * Python演算子をIGCSE演算子に変換
 */
export function convertOperator(pythonOp: string): IGCSEOperator {
  return PYTHON_TO_IGCSE_OPERATORS[pythonOp] || pythonOp as IGCSEOperator;
}

/**
 * Python型をIGCSE型に変換
 */
export function convertDataType(pythonType: string): IGCSEDataType {
  return PYTHON_TO_IGCSE_TYPES[pythonType] || 'STRING';
}

/**
 * 型推論のヘルパー関数
 */
export function inferDataType(value: any): IGCSEDataType {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'REAL';
  }
  if (typeof value === 'string') {
    return value.length === 1 ? 'CHAR' : 'STRING';
  }
  if (typeof value === 'boolean') {
    return 'BOOLEAN';
  }
  if (Array.isArray(value)) {
    return 'ARRAY';
  }
  if (typeof value === 'object' && value !== null) {
    return 'RECORD';
  }
  return 'STRING'; // デフォルト
}