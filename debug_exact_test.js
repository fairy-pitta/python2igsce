const { Converter } = require('./dist/converter');

async function debugExactTest() {
  const converter = new Converter();
  
  console.log('=== Exact test case from controlflow.test.ts ===');
  const pythonCode = 
`if x > 0:
    print("Positive")
    if x % 2 == 0:
        print("Even")
    else:
        print("Odd")
else:
    print("Not positive")`;
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('Input:');
    console.log(pythonCode);
    console.log('\nActual Output:');
    console.log(result.code);
    console.log('\nExpected Output from test:');
    const expected = 
`IF x > 0 THEN
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
        console.log(`  Actual chars  : [${actual.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
        console.log(`  Expected chars: [${expect.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugExactTest().catch(console.error);