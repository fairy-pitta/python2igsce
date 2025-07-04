import { Converter } from '../src/converter';

describe('Data Structures Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // ARRAY Declarations and Operations
  describe('ARRAY Tests', () => {
    it('should convert array declaration from Python list (inferring type and size)', async () => {
      const pythonCode = 'numbers = [10, 20, 30]'; // Simple list of integers
      const result = await converter.convert(pythonCode);
      // Converter needs to infer type (INTEGER) and size (3). Pseudocode arrays are 1-indexed.
      const expected = `DECLARE numbers : ARRAY[1:3] OF INTEGER
numbers[1] ← 10
numbers[2] ← 20
numbers[3] ← 30`;
      expect(result.code).toBe(expected);
    });

    it('should convert array declaration for an empty list (requires type annotation or default)', async () => {
      const pythonCode = 'items = [] # type: list[str]'; // Type hint for empty list
      const result = await converter.convert(pythonCode);
      // For an empty list, size is 0. Pseudocode arrays usually have at least 1 element or defined bounds.
      // DECLARE items : ARRAY[1:0] OF STRING (or handle as dynamic if supported)
      // This scenario is tricky. Let's assume a convention or specific handling.
      // If it's a declaration of intent for a string array that will be appended to:
      // DECLARE items : ARRAY[1:MAX_SIZE] OF STRING (if MAX_SIZE is assumed or defined)
      // Or, if the converter supports dynamic arrays (not standard IGCSE):
      // DECLARE items : ARRAY OF STRING
      // For now, let's assume it might declare with a default or require explicit sizing for IGCSE.
      // A common IGCSE approach is to declare with a max size.
      // If the converter cannot determine size/type, it might error or use defaults.
      // Let's assume a type hint helps: items: list[str] = []
      const pythonTypedCode = 'items: list[str] = []';
      const typedResult = await converter.convert(pythonTypedCode);
      // Expectation depends on how the converter handles empty list declarations for fixed-size arrays.
      // It might default to a common size like 10 or require explicit sizing.
      // For this test, let's assume it can declare it with 0 elements if type is known.
      const expected = 'DECLARE items : ARRAY[1:100] OF STRING';
      expect(typedResult.code).toBe(expected);
    });

    it('should convert array element access (0-indexed Python to 1-indexed Pseudocode)', async () => {
      const pythonCode = 'my_array = [5, 10, 15]\nfirst_val = my_array[0]\nsecond_val = my_array[1]';
      const result = await converter.convert(pythonCode);
      const expected = `DECLARE my_array : ARRAY[1:3] OF INTEGER
my_array[1] ← 5
my_array[2] ← 10
my_array[3] ← 15
first_val ← my_array[1]
second_val ← my_array[2]`;
      expect(result.code).toBe(expected);
    });

    it('should convert array element assignment', async () => {
      const pythonCode = 'data = [0, 0, 0]\ndata[1] = 100'; // Python data[1] is Pseudocode data[2]
      const result = await converter.convert(pythonCode);
      const expected = `DECLARE data : ARRAY[1:3] OF INTEGER
data[1] ← 0
data[2] ← 0
data[3] ← 0
data[2] ← 100`;
      expect(result.code).toBe(expected);
    });

    it('should handle iterating through an array (e.g., using FOR loop)', async () => {
      const pythonCode = 
`scores = [70, 85, 90]
for score in scores:
    print(score)`;
      const result = await converter.convert(pythonCode);
      // This requires the converter to understand `for item in list` -> `FOR index ... OUTPUT list[index]`
      // Or, if direct iteration over elements is supported (less common in basic IGCSE spec)
      // Assuming index-based iteration for standard IGCSE:
      const expected = 
`DECLARE scores : ARRAY[1:3] OF INTEGER
scores[1] ← 70
scores[2] ← 85
scores[3] ← 90
FOR i ← 1 TO 3
  OUTPUT scores[i]
NEXT i`;
      // The exact output for loop translation might vary based on converter's sophistication.
      // For example, it might introduce a temporary variable for the length.
      // This test assumes a fairly direct translation of Python's `for ... in ...` for lists.
      expect(result.code).toBe(expected);
    });
  });

  // RECORD (TYPE definition in IGCSE) Tests
  describe('RECORD (TYPE) Tests', () => {
    it('should convert Python class (used as record/struct) to TYPE definition', async () => {
      const pythonCode = 
`class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
      const result = await converter.convert(pythonCode);
      const expected = 
`TYPE StudentRecord
  DECLARE name : STRING
  DECLARE age : INTEGER
ENDTYPE

DECLARE student1 : StudentRecord
student1.name ← "Alice"
student1.age ← 17`;
      expect(result.code).toBe(expected);
    });

    it('should handle record field access', async () => {
      const pythonCode = 
`# Assume Student type is defined as above
# student1 = Student("Bob", 18)
student_name = student1.name`;
      // This test requires `student1` to be pre-defined or the converter to handle isolated access.
      // For a focused test, we might need to provide the full context or assume type info is available.
      // Let's assume the converter can process this if `student1` is known to be of a record type.
      const fullPythonCode = 
`class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
student1 = Student("Bob", 18)
student_name = student1.name`;
      const result = await converter.convert(fullPythonCode);
      const expected = 
`TYPE StudentRecord
  DECLARE name : STRING
  DECLARE age : INTEGER
ENDTYPE

DECLARE student1 : StudentRecord
student1.name ← "Bob"
student1.age ← 18
student_name ← student1.name`;
      expect(result.code).toBe(expected);
    });

    it('should handle record field assignment', async () => {
      const pythonCode = 
`# Assume Student type and student1 variable are defined
# student1.age = 19`;
      const fullPythonCode = 
`class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
student1 = Student("Carol", 20)
student1.age = 21`;
      const result = await converter.convert(fullPythonCode);
      const expected = 
`TYPE StudentRecord
  DECLARE name : STRING
  DECLARE age : INTEGER
ENDTYPE

DECLARE student1 : StudentRecord
student1.name ← "Carol"
student1.age ← 20
student1.age ← 21`;
      expect(result.code).toBe(expected);
    });

    // Arrays of Records
    it('should handle arrays of records', async () => {
      const pythonCode = 
`class Point:
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y

# points = [Point(1,2), Point(3,4)] # Python list of objects
# This requires translation to DECLARE points : ARRAY[1:2] OF PointRecord
# And then assignments for each element's fields.

# For a simpler test, let's declare an array of a pre-defined record type
# Assume PointRecord is defined:
# TYPE PointRecord
#   DECLARE x : INTEGER
#   DECLARE y : INTEGER
# ENDTYPE
# DECLARE path : ARRAY[1:2] OF PointRecord
# path[1].x ← 1
# path[1].y ← 2
# path[2].x ← 3
# path[2].y ← 4
`;
      // This is complex. Let's test the Python that would generate this.
      const pythonForArrayOfRecords = 
`class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord

path = [Point(1, 2), Point(3, 4)]
first_point_x = path[0].x`;
      const result = await converter.convert(pythonForArrayOfRecords);

      const expected = 
`TYPE PointRecord
  DECLARE x : INTEGER
  DECLARE y : INTEGER
ENDTYPE

DECLARE path : ARRAY[1:2] OF PointRecord
path[1].x ← 1
path[1].y ← 2
path[2].x ← 3
path[2].y ← 4
first_point_x ← path[1].x`;
      expect(result.code).toBe(expected);
    });
  });
});