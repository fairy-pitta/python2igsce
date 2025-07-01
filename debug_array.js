const { PythonToIGCSEConverter } = require('./dist/index.js');

async function testArrayConversion() {
  const converter = new PythonToIGCSEConverter();
  
  const python = `
numbers = [0] * 5
numbers[0] = 10
numbers[1] = 20
print(numbers[0])
`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n--- Converting ---\n');
  
  try {
    const result = await converter.convert(python);
    console.log('Output IGCSE Pseudocode:');
    console.log('"' + result.code + '"');
    console.log('\nFull result object:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testArrayConversion();