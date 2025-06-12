# Python → IGCSE Pseudocode 変換ライブラリ 要件定義書

## ✅ 1. 背景・目的

* **IGCSE Computer Science 授業**や**試験準備**において、Pythonで書いたプログラムを **IGCSE Pseudocode形式**に直す作業は手間がかかる。
* 教師・生徒の負担を軽減し、**機械的一謡性のある変換**を可能にするライブラリを提供する。

---

## 🌟 2. スコープ・対象

### 2.1 対象言語仕様

* **Python 3.8〜3.12**
* 基本文法・制御構文中心とする（教育用途に即した範囲に限定）

### 2.2 対象構文一覧

| Python構文              | IGCSE Pseudocode                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `x = 5`               | `x ← 5`                                                                                                                          |
| `print(x)`            | `OUTPUT x`                                                                                                                       |
| `input()`             | `INPUT x`                                                                                                                        |
| `if/elif/else`        | `IF/ELSE/ENDIF`                                                                                                                  |
| `for i in range(...)` | `FOR i ← start TO end ... NEXT i`                                                                                               |
| `while`               | `WHILE ... ENDWHILE`                                                                                                             |
| `def`                 | `PROCEDURE name(params)` （戻り値なし） **/　FUNCTION name(params) RETURNS <type>** （戻り値あり）<br>Visitorの段階で `return_statement`有無を判定して分岐する |
| `return`              | `RETURN`                                                                                                                         |
| コメント                  | `// ...` のまま残す                                                                                                                   |
| 配列操作                  | `ARRAY[1:n] OF type` 形式で表現                                                                                                      |
| 複合演算子                 | `+=` → `x ← x + y` 等に展開                                                                                                          |
| `class`               | `TYPE ... ENDTYPE` / `CLASS ... ENDCLASS`                                                                                       |

### 2.3 対象外 (initial)

* **List Comprehension**
* **Lambda, 高階関数**
* **Decorator**
* **match/case**
* **高度なOOP機能**（継承、ポリモーフィズム等）

---

## 🔊 出力ポリシー

* **plain**

  * 印刷用・教材用として使用するため、**必ず固定のインデントを付与する** (default: 4スペース)
  * 結果テキストは一般的な `.txt` またはストリングとして出力する

* **markdown**

  * plain出力と同様の内容を

    ````
    ```pcd
    ...
    ````

    ```
    コードフェンスつきMarkdownとして出力

    ```

* **共通**

  * IF/LOOP/TRY 等は **自動でEND文の編集を行う**
  * \*\*行頭のインデントは必ず付ける。\*\*それはplainでも必須

## 🔊 IR デザイン方針

* IRは第一級の構成要素として `children: IR[]`を持つ **再归構造にする**。
* Visitorは親ノードのVisitorの中で子ノードをvisitし、IR.childrenに追加する。
* EmitterはIR.childrenを再归的にたどり、**インデントレベルを+1しながら出力する**。
* Emitterの例：

```typescript
function emit(ir: IR, indentLevel = 0) {
  const indent = ' '.repeat(indentLevel * 4);
  output.push(indent + ir.text);
  for (const child of ir.children) {
    emit(child, indentLevel + 1);
  }
}
```

* この構造により IF/LOOP/TRY/全ての **ネスト構造を一定のルールで表現できる**。

* テストには **ネスト構造対応用のテストケースを作成し、深さは自由に3階以上も試するようにする**。

## 🔊 IR 型テンプレ（例）

```typescript
export interface IR {
  kind: string; // 例: 'assign', 'if', 'output', 'for', 'procedure', 'function', ...
  text: string; // 出力する行テキスト
  children: IR[]; // 子IR、全て再归構造
  meta?: {
    name?: string; // PROCEDURE / FUNCTION の名前
    params?: string[]; // 引数
    hasReturn?: boolean; // FUNCTIONかPROCEDUREかの判定用
    lineNumber?: number; // 元のPythonの行番号 (optional)
  };
}
```

## 🔊 Python → IGCSE Mapping Table テンプレ（例）

| Python構文            | IGCSE Pseudocode                          |
| ------------------- | ----------------------------------------- |
| `x = 5`             | `x ← 5`                                   |
| `print(x)`          | `OUTPUT x`                                |
| `input()`           | `INPUT x`                                 |
| `if/elif/else`      | `IF/ELSE/ENDIF`                           |
| `for in range`      | `FOR ... TO ... NEXT`                     |
| `while`             | `WHILE ... ENDWHILE`                      |
| `def` (no return)   | `PROCEDURE ... ENDPROCEDURE`              |
| `def` (with return) | `FUNCTION ... RETURNS <type> ... ENDFUNCTION` |
| `return`            | `RETURN`                                  |
| `# comment`         | `// comment`                              |
| `list[index]`       | `array[index]`                            |
| `class`             | `TYPE ... ENDTYPE` or `CLASS ... ENDCLASS` |
| compound assign     | expanded assign (e.g. `+=` → `x ← x + y`) |

---
