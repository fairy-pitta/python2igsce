const { Converter } = require('./dist/index.js');

async function testFunction() {
  const converter = new Converter();
  
  // Test the get_value function that might be failing
  const pythonCode = 'def get_value():\n    return 42';
  const result = await converter.convert(pythonCode);
  
  console.log('Actual output:');
  console.log(JSON.stringify(result.code));
  
  const expected = 'FUNCTION get_value() RETURNS INTEGER\n  RETURN 42\nENDFUNCTION';
  console.log('\nExpected output:');
  console.log(JSON.stringify(expected));
  
  console.log('\nMatch:', result.code === expected);
}

testFunction().catch(console.error);