

## 🧱 Pseudocode Specification

* **Font**: Use monospaced fonts like Courier New.
* **Keywords**: All uppercase (e.g., IF, WHILE, FUNCTION).
* **Indentation**: 3 spaces recommended (2 spaces allowed).
* **Identifiers**: Use camelCase or PascalCase.
* **Assignment operator**: `←` (e.g., `x ← 5`).
* **Comments**: Start with `//`.

---

## 🔢 Variables and Constants

```pseudocode
DECLARE counter : INTEGER
DECLARE name : STRING
CONSTANT Pi = 3.14
```

---

## 🔁 Iteration

### FOR loop

```pseudocode
FOR i ← 1 TO 10
   OUTPUT i
NEXT i
```

### FOR with STEP

```pseudocode
FOR i ← 10 TO 1 STEP -1
   OUTPUT i
NEXT i
```

### WHILE loop

```pseudocode
WHILE x < 10
   x ← x + 1
ENDWHILE
```

### REPEAT UNTIL loop

```pseudocode
REPEAT
   INPUT guess
UNTIL guess = secret
```

---

## 🔀 Selection

### IF-ELSE structure

```pseudocode
IF score ≥ 50 THEN
   OUTPUT "Pass"
ELSE
   OUTPUT "Fail"
ENDIF
```

### Nested IF

```pseudocode
IF x > y THEN
   IF x > z THEN
      OUTPUT "x is largest"
   ELSE
      OUTPUT "z is largest"
   ENDIF
ELSE
   OUTPUT "y might be largest"
ENDIF
```

### CASE structure

```pseudocode
CASE OF direction
   "N" : y ← y + 1
   "S" : y ← y - 1
   "E" : x ← x + 1
   "W" : x ← x - 1
   OTHERWISE : OUTPUT "Invalid"
ENDCASE
```

---

## 📦 Arrays

```pseudocode
DECLARE numbers : ARRAY[1:5] OF INTEGER
numbers[1] ← 10
numbers[2] ← 20
```

---

## 🧩 User-defined Types (Record, Enum)

### Record

```pseudocode
TYPE StudentRecord
   DECLARE name : STRING
   DECLARE age : INTEGER
ENDTYPE

DECLARE student : StudentRecord
student.name ← "John"
```

### Enum

```pseudocode
TYPE Day = (Mon, Tue, Wed, Thu, Fri)
DECLARE today : Day
```

---

## 🛠 Procedures and Functions

### PROCEDURE

```pseudocode
PROCEDURE Greet(name : STRING)
   OUTPUT "Hello, ", name
ENDPROCEDURE
```

### FUNCTION

```pseudocode
FUNCTION Add(x : INTEGER, y : INTEGER) RETURNS INTEGER
   RETURN x + y
ENDFUNCTION
```

### BYREF parameter

```pseudocode
PROCEDURE Swap(BYREF x : INTEGER, y : INTEGER)
   temp ← x
   x ← y
   y ← temp
ENDPROCEDURE
```

---

## 📄 File Handling (Text Files)

```pseudocode
OPENFILE "input.txt" FOR READ
WHILE NOT EOF("input.txt")
   READFILE "input.txt", line
   OUTPUT line
ENDWHILE
CLOSEFILE "input.txt"
```

---

## 🧱 Object-Oriented Programming

```pseudocode
CLASS Animal
   PRIVATE name : STRING
   PUBLIC PROCEDURE NEW(name : STRING)
      self.name ← name
   ENDPROCEDURE
ENDCLASS

CLASS Dog INHERITS Animal
   PUBLIC PROCEDURE Speak()
      OUTPUT "Woof"
   ENDPROCEDURE
ENDCLASS

myDog ← NEW Dog("Buddy")
CALL myDog.Speak()
```

---

## 💡 Notes

* Operators: Use `+`, `-`, `*`, `/`, `DIV`, `MOD`, `AND`, `OR`, `NOT`
* String concatenation: `"Hello" & name`
* Input/Output: Use `INPUT`, `OUTPUT`
* Comments: Use `// This is a comment`

---

## ✨ Next Steps

* Design a parser to convert Python syntax to this pseudocode format
* Implement each section as a testable function
* Create unit tests for nested IFs, CASE statements, etc.
