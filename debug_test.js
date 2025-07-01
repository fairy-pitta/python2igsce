const { Converter } = require('./dist/converter');

async function testConversion() {
  const converter = new Converter();
  
  // Test simple if-then-else
  const pythonCode = `if x > 5:
    print("Greater")
else:
    print("Not greater")`;
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('=== ACTUAL OUTPUT ===');
    console.log(result.code);
    console.log('=== EXPECTED OUTPUT ===');
    console.log(`IF x > 5 THEN
  OUTPUT "Greater"
ELSE
  OUTPUT "Not greater"
ENDIF`);
  } catch (error) {
    console.error('Error:', error);
  }
}

testConversion();