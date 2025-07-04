const { Converter } = require('./dist/index.js');

async function testInput() {
  const converter = new Converter();
  
  const pythonCode = 'name = input("Enter your name: ")';
  const result = await converter.convert(pythonCode);
  
  console.log('Actual output:');
  console.log(JSON.stringify(result.code));
  
  const expected = 'OUTPUT "Enter your name: "\nINPUT name';
  console.log('\nExpected output:');
  console.log(JSON.stringify(expected));
  
  console.log('\nMatch:', result.code === expected);
}

testInput().catch(console.error);