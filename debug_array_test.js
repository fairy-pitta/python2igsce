const { convertPython } = require('./dist/index.js');

async function testArrayConversion() {
  const python = `
numbers = [0] * 5
numbers[0] = 10
numbers[1] = 20
print(numbers[0])
`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const result = await convertPython(python);
  console.log('Actual output:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nActual output (string):');
  console.log(result);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  const expected = `DECLARE numbers : ARRAY[1:5] OF INTEGER
numbers[1] ← 10
numbers[2] ← 20
OUTPUT numbers[1]`;
  console.log('Expected output:');
  console.log(expected);
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Match:', result.trim() === expected);
}

testArrayConversion().catch(console.error);