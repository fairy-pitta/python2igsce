# Python → IGCSE Pseudocode 変換ライブラリ 実装TODO

## 📋 実装フェーズ概要

### Phase 1: 基盤型定義とIR構造
### Phase 2: パーサー実装
### Phase 3: エミッター実装
### Phase 4: 統合とテスト
### Phase 5: 最適化と拡張

---

## 🎯 Phase 1: 基盤型定義とIR構造

### 1.1 型定義 (`src/types/`)

#### ✅ TODO: `src/types/ir.ts`
```typescript
// IR基本構造の定義
export interface IR {
  kind: IRKind;
  text: string;
  children: IR[];
  meta?: IRMeta;
}

export type IRKind = 
  | 'assign' | 'output' | 'input'
  | 'if' | 'else' | 'endif'
  | 'for' | 'while' | 'endwhile'
  | 'procedure' | 'function' | 'return'
  | 'comment' | 'array' | 'class' | 'type'
  | 'case' | 'repeat';

export interface IRMeta {
  name?: string;
  params?: string[];
  hasReturn?: boolean;
  lineNumber?: number;
  dataType?: IGCSEDataType;
}
```

#### ✅ TODO: `src/types/igcse.ts`
```typescript
// IGCSE Pseudocode特有の型定義
export type IGCSEDataType = 
  | 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN' | 'CHAR'
  | 'ARRAY' | 'RECORD';

export type IGCSEOperator = 
  | '←' | '=' | '≠' | '<' | '>' | '≤' | '≥'
  | 'AND' | 'OR' | 'NOT'
  | 'MOD' | 'DIV';

export type IGCSEKeyword = 
  | 'IF' | 'THEN' | 'ELSE' | 'ENDIF'
  | 'FOR' | 'TO' | 'STEP' | 'NEXT'
  | 'WHILE' | 'ENDWHILE'
  | 'REPEAT' | 'UNTIL'
  | 'PROCEDURE' | 'ENDPROCEDURE'
  | 'FUNCTION' | 'RETURNS' | 'ENDFUNCTION'
  | 'INPUT' | 'OUTPUT'
  | 'CASE' | 'OF' | 'OTHERWISE' | 'ENDCASE'
  | 'TYPE' | 'ENDTYPE'
  | 'CLASS' | 'ENDCLASS';
```

#### ✅ TODO: `src/types/parser.ts`
```typescript
// パーサー関連の型定義
export interface ParserOptions {
  indentSize: number;
  preserveComments: boolean;
  strictMode: boolean;
}

export interface ParseResult {
  ir: IR[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}
```

#### ✅ TODO: `src/types/emitter.ts`
```typescript
// エミッター関連の型定義
export interface EmitterOptions {
  format: 'plain' | 'markdown';
  indentSize: number;
  lineEnding: '\n' | '\r\n';
}

export interface EmitResult {
  output: string;
  metadata: EmitMetadata;
}

export interface EmitMetadata {
  lineCount: number;
  procedureCount: number;
  functionCount: number;
}
```

### 1.2 ユーティリティ型 (`src/types/utils.ts`)

#### ✅ TODO: 位置情報とビジターパターン
```typescript
export interface Position {
  line: number;
  column: number;
}

export interface Location {
  start: Position;
  end: Position;
}

export interface Visitor<T> {
  visit(node: any): T;
}
```

---

## 🔍 Phase 2: パーサー実装

### 2.1 Python AST解析 (`src/parser/`)

#### ✅ TODO: `src/parser/python-ast.ts`
```typescript
// Python ASTの型定義とパース機能
import * as ast from 'python-ast';

export class PythonASTParser {
  parse(code: string): ast.Module;
  validateSyntax(code: string): ParseError[];
}
```

#### ✅ TODO: `src/parser/visitor.ts`
```typescript
// ASTからIRへの変換ビジター
export class PythonToIRVisitor implements Visitor<IR[]> {
  visit(node: ast.Node): IR[];
  
  // 各構文の変換メソッド
  visitAssign(node: ast.Assign): IR;
  visitIf(node: ast.If): IR;
  visitFor(node: ast.For): IR;
  visitWhile(node: ast.While): IR;
  visitFunctionDef(node: ast.FunctionDef): IR;
  visitCall(node: ast.Call): IR;
  visitComment(node: ast.Comment): IR;
  
  // ヘルパーメソッド
  private determineDataType(node: ast.Node): IGCSEDataType;
  private isProcedure(func: ast.FunctionDef): boolean;
  private convertOperator(op: ast.Operator): IGCSEOperator;
}
```

### 2.2 構文マッピング (`src/parser/mapping.ts`)

#### ✅ TODO: Python → IGCSE構文マッピング
```typescript
export const SYNTAX_MAPPING = {
  // 代入
  assign: (left: string, right: string) => `${left} ← ${right}`,
  
  // 入出力
  print: (expr: string) => `OUTPUT ${expr}`,
  input: (var: string) => `INPUT ${var}`,
  
  // 条件文
  if: (condition: string) => `IF ${condition} THEN`,
  else: () => 'ELSE',
  endif: () => 'ENDIF',
  
  // ループ
  forRange: (var: string, start: string, end: string) => 
    `FOR ${var} ← ${start} TO ${end}`,
  next: (var: string) => `NEXT ${var}`,
  while: (condition: string) => `WHILE ${condition}`,
  endwhile: () => 'ENDWHILE',
  
  // 関数
  procedure: (name: string, params: string[]) => 
    `PROCEDURE ${name}(${params.join(', ')})`,
  function: (name: string, params: string[], returnType: string) => 
    `FUNCTION ${name}(${params.join(', ')}) RETURNS ${returnType}`,
  endprocedure: () => 'ENDPROCEDURE',
  endfunction: () => 'ENDFUNCTION',
  
  // 配列
  arrayDecl: (name: string, size: string, type: string) => 
    `DECLARE ${name} : ARRAY[1:${size}] OF ${type}`,
  
  // クラス/型
  type: (name: string) => `TYPE ${name}`,
  endtype: () => 'ENDTYPE',
  class: (name: string) => `CLASS ${name}`,
  endclass: () => 'ENDCLASS'
};
```

### 2.3 エラーハンドリング (`src/parser/errors.ts`)

#### ✅ TODO: パーサーエラー処理
```typescript
export class ParseErrorHandler {
  private errors: ParseError[] = [];
  
  addError(message: string, line: number, column: number): void;
  addWarning(message: string, line: number, column: number): void;
  hasErrors(): boolean;
  getErrors(): ParseError[];
  
  // 特定エラーの処理
  handleUnsupportedSyntax(node: ast.Node): void;
  handleTypeInference(node: ast.Node): void;
}
```

---

## 📤 Phase 3: エミッター実装

### 3.1 IR → テキスト変換 (`src/emitter/`)

#### ✅ TODO: `src/emitter/text-emitter.ts`
```typescript
export class TextEmitter {
  constructor(private options: EmitterOptions) {}
  
  emit(irs: IR[]): EmitResult {
    const lines: string[] = [];
    this.emitIRs(irs, lines, 0);
    return {
      output: lines.join(this.options.lineEnding),
      metadata: this.generateMetadata(irs)
    };
  }
  
  private emitIRs(irs: IR[], lines: string[], indentLevel: number): void {
    for (const ir of irs) {
      this.emitIR(ir, lines, indentLevel);
    }
  }
  
  private emitIR(ir: IR, lines: string[], indentLevel: number): void {
    const indent = ' '.repeat(indentLevel * this.options.indentSize);
    lines.push(indent + ir.text);
    
    // 子IRの処理
    if (ir.children.length > 0) {
      this.emitIRs(ir.children, lines, indentLevel + 1);
    }
    
    // END文の自動追加
    this.addEndStatement(ir, lines, indentLevel);
  }
  
  private addEndStatement(ir: IR, lines: string[], indentLevel: number): void {
    const endStatements = {
      'if': 'ENDIF',
      'while': 'ENDWHILE',
      'for': (ir.meta?.name ? `NEXT ${ir.meta.name}` : 'NEXT'),
      'procedure': 'ENDPROCEDURE',
      'function': 'ENDFUNCTION',
      'type': 'ENDTYPE',
      'class': 'ENDCLASS',
      'case': 'ENDCASE'
    };
    
    if (endStatements[ir.kind]) {
      const indent = ' '.repeat(indentLevel * this.options.indentSize);
      lines.push(indent + endStatements[ir.kind]);
    }
  }
}
```

### 3.2 Markdown出力 (`src/emitter/markdown-emitter.ts`)

#### ✅ TODO: Markdown形式の出力
```typescript
export class MarkdownEmitter extends TextEmitter {
  emit(irs: IR[]): EmitResult {
    const textResult = super.emit(irs);
    const markdownOutput = this.wrapInCodeFence(textResult.output);
    
    return {
      output: markdownOutput,
      metadata: textResult.metadata
    };
  }
  
  private wrapInCodeFence(content: string): string {
    return `\`\`\`pseudocode\n${content}\n\`\`\``;
  }
}
```

### 3.3 フォーマッター (`src/emitter/formatter.ts`)

#### ✅ TODO: 出力フォーマット調整
```typescript
export class PseudocodeFormatter {
  static formatOperators(text: string): string {
    return text
      .replace(/=/g, '←')
      .replace(/!=/g, '≠')
      .replace(/<=/g, '≤')
      .replace(/>=/g, '≥');
  }
  
  static formatKeywords(text: string): string {
    // キーワードの大文字化など
  }
  
  static formatComments(text: string): string {
    return text.replace(/^#\s*/, '// ');
  }
}
```

---

## 🔗 Phase 4: 統合とテスト

### 4.1 メインAPI (`src/index.ts`)

#### ✅ TODO: 公開API
```typescript
export class Python2IGCSEConverter {
  constructor(private options?: Partial<ParserOptions & EmitterOptions>) {}
  
  convert(pythonCode: string): Promise<EmitResult> {
    // 1. Python AST解析
    const ast = this.parser.parse(pythonCode);
    
    // 2. IR変換
    const irs = this.visitor.visit(ast);
    
    // 3. テキスト出力
    const result = this.emitter.emit(irs);
    
    return result;
  }
  
  convertFile(filePath: string): Promise<EmitResult>;
  convertToMarkdown(pythonCode: string): Promise<string>;
}

// 便利関数
export function convertPython(code: string, options?: ConvertOptions): Promise<string>;
export function convertPythonFile(filePath: string, options?: ConvertOptions): Promise<string>;
```

### 4.2 CLI実装 (`src/cli.ts`)

#### ✅ TODO: コマンドライン インターフェース
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { Python2IGCSEConverter } from './index';

const program = new Command();

program
  .name('python2igcse')
  .description('Convert Python code to IGCSE Pseudocode')
  .version('1.0.0');

program
  .command('convert <file>')
  .option('-o, --output <file>', 'output file')
  .option('-f, --format <format>', 'output format (plain|markdown)', 'plain')
  .option('-i, --indent <size>', 'indent size', '4')
  .action(async (file, options) => {
    // 変換処理
  });

program.parse();
```

### 4.3 テスト実装の修正

#### ✅ TODO: 実装に合わせたテスト修正
- `tests/ir.test.ts` - 実際のIR型に合わせて修正
- `tests/parser.test.ts` - 実際のパーサーAPIに合わせて修正
- `tests/emitter.test.ts` - 実際のエミッターAPIに合わせて修正
- `tests/integration.test.ts` - 統合テストの修正
- `tests/types.test.ts` - 型定義テストの修正

---

## 🚀 Phase 5: 最適化と拡張

### 5.1 パフォーマンス最適化

#### ✅ TODO: 最適化項目
- AST解析の高速化
- メモリ使用量の削減
- 大きなファイルの処理最適化
- キャッシュ機能の実装

### 5.2 機能拡張

#### ✅ TODO: 追加機能
- ソースマップ生成
- エラー位置の詳細表示
- 設定ファイル対応
- プラグインシステム
- VS Code拡張

### 5.3 ドキュメント整備

#### ✅ TODO: ドキュメント
- API リファレンス
- 使用例集
- 変換ルール詳細
- トラブルシューティング

---

## 📦 依存関係とセットアップ

### 必要な依存関係
```json
{
  "dependencies": {
    "python-ast": "^1.0.0",
    "commander": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^4.9.0",
    "vitest": "^0.34.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0"
  }
}
```

### TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 🎯 実装優先順位

### 高優先度 (Week 1-2)
1. ✅ 基本型定義 (`src/types/`)
2. ✅ 基本パーサー (`src/parser/visitor.ts`)
3. ✅ 基本エミッター (`src/emitter/text-emitter.ts`)
4. ✅ 基本統合テスト

### 中優先度 (Week 3-4)
1. ✅ 完全な構文サポート
2. ✅ エラーハンドリング
3. ✅ Markdown出力
4. ✅ CLI実装

### 低優先度 (Week 5+)
1. ✅ パフォーマンス最適化
2. ✅ 拡張機能
3. ✅ ドキュメント整備
4. ✅ プラグインシステム

---

## 🐛 デバッグ戦略

### デバッグ手順
1. 単体テストから開始
2. 小さなPythonコードで検証
3. 段階的に複雑なコードをテスト
4. エラーログの詳細化
5. テストケースの追加

### デバッグツール
- `debug/debug.md` でログ管理
- `debug/test-samples/` でテスト用Pythonファイル
- `debug/output-samples/` で期待される出力

---

## ✅ 完了チェックリスト

### Phase 1: 基盤
- [ ] `src/types/ir.ts`
- [ ] `src/types/igcse.ts`
- [ ] `src/types/parser.ts`
- [ ] `src/types/emitter.ts`
- [ ] `src/types/utils.ts`

### Phase 2: パーサー
- [ ] `src/parser/python-ast.ts`
- [ ] `src/parser/visitor.ts`
- [ ] `src/parser/mapping.ts`
- [ ] `src/parser/errors.ts`

### Phase 3: エミッター
- [ ] `src/emitter/text-emitter.ts`
- [ ] `src/emitter/markdown-emitter.ts`
- [ ] `src/emitter/formatter.ts`

### Phase 4: 統合
- [ ] `src/index.ts`
- [ ] `src/cli.ts`
- [ ] テスト修正
- [ ] 統合テスト

### Phase 5: 最適化
- [ ] パフォーマンス改善
- [ ] 機能拡張
- [ ] ドキュメント
- [ ] リリース準備