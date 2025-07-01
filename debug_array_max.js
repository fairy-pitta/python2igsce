const { convertPython } = require('./dist/index');

async function testArrayMax() {
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
  
  try {
    const result = await convertPython(python);
    console.log('Actual output:');
    console.log(result);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check what the test is looking for
    console.log('Test expectations:');
    console.log('Contains DECLARE numbers : ARRAY:', result.includes('DECLARE numbers : ARRAY'));
    console.log('Contains FOR i ← 1 TO LENGTH(numbers):', result.includes('FOR i ← 1 TO LENGTH(numbers)'));
    console.log('Contains IF numbers[i] > max_value THEN:', result.includes('IF numbers[i] > max_value THEN'));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testArrayMax();