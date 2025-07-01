# Python → IGCSE Pseudocode 変換ライブラリ アーキテクチャ解説

## 📁 プロジェクト構成

### src/ ディレクトリ構成

```
src/
├── index.ts              # 公開API・エントリーポイント
├── converter.ts           # メイン変換クラス
├── cli.ts                # コマンドラインインターフェース
├── types/                # 型定義
│   ├── index.ts          # 統合型エクスポート
│   ├── ir.ts             # 中間表現（IR）型定義
│   ├── igcse.ts          # IGCSE Pseudocode型定義
│   ├── parser.ts         # パーサー関連型
│   └── emitter.ts        # エミッター関連型
├── parser/               # パーサーモジュール
│   ├── index.ts          # パーサーエクスポート
│   ├── base-parser.ts    # 抽象パーサークラス
│   ├── python-parser.ts  # メインPythonパーサー
│   ├── visitor.ts        # ASTビジター（パース中核）
│   ├── statement-visitor.ts    # 文ビジター
│   ├── expression-visitor.ts   # 式ビジター
│   ├── definition-visitor.ts   # 定義ビジター
│   └── factory.ts        # パーサーファクトリー
├── emitter/              # エミッターモジュール
│   ├── index.ts          # エミッターエクスポート
│   ├── base-emitter.ts   # 抽象エミッタークラス
│   ├── text-emitter.ts   # プレーンテキスト出力
│   ├── markdown-emitter.ts     # Markdown出力
│   ├── factory.ts        # エミッターファクトリー
│   └── utils.ts          # エミッターユーティリティ
└── ir/                   # 中間表現（現在空）
```

## 🏗️ アーキテクチャ概要

### 変換フロー

```
Python Code → Parser → IR (中間表現) → Emitter → IGCSE Pseudocode
```

1. **Parser**: PythonコードをASTに解析し、IRに変換
2. **IR (Intermediate Representation)**: 言語中立的な中間表現
3. **Emitter**: IRをIGCSE Pseudocodeテキストに変換

### 主要コンポーネント

## 📋 詳細解説

### 1. エントリーポイント (`src/index.ts`)

**役割**: ライブラリの公開APIを提供

**主要エクスポート**:
- `Converter`: メイン変換クラス
- `convertPython()`: 簡易変換関数
- `CLI`: コマンドラインインターフェース
- パーサー・エミッター関連クラス
- 型定義

**特徴**:
- レガシー互換性のため`PythonToIGCSEConverter`エイリアスを提供
- デフォルトコンバーターインスタンスを提供
- バージョン情報とサポート仕様を公開

### 2. メイン変換クラス (`src/converter.ts`)

**役割**: Python → IGCSE Pseudocode変換の統合制御

**主要機能**:
- パーサーとエミッターの初期化・管理
- 変換オプションの統合管理
- 変換統計の収集
- エラーハンドリング

**変換メソッド**:
- `convert(pythonCode)`: 基本変換
- `convertFile(filePath)`: ファイル変換
- `convertFiles(filePaths)`: 複数ファイル変換

### 3. CLI (`src/cli.ts`)

**役割**: コマンドライン操作インターフェース

**主要コマンド**:
- `convert`: ファイル/ディレクトリ変換
- `validate`: 構文検証
- `analyze`: コード解析

**オプション**:
- 出力フォーマット（plain/markdown）
- インデント設定
- 厳格モード
- デバッグオプション

## 🔧 型定義システム (`src/types/`)

### IR型定義 (`ir.ts`)

**中間表現（IR）の構造**:
```typescript
interface IR {
  kind: IRKind;           // ノード種類
  text: string;           // 出力テキスト
  children: IR[];         // 子ノード
  meta?: IRMeta;          // メタデータ
}
```

**サポートするIRKind**:
- **プログラム構造**: `program`
- **基本構文**: `assign`, `output`, `input`, `comment`
- **制御構文**: `if`, `else`, `elseif`, `endif`, `for`, `while`, `endwhile`, `repeat`, `until`, `break`
- **関数**: `procedure`, `function`, `return`
- **データ構造**: `array`, `array_literal`, `type`, `class`
- **その他**: `block`, `case`, `statement`, `expression`, `compound`, `module`

### パーサー型定義 (`parser.ts`)

**主要インターフェース**:
- `ParserOptions`: パーサー設定
- `ParseResult`: パース結果
- `ParseError/ParseWarning`: エラー・警告
- `ParserContext`: パース状態管理

### エミッター型定義 (`emitter.ts`)

**主要インターフェース**:
- `EmitterOptions`: エミッター設定
- `EmitResult`: エミット結果
- `EmitContext`: エミット状態管理
- `FormatterConfig`: フォーマット設定

## 🔍 パーサーモジュール (`src/parser/`)

### 基本パーサー (`base-parser.ts`)

**役割**: パーサーの共通機能を提供する抽象クラス

**主要機能**:
- オプション管理
- コンテキスト管理（スコープ、変数、関数情報）
- エラー・警告管理
- 統計収集

### メインパーサー (`python-parser.ts`)

**役割**: Pythonコードの解析とIR変換

**処理フロー**:
1. ソースコード前処理
2. ASTビジターによる解析
3. IR生成
4. 統計収集

### ASTビジター (`visitor.ts`) - 🔥 中核コンポーネント

**役割**: Python ASTからIRへの変換を担当

**主要機能**:
- 簡易ASTパーサー（実際の実装では外部ライブラリ使用予定）
- 文・式・定義の解析
- ネストされた構造の処理
- IF-ELIF-ELSE構造の特別処理

**処理できる構文**:
- 代入文 (`x = 10`)
- 出力文 (`print()`)
- 入力文 (`input()`)
- 制御構文 (`if`, `for`, `while`)
- 演算子 (`+`, `-`, `*`, `/`, `//`, `%`, `**`)
- 比較演算子 (`==`, `!=`, `<`, `>`, `<=`, `>=`)
- 論理演算子 (`and`, `or`, `not`)
- コメント (`#`)

### 専門ビジター

- **StatementVisitor** (`statement-visitor.ts`): 文の処理
- **ExpressionVisitor** (`expression-visitor.ts`): 式の処理
- **DefinitionVisitor** (`definition-visitor.ts`): 定義の処理

## 📤 エミッターモジュール (`src/emitter/`)

### 基本エミッター (`base-emitter.ts`)

**役割**: エミッターの共通機能を提供する抽象クラス

**主要機能**:
- オプション管理
- インデント管理
- エラー・警告管理
- 出力バッファ管理

### テキストエミッター (`text-emitter.ts`)

**役割**: IRをプレーンテキストのIGCSE Pseudocodeに変換

**処理できるIRノード**:
- `statement`, `assign`, `output`, `input`, `comment`
- `compound`, `if`, `else`, `elseif`, `endif`
- `for`, `while`, `endwhile`, `repeat`, `until`
- `procedure`, `function`, `return`
- `array`, `case`

**出力例**:
```
x ← 10
IF x > 5 THEN
  OUTPUT "Greater than 5"
ENDIF
```

### Markdownエミッター (`markdown-emitter.ts`)

**役割**: IRをMarkdown形式のIGCSE Pseudocodeに変換

**特徴**:
- コードブロック形式での出力
- 構文ハイライト対応
- ドキュメント生成に適した形式

## 🧪 テスト構成

### テストファイル一覧

```
tests/
├── syntax.test.ts           # 基本構文テスト
├── controlflow.test.ts      # 制御構文テスト
├── e2e.test.ts             # エンドツーエンドテスト
├── functions.test.ts        # 関数・プロシージャテスト
├── datastructures.test.ts   # データ構造テスト
├── integration.test.ts      # 統合テスト
├── ir.test.ts              # IR関連テスト
├── nested-structures.test.ts # ネスト構造テスト
├── oop.test.ts             # オブジェクト指向テスト
└── types.test.ts           # 型関連テスト
```

### 1. 基本構文テスト (`syntax.test.ts`)

**テスト対象**:
- **代入文**: `x = 10` → `x ← 10`
- **出力文**: `print("Hello")` → `OUTPUT "Hello"`
- **入力文**: `input()` → `INPUT variable`
- **コメント**: `# comment` → `// comment`
- **演算子**: 
  - 算術演算子: `+`, `-`, `*`, `/`
  - MOD演算子: `%` → `MOD`
  - 整数除算: `//` → `DIV`
  - べき乗: `**` → `^`
  - 論理演算子: `not` → `NOT`
  - 括弧の保持

**テスト例**:
```typescript
it('should convert simple integer assignment', async () => {
  const pythonCode = 'x = 10';
  const result = await converter.convert(pythonCode);
  expect(result.code).toBe('x ← 10');
});
```

### 2. 制御構文テスト (`controlflow.test.ts`)

**テスト対象**:
- **IF文**: 
  - 単純IF: `if x > 10:` → `IF x > 10 THEN`
  - IF-ELSE: `if-else` → `IF-THEN-ELSE-ENDIF`
  - IF-ELIF-ELSE: `if-elif-else` → `IF-ELSE IF-ELSE-ENDIF`
  - ネストIF: 複数レベルのネスト
- **FOR文**:
  - `range(5)` → `FOR i ← 0 TO 4`
  - `range(1, 6)` → `FOR i ← 1 TO 5`
  - `range(0, 10, 2)` → `FOR i ← 0 TO 8 STEP 2`
- **WHILE文**: `while x < 10:` → `WHILE x < 10`
- **REPEAT-UNTIL**: `while True` + `break` → `REPEAT-UNTIL`

**テスト例**:
```typescript
it('should convert IF-ELIF-ELSE statement', () => {
  const pythonCode = `if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "D"`;
  const expected = `IF score ≥ 90 THEN
  grade ← "A"
ELSE IF score ≥ 80 THEN
  grade ← "B"
ELSE
  grade ← "D"
ENDIF`;
  expect(result.code).toBe(expected);
});
```

### 3. エンドツーエンドテスト (`e2e.test.ts`)

**テスト対象**: 実際のPythonプログラムの完全変換

**テストカテゴリ**:
- **変数と代入**: 基本的な変数操作
- **反復構造**: FOR/WHILEループの実用例
- **選択構造**: 複雑なIF文構造
- **関数とプロシージャ**: 関数定義と呼び出し
- **配列操作**: リスト・配列の処理
- **実用プログラム**: 完全なアルゴリズム例

**実用例テスト**:
```python
# Python
for i in range(1, 11):
    print(i)

# Expected IGCSE Pseudocode
FOR i ← 1 TO 10
  OUTPUT i
NEXT i
```

### 4. 関数テスト (`functions.test.ts`)

**テスト対象**:
- **PROCEDURE**: 戻り値なし関数
- **FUNCTION**: 戻り値あり関数
- **パラメータ**: 引数の処理
- **RETURN文**: 戻り値の処理
- **関数呼び出し**: 関数の呼び出し構文

### 5. データ構造テスト (`datastructures.test.ts`)

**テスト対象**:
- **配列**: リスト → 配列変換
- **辞書**: 辞書 → レコード/TYPE変換
- **文字列**: 文字列操作
- **数値**: 整数・実数の処理

### 6. その他のテスト

- **統合テスト** (`integration.test.ts`): コンポーネント間の連携
- **IR関連テスト** (`ir.test.ts`): 中間表現の正確性
- **ネスト構造テスト** (`nested-structures.test.ts`): 複雑なネスト
- **OOPテスト** (`oop.test.ts`): クラス・オブジェクト
- **型テスト** (`types.test.ts`): 型システム

## 📊 テスト統計

**現在の状況**:
- **総テスト数**: 122テスト（10ファイル）
- **通過**: 56テスト
- **失敗**: 61テスト
- **スキップ**: 5テスト
- **通過率**: 約46%

**最近の改善**:
- IF文制御構造の大幅改善
- 基本構文（代入、出力、演算子）の安定化
- 括弧処理とNOT演算子の修正
- FloorDiv演算子（`//` → `DIV`）の修正

## 🎯 実装状況

### ✅ 完了済み
- 基本的なプロジェクト構造
- 型定義システム
- 基本構文の変換（代入、出力、入力）
- IF文制御構造
- 基本的な演算子
- コメント処理

### 🔄 部分実装
- FOR/WHILEループ
- 関数・プロシージャ
- 配列・データ構造
- エラーハンドリング

### ❌ 未実装
- CASE文
- 複雑なデータ構造
- クラス・オブジェクト
- 例外処理
- 高度な制御構造

## 🔧 開発ガイドライン

### コード品質
- TypeScript厳格モード使用
- 包括的な型定義
- エラーハンドリングの徹底
- デバッグ情報の充実

### テスト方針
- 単体テスト優先
- 実用例での検証
- 回帰テストの維持
- パフォーマンステスト

### 拡張性
- プラグイン可能なアーキテクチャ
- 新しい構文の追加容易性
- 複数出力フォーマット対応
- 設定の柔軟性

---

*このドキュメントは、Python → IGCSE Pseudocode変換ライブラリの技術的詳細を包括的に説明しています。実装の参考や他のライブラリ開発時の設計指針としてご活用ください。*