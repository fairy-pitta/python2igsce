const { Converter } = require('./dist/converter');

async function debugIfElse() {
  const converter = new Converter();
  
  console.log('=== IF-ELSE with nested IF ===');
  const ifElseCode = `if x > 0:
    print("Positive")
    if x % 2 == 0:
        print("Even")
    else:
        print("Odd")
else:
    print("NOT positive")`;
  
  try {
    const result = await converter.convert(ifElseCode);
    console.log('Input:');
    console.log(ifElseCode);
    console.log('\nActual Output:');
    console.log(result.code);
    console.log('\nExpected Output:');
    const expected = `IF x > 0 THEN
  OUTPUT "Positive"
  IF x MOD 2 = 0 THEN
    OUTPUT "Even"
  ELSE
    OUTPUT "Odd"
  ENDIF
ELSE
  OUTPUT "NOT positive"
ENDIF`;
    console.log(expected);
    console.log('\nMatch:', result.code.trim() === expected.trim());
    
    // Character by character comparison
    console.log('\n=== Character-by-character comparison ===');
    const actualLines = result.code.split('\n');
    const expectedLines = expected.split('\n');
    
    for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
      const actual = actualLines[i] || '';
      const expect = expectedLines[i] || '';
      if (actual !== expect) {
        console.log(`Line ${i + 1} differs:`);
        console.log(`  Actual  : "${actual}"`);
        console.log(`  Expected: "${expect}"`);
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugIfElse().catch(console.error);