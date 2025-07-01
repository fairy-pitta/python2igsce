const { Converter } = require('./dist/converter');

async function debugRemainingControlFlow() {
  const converter = new Converter();
  
  // Test case 1: FOR loop with negative step
  console.log('=== FOR loop with negative step ===');
  const forNegativeCode = `for i in range(10, 0, -1):
    print(i)`;
  try {
    const result = await converter.convert(forNegativeCode);
    console.log('Input:', forNegativeCode);
    console.log('Output:', result.code);
    console.log('Expected: FOR i ← 10 TO 1 STEP -1\n  OUTPUT i\nNEXT i');
    console.log('Match:', result.code.trim() === 'FOR i ← 10 TO 1 STEP -1\n  OUTPUT i\nNEXT i');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test case 2: Simple WHILE loop
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
    console.log('Match:', result.code.trim() === 'count ← 0\nWHILE count < 5 DO\n  OUTPUT count\n  count ← count + 1\nENDWHILE');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test case 3: WHILE loop with break (REPEAT-UNTIL simulation)
  console.log('\n=== WHILE loop with break ===');
  const whileBreakCode = `while True:
    guess = input("Guess the number: ")
    if guess == "7":
        break`;
  try {
    const result = await converter.convert(whileBreakCode);
    console.log('Input:', whileBreakCode);
    console.log('Output:', result.code);
    console.log('Expected: WHILE True DO\n  OUTPUT "Guess the number: " INPUT guess\n  IF guess = "7" THEN\n    BREAK\n  ENDIF\nENDWHILE');
    console.log('Match:', result.code.trim() === 'WHILE True DO\n  OUTPUT "Guess the number: " INPUT guess\n  IF guess = "7" THEN\n    BREAK\n  ENDIF\nENDWHILE');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugRemainingControlFlow().catch(console.error);