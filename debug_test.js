const { Converter } = require('./dist/converter');

async function testConversion() {
  const converter = new Converter();
  const pythonCode = 'x = 10';
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('Input:', pythonCode);
    console.log('Output:', result.code);
    console.log('Errors:', result.parseResult.errors);
    console.log('IR:', JSON.stringify(result.ir, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testConversion();