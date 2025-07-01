const { Converter } = require('./dist/converter');

async function debugControlFlow() {
  const converter = new Converter();
  
  // Test case 1: FOR loop with negative step
  console.log('=== FOR loop with negative step ===');
  const forCode = `for i in range(10, 0, -1):
    print(i)`;
  try {
    const result = await converter.convert(forCode);
    console.log('Input:', forCode);
    console.log('Output:', result.code);
    console.log('Expected: FOR i ← 10 TO 1 STEP -1\n  OUTPUT i\nNEXT i');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test case 2: WHILE loop with break
  console.log('\n=== WHILE loop with break ===');
  const whileCode = `while True:
    guess = input("Guess the number: ")
    if guess == "7":
        break`;
  try {
    const result = await converter.convert(whileCode);
    console.log('Input:', whileCode);
    console.log('Output:', result.code);
    console.log('Expected: WHILE True DO\n  OUTPUT "Guess the number: " INPUT guess\n  IF guess = "7" THEN\n    BREAK\n  ENDIF\nENDWHILE');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test case 3: Simple WHILE loop
  console.log('\n=== Simple WHILE loop ===');
  const simpleWhile = `count = 0
while count < 5:
    print(count)
    count += 1`;
  try {
    const result = await converter.convert(simpleWhile);
    console.log('Input:', simpleWhile);
    console.log('Output:', result.code);
    console.log('Expected: count ← 0\nWHILE count < 5 DO\n  OUTPUT count\n  count ← count + 1\nENDWHILE');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test case 4: Nested FOR and IF
  console.log('\n=== Nested FOR and IF ===');
  const nestedCode = `for i in range(3):
    for j in range(3):
        if i == j:
            print(f"Match at {i},{j}")`;
  try {
    const result = await converter.convert(nestedCode);
    console.log('Input:', nestedCode);
    console.log('Output:', result.code);
    console.log('Expected: FOR i ← 0 TO 2\n  FOR j ← 0 TO 2\n    IF i = j THEN\n      OUTPUT "Match at " & i & "," & j\n    ENDIF\n  NEXT j\nNEXT i');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugControlFlow().catch(console.error);