const { Converter } = require('./dist/converter');

async function testSimpleIf() {
  console.log('=== Test 1: Simple IF ===');
  const converter = new Converter();
  const pythonCode = 'if x > 10:\n    print("Greater")';
  console.log('Input:', JSON.stringify(pythonCode));
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('Output:', JSON.stringify(result.code));
    console.log('Expected:', JSON.stringify('IF x > 10 THEN\n  OUTPUT "Greater"\nENDIF'));
    console.log('Match:', result.code === 'IF x > 10 THEN\n  OUTPUT "Greater"\nENDIF');
    console.log('Parse errors:', result.parseResult?.errors || []);
    console.log('Parse warnings:', result.parseResult?.warnings || []);
    console.log('IR:', JSON.stringify(result.parseResult?.ir, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimpleIf();