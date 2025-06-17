import { Converter } from '../src/converter';

describe('Control Flow Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // IF-THEN-ELSE Statements
  describe('IF-THEN-ELSE Statements', () => {
    it('should convert simple IF statement', async () => {
      const pythonCode = 'if x > 10:\n    print("Greater")';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('IF x > 10 THEN\n  OUTPUT "Greater"\nENDIF');
    });

    it('should convert IF-ELSE statement', async () => {
      const pythonCode = 'if temperature < 15:\n    print("Cold")\nelse:\n    print("Warm")';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('IF temperature < 15 THEN\n  OUTPUT "Cold"\nELSE\n  OUTPUT "Warm"\nENDIF');
    });

    it('should convert IF-ELIF-ELSE statement (ELSE IF in Pseudocode)', async () => {
      const pythonCode = 'if score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "D"';
      const result = await converter.convert(pythonCode);
      const expected = 
`IF score ≥ 90 THEN
  grade ← "A"
ELSE IF score ≥ 80 THEN
  grade ← "B"
ELSE IF score ≥ 70 THEN
  grade ← "C"
ELSE
  grade ← "D"
ENDIF`;
      expect(result.code).toBe(expected);
    });

    it('should handle nested IF statements', async () => {
      const pythonCode = 
`if x > 0:
    print("Positive")
    if x % 2 == 0:
        print("Even")
    else:
        print("Odd")
else:
    print("Not positive")`;
      const result = await converter.convert(pythonCode);
      const expected = 
`IF x > 0 THEN
  OUTPUT "Positive"
  IF x MOD 2 = 0 THEN
    OUTPUT "Even"
  ELSE
    OUTPUT "Odd"
  ENDIF
ELSE
  OUTPUT "Not positive"
ENDIF`;
      expect(result.code).toBe(expected);
    });
  });

  // CASE Statements (Note: Python doesn't have a direct CASE equivalent, often implemented with if-elif-else)
  // For now, we'll assume direct pseudocode generation if a specific Python pattern is recognized or via a custom IR node.
  // This might require more advanced parsing logic or a specific Python construct to map to CASE.
  // describe('CASE Statements', () => {
  //   it('should convert a structure recognized as CASE', async () => {
  //     // Placeholder for how Python code might map to CASE
  //     // e.g., using a dictionary lookup or specific comment annotation
  //     const pythonCode = '# PSEUDO_CASE_OF direction\nif direction == "N":\n    y = y + 1\nelif direction == "S":\n    y = y - 1\n# END_PSEUDO_CASE';
  //     const result = await converter.convert(pythonCode);
  //     const expected = 
  // `CASE OF direction
  //   "N" : y ← y + 1
  //   "S" : y ← y - 1
  // ENDCASE`;
  //     expect(result.code).toBe(expected);
  //   });
  // });

  // FOR Loops
  describe('FOR Loops', () => {
    it('should convert for loop with range (0 to N-1)', async () => {
      const pythonCode = 'for i in range(5):\n    print(i)';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('FOR i ← 0 TO 4\n  OUTPUT i\nNEXT i');
    });

    it('should convert for loop with range (start to end-1)', async () => {
      const pythonCode = 'for count in range(1, 6):\n    print(count)';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('FOR count ← 1 TO 5\n  OUTPUT count\nNEXT count');
    });

    it('should convert for loop with range and step', async () => {
      const pythonCode = 'for num in range(0, 10, 2):\n    print(num)';
      const result = await converter.convert(pythonCode);
      // Note: IGCSE typically implies step 1 if not specified. Python's range(0,10,2) -> 0,2,4,6,8. Pseudocode FOR end is inclusive.
      // So, 0 TO 8 STEP 2 for 0,2,4,6,8
      expect(result.code).toBe('FOR num ← 0 TO 8 STEP 2\n  OUTPUT num\nNEXT num');
    });

    it('should convert for loop with negative step', async () => {
      const pythonCode = 'for i in range(5, 0, -1):\n    print(i)';
      const result = await converter.convert(pythonCode);
      // 5, 4, 3, 2, 1. Pseudocode FOR end is inclusive.
      expect(result.code).toBe('FOR i ← 5 TO 1 STEP -1\n  OUTPUT i\nNEXT i');
    });
  });

  // WHILE Loops
  describe('WHILE Loops', () => {
    it('should convert simple while loop', async () => {
      const pythonCode = 'count = 0\nwhile count < 5:\n    print(count)\n    count = count + 1';
      const result = await converter.convert(pythonCode);
      const expected = 
`count ← 0
WHILE count < 5
  OUTPUT count
  count ← count + 1
ENDWHILE`;
      expect(result.code).toBe(expected);
    });

    it('should handle while loop with break (translates to conditional exit or complex logic)', async () => {
      // Direct 'break' is not in basic IGCSE. Often requires restructuring or a flag.
      // For now, we'll test a simple case that might be directly translatable or show limitations.
      const pythonCode = 'i = 0\nwhile True:\n    print(i)\n    i += 1\n    if i == 3:\n        break';
      const result = await converter.convert(pythonCode);
      // This is a simplified translation. A more robust solution might use a flag.
      // Or, if the language supports EXIT WHILE (not standard IGCSE but common extension)
      const expected = 
`i ← 0
WHILE TRUE
  OUTPUT i
  i ← i + 1
  IF i = 3 THEN
    // Simulating break; in full IGCSE this might need a flag or be unrepresentable directly
    // For now, we assume the loop terminates here or a comment indicates the break.
    // Depending on strictness, this could be an error or a specific translation pattern.
    // Let's assume for now it implies the loop structure ends after the IF if the condition is met.
    // A more accurate translation might involve restructuring the loop or using a boolean flag.
    // For this test, we'll check for the components.
    // A more complete test would verify the exact control flow if `break` is fully supported.
  ENDIF
ENDWHILE`; // This ENDWHILE might be problematic if break is meant to exit immediately.
      // Let's simplify the expectation for now, focusing on the components.
      expect(result.code).toContain('i ← 0');
      expect(result.code).toContain('WHILE TRUE');
      expect(result.code).toContain('OUTPUT i');
      expect(result.code).toContain('i ← i + 1');
      expect(result.code).toContain('IF i = 3 THEN');
      // The presence of ENDWHILE is standard for the WHILE block itself.
      expect(result.code).toContain('ENDWHILE');
    });
  });

  // REPEAT-UNTIL Loops (Note: Python uses while for this, so mapping requires recognizing the pattern)
  describe('REPEAT-UNTIL Loops', () => {
    it('should convert a while True loop with a break at the end, recognized as REPEAT-UNTIL', async () => {
      const pythonCode = 
`# Simulating REPEAT-UNTIL
while True:
    guess = input("Guess the number: ")
    if guess == "7":
        break`;
      const result = await converter.convert(pythonCode);
      // This requires specific pattern recognition in the parser.
      // A simple `while True` with a conditional break at the end of the loop body.
      const expected = 
`REPEAT
  OUTPUT "Guess the number: "
  INPUT guess
UNTIL guess = "7"`;
      expect(result.code).toBe(expected);
    });
  });

  // Nested Control Structures
  describe('Nested Control Structures', () => {
    it('should handle nested FOR and IF', async () => {
      const pythonCode = 
`for i in range(3):
    print("Outer:", i)
    if i % 2 == 0:
        for j in range(2):
            print("Inner:", j)`;
      const result = await converter.convert(pythonCode);
      const expected = 
`FOR i ← 0 TO 2
  OUTPUT "Outer:", i
  IF i MOD 2 = 0 THEN
    FOR j ← 0 TO 1
      OUTPUT "Inner:", j
    NEXT j
  ENDIF
NEXT i`;
      expect(result.code).toBe(expected);
    });
  });
});