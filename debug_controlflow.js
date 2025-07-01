const { Converter } = require('./dist/converter');

async function testControlFlow() {
  const converter = new Converter();
  
  // Test nested FOR and IF
  const pythonCode = `for i in range(3):
    for j in range(2):
        if i == j:
            print("Match")`;
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('=== ACTUAL OUTPUT ===');
    console.log(result.code);
    console.log('=== EXPECTED OUTPUT ===');
    console.log(`FOR i ← 0 TO 2
  FOR j ← 0 TO 1
    IF i = j THEN
      OUTPUT "Match"
    ENDIF
  NEXT j
NEXT i`);
  } catch (error) {
    console.error('Error:', error);
  }
}

testControlFlow();