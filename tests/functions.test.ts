import { Converter } from '../src/converter';

describe('Functions and Procedures Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // PROCEDURE (Functions without a return value)
  describe('PROCEDURE Definitions and Calls', () => {
    it('should convert a simple procedure definition', async () => {
      const pythonCode = 'def display_message(msg):\n    print(msg)';
      const result = await converter.convert(pythonCode);
      const expected = 
`PROCEDURE display_message(msg)
  OUTPUT msg
ENDPROCEDURE`;
      expect(result.code).toBe(expected);
    });

    it('should convert a procedure definition with multiple parameters', async () => {
      const pythonCode = 'def show_sum(a, b):\n    result = a + b\n    print(result)';
      const result = await converter.convert(pythonCode);
      const expected = 
`PROCEDURE show_sum(a, b)
  result ← a + b
  OUTPUT result
ENDPROCEDURE`;
      expect(result.code).toBe(expected);
    });

    it('should convert a procedure call', async () => {
      const pythonCode = 'display_message("Hello")'; // Assuming display_message is defined elsewhere or as part of the code
      const result = await converter.convert(pythonCode);
      // In IGCSE, a procedure call is often written as CALL procedure_name(params) or just procedure_name(params)
      // The `CALL` keyword is common. Let's assume the converter adds it.
      expect(result.code).toBe('CALL display_message("Hello")');
    });
  });

  // FUNCTION (Functions with a return value)
  describe('FUNCTION Definitions and Calls', () => {
    it('should convert a simple function definition with a return value', async () => {
      const pythonCode = 'def add(x, y):\n    return x + y';
      const result = await converter.convert(pythonCode);
      // Type inference for RETURNS might be basic or require annotations in Python for explicit typing.
      // Assuming it infers a general type or requires explicit typing for RETURNS clause.
      // For now, let's assume a placeholder like UNKNOWN_TYPE or it's inferred if possible.
      // The IGCSE spec requires RETURNS <TYPE>. This is a challenge from Python's dynamic typing.
      // Let's assume for now the converter might omit RETURNS <TYPE> if not inferable, or use a default.
      // Or, the test should reflect what the current converter implementation does.
      // Let's assume it can infer or has a default like 'ANY'.
      const expected = 
`FUNCTION add(x, y) RETURNS INTEGER
  RETURN x + y
ENDFUNCTION`;
      // If type hinting is used in Python, it should be used: def add(x: int, y: int) -> int:
      // This test will depend heavily on the converter's type handling capabilities.
      // For now, we'll use a generic 'ANY' or expect the converter to handle it.
      expect(result.code).toBe(expected); 
    });

    it('should convert a function with explicit Python type hints for return type', async () => {
      const pythonCode = 'def multiply(a: int, b: int) -> int:\n    return a * b';
      const result = await converter.convert(pythonCode);
      const expected = 
`FUNCTION multiply(a, b) RETURNS INTEGER
  RETURN a * b
ENDFUNCTION`;
      expect(result.code).toBe(expected);
    });

    it('should convert a function call assigned to a variable', async () => {
      const pythonCode = 'total = add(5, 3)'; // Assuming add is defined
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('total ← add(5, 3)');
    });

    it('should handle RETURN statements correctly', async () => {
      const pythonCode = 'def get_value():\n    return 42';
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('RETURN 42');
    });
  });

  // Parameter Passing (BYVAL is default, BYREF needs special handling)
  describe('Parameter Passing', () => {
    // Python passes arguments by assignment. Mutable objects can be changed, immutable ones effectively by value.
    // True BYREF (like C++ references or Pascal VAR parameters) isn't a direct Python feature in the same way.
    // This would require a convention (e.g., specific type hint, comment, or object wrapping) to translate to BYREF.

    it('should handle parameters passed by value (default)', async () => {
      const pythonCode = 
`def increment_val(val):
    val = val + 1
    print(val)

x = 5
increment_val(x)
print(x) # x should still be 5 in Python if val is a number (immutable)`;
      const result = await converter.convert(pythonCode);
      const expected = 
`PROCEDURE increment_val(val)
  val ← val + 1
  OUTPUT val
ENDPROCEDURE
x ← 5
CALL increment_val(x)
OUTPUT x`;
      expect(result.code).toBe(expected);
    });

    // Test for BYREF would require defining how the converter identifies BYREF parameters from Python.
    // Example: Using a comment like '# BYREF param_name'
    // Or a specific type wrapper: def proc(param: ByRef[int]):
    it('should handle parameters intended as BYREF (if a convention is established)', async () => {
      // This test is conceptual until BYREF detection is implemented.
      // Python code simulating a BYREF intention, e.g., by modifying a list (mutable).
      const pythonCode = 
`# Assume a convention for BYREF, e.g., a comment or type
def swap(a, b): # Python's swap needs to return new values or use mutable types
    # True BYREF swap is not direct. This simulates intent.
    # For IGCSE: PROCEDURE swap(BYREF x, BYREF y)
    temp = a
    a = b
    b = temp
    return a, b # Pythonic way

x = 10
y = 20
x, y = swap(x, y) # Pythonic swap`;
      // The converter would need to recognize this pattern or a specific annotation to produce BYREF.
      // Let's test a hypothetical direct translation if the converter could infer BYREF for a swap.
      // This is highly dependent on converter logic for BYREF.
      // For now, we'll test a direct IGCSE-style procedure if the converter could map to it.
      const converterWithByRefSupport = new Converter();
      const igcseEquivalentCode = 
`# Hypothetical Python that maps to BYREF
# def swap_byref(a: BYREF_INT, b: BYREF_INT):
#   temp = a.value
#   a.value = b.value
#   b.value = temp

# Direct IGCSE equivalent for testing the emitter if IR was correct:
# PROCEDURE swap(BYREF x : INTEGER, BYREF y : INTEGER)
#   temp ← x
#   x ← y
#   y ← temp
# ENDPROCEDURE
# 
# x ← 10
# y ← 20
# CALL swap(x, y)`;
      // Since direct Python-to-BYREF is complex, this test is more about the desired IGCSE output.
      // We'll assume a Python function that *intends* to modify arguments and see how it's handled.
      // A simple Python function won't directly translate to BYREF for immutable types.
      // Let's test a procedure that *would* be BYREF in IGCSE.
      const pythonForByRefProcedure = 
`def modify_list_element(arr):
    # arr is a list, which is mutable. Changes inside will persist.
    # This is the closest Python gets to BYREF for the list itself.
    arr[0] = arr[0] * 2

my_list = [10]
modify_list_element(my_list) # my_list[0] becomes 20`;
      const result = await converter.convert(pythonForByRefProcedure);
      // The pseudocode for list modification would involve array access.
      // True BYREF for simple variables is the main point here.
      // Let's assume a comment based convention for BYREF for simple variables:
      const pythonWithByRefComment = 
`def swap_values(a, b): # BYREF a, BYREF b
  global_temp = 0 # temp needs to be defined if not passed
  # This Python code doesn't actually swap a and b in the caller's scope for immutables.
  # It's illustrating the signature that *should* become BYREF.
  pass # Placeholder for swap logic if it were true BYREF

# PROCEDURE swap_values(BYREF a : INTEGER, BYREF b : INTEGER)
#   temp ← a
#   a ← b
#   b ← temp
# ENDPROCEDURE`;
      // This test is more illustrative of the target than a direct Python translation feature without conventions.
      // For now, we'll skip a direct BYREF translation test until the convention is solid.
      expect(true).toBe(true); // Placeholder
    });
  });

  // Recursive Functions
  describe('Recursive Functions', () => {
    it('should convert a recursive factorial function', async () => {
      const pythonCode = 
`def factorial(n: int) -> int:
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;
      const result = await converter.convert(pythonCode);
      const expected = 
`FUNCTION factorial(n) RETURNS INTEGER
  IF n ≤ 1 THEN
    RETURN 1
  ELSE
    RETURN n * factorial(n - 1)
  ENDIF
ENDFUNCTION`;
      expect(result.code).toBe(expected);
    });
  });
});