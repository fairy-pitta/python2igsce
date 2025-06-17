const { Converter } = require('./dist/index.js');

async function testFunctionRegistration() {
  const converter = new Converter();
  
  console.log('=== Test: Function definition and call ===');
  const pythonCode = `def display_message(msg):
    print(msg)

display_message("Hello")`;
  const result = await converter.convert(pythonCode);
  console.log('Input:');
  console.log(pythonCode);
  console.log('\nOutput:');
  console.log(result.code);
  console.log('\nExpected:');
  console.log('PROCEDURE display_message(msg)\n  OUTPUT msg\nENDPROCEDURE\n\nCALL display_message("Hello")');
  console.log('');
  
  console.log('=== Test: Function with return and call ===');
  const pythonCode2 = `def add(x, y):
    return x + y

result = add(5, 3)`;
  const result2 = await converter.convert(pythonCode2);
  console.log('Input:');
  console.log(pythonCode2);
  console.log('\nOutput:');
  console.log(result2.code);
  console.log('');
}

testFunctionRegistration().catch(console.error);