const { convertPython } = require('./dist/index.js');

async function testArrayProcessing() {
  const python = `
# Find maximum in array
numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(1, len(numbers)):
    if numbers[i] > max_value:
        max_value = numbers[i]

print(f"Maximum value is: {max_value}")
`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const result = await convertPython(python);
  console.log('Actual output:');
  console.log(result);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('Expected patterns:');
  console.log('- DECLARE numbers : ARRAY');
  console.log('- FOR i ← 1 TO LENGTH(numbers)');
  console.log('- IF numbers[i] > max_value THEN');
  
  console.log('\nPattern matches:');
  console.log('- DECLARE numbers : ARRAY:', result.includes('DECLARE numbers : ARRAY'));
  console.log('- FOR i ← 1 TO LENGTH(numbers):', result.includes('FOR i ← 1 TO LENGTH(numbers)'));
  console.log('- IF numbers[i] > max_value THEN:', result.includes('IF numbers[i] > max_value THEN'));
}

testArrayProcessing().catch(console.error);