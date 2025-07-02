# Data Structures Test Failures Analysis

## 概要

`datastructures.test.ts`で失敗している6つのテストについて、関連コード、期待される出力、実際の出力をまとめました。

## 失敗テスト一覧

### 1. 空のリスト宣言（型注釈付き）

**テスト名**: `should convert array declaration for an empty list (requires type annotation or default)`

**関連コード**:
```python
items: list[str] = []
```

**期待される出力**:
```pseudocode
DECLARE items : ARRAY[1:100] OF STRING
```

**実際の出力**:
```pseudocode
CALL Unknown()
```

**問題**: 型注釈付きの空リスト宣言が正しく処理されていない。パーサーが型注釈を認識できず、`Unknown()`関数呼び出しとして処理されている。

---

### 2. 配列要素の代入

**テスト名**: `should convert array element assignment`

**関連コード**:
```python
data = [0, 0, 0]
data[1] = 100
```

**期待される出力**:
```pseudocode
DECLARE data : ARRAY[1:3] OF INTEGER
data[1] ← 0
data[2] ← 0
data[3] ← 0
data[2] ← 100  # この行が期待されている
```

**実際の出力**:
```pseudocode
DECLARE data : ARRAY[1:3] OF INTEGER
data[1] ← 0
data[2] ← 0
data[3] ← 0
CALL Unknown()  # 配列要素への代入が処理されていない
```

**問題**: 配列要素への代入（`data[1] = 100`）が正しく処理されず、`Unknown()`関数呼び出しとして処理されている。また、Pythonの0ベースインデックスからIGCSEの1ベースインデックスへの変換も行われていない。

---

### 3. 配列の反復処理（FOR文）

**テスト名**: `should handle iterating through an array (e.g., using FOR loop)`

**関連コード**:
```python
scores = [70, 85, 90]
for score in scores:
    print(score)
```

**期待される出力**:
```pseudocode
DECLARE scores : ARRAY[1:3] OF INTEGER
scores[1] ← 70
scores[2] ← 85
scores[3] ← 90
FOR i ← 1 TO 3
  OUTPUT scores[i]
NEXT i
```

**実際の出力**:
```pseudocode
DECLARE scores : ARRAY[1:3] OF INTEGER
scores[1] ← 70
scores[2] ← 85
scores[3] ← 90
FOR i ← 1 TO LENGTH(scores)  # LENGTH関数が使用されている
  // Iterating through scores
  score ← scores[i]
  OUTPUT score
NEXT i
```

**問題**: 
- `FOR i ← 1 TO 3`の代わりに`FOR i ← 1 TO LENGTH(scores)`が生成されている
- `OUTPUT scores[i]`の代わりに一時変数`score`を使用している
- コメント行が含まれている

---

### 4. Pythonクラスのレコード型変換

**テスト名**: `should convert Python class (used as record/struct) to TYPE definition`

**関連コード**:
```python
class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)
```

**期待される出力**:
```pseudocode
TYPE StudentRecord
  DECLARE name : STRING
  DECLARE age : INTEGER
ENDTYPE
DECLARE student1 : StudentRecord
student1.name ← "Alice"
student1.age ← 17
```

**実際の出力**:
```pseudocode
CLASS Student
  ENDCLASS
student1 ← Student("Alice", 17)
```

**問題**: 
- クラスがレコード型（TYPE定義）に変換されず、CLASS構文のまま出力されている
- インスタンス化が個別のフィールド代入に分解されていない
- レコード型として扱うべき判定ロジックに問題がある可能性

---

### 5. レコードフィールドの代入

**テスト名**: `should handle record field assignment`

**関連コード**:
```python
class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
student1 = Student("Carol", 20)
student1.age = 21
```

**期待される出力**:
```pseudocode
student1.age ← 21
```

**実際の出力**:
```pseudocode
CLASS Student
  ENDCLASS
student1 ← Student("Carol", 20)
CALL Unknown()
```

**問題**: 
- フィールドへの代入（`student1.age = 21`）が処理されていない
- クラスがレコード型に変換されていない
- 属性代入が`Unknown()`関数呼び出しとして処理されている

---

### 6. レコードの配列

**テスト名**: `should handle arrays of records`

**関連コード**:
```python
class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord

path = [Point(1, 2), Point(3, 4)]
first_point_x = path[0].x
```

**期待される出力**:
```pseudocode
TYPE PointRecord
  DECLARE x : INTEGER
  DECLARE y : INTEGER
ENDTYPE
DECLARE path : ARRAY[1:2] OF PointRecord
path[1].x ← 1
path[1].y ← 2
path[2].x ← 3
path[2].y ← 4
first_point_x ← path[1].x
```

**実際の出力**:
```pseudocode
CLASS Point
  ENDCLASS
DECLARE path : ARRAY[1:4] OF STRING  # 型が間違っている
path[1] ← Point(1
path[2] ← 2)
path[3] ← Point(3
path[4] ← 4)
first_point_x ← path[0].x  # インデックスが0ベースのまま
```

**問題**: 
- クラスがレコード型に変換されていない
- 配列の型が`STRING`になっている
- オブジェクトの初期化が正しく分解されていない
- インデックスが0ベースのまま（`path[0].x`）

## 根本的な問題

### 1. パーサーの問題
- 型注釈（`list[str]`）の処理が不完全
- 配列要素への代入の処理が未実装
- 属性代入の処理が未実装

### 2. クラス→レコード型変換の問題
- `shouldTreatAsRecordType`の判定ロジックが正しく動作していない
- レコード型定義の生成が不完全

### 3. インデックス変換の問題
- Pythonの0ベースインデックスからIGCSEの1ベースインデックスへの変換が一部で動作していない

### 4. 式の処理の問題
- 複雑な式や代入が`Unknown()`として処理されている
- エラーハンドリングが不十分

## 修正が必要なファイル

1. **`src/parser/statement-visitor.ts`**
   - 配列要素代入の処理
   - 属性代入の処理
   - インデックス変換の改善

2. **`src/parser/definition-visitor.ts`**
   - レコード型判定ロジックの修正
   - レコード型定義生成の改善

3. **`src/parser/expression-visitor.ts`**
   - 型注釈の処理
   - 属性アクセスの処理

4. **`src/parser/visitor.ts`**
   - 全体的なAST処理の改善
   - エラーハンドリングの強化