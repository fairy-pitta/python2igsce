const { convertPython } = require('./dist/index');

const python = `
# Find maximum in array
numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(1, len(numbers)):
    if numbers[i] > max_value:
        max_value = numbers[i]

print(f"Maximum value is: {max_value}")
`;

console.log('Testing array processing example...');
console.log('Python code:');
console.log(python);
console.log('\n=== Converting ===');

(async () => {
  try {
    const result = await convertPython(python);
    console.log('\n=== Result ===');
    console.log(result);
  
  console.log('\n=== Checking specific patterns ===');
  console.log('Contains "DECLARE numbers : ARRAY":', result.includes('DECLARE numbers : ARRAY'));
  console.log('Contains "FOR i ← 2 TO 5":', result.includes('FOR i ← 2 TO 5'));
  console.log('Contains "IF numbers[i] > max_value THEN":', result.includes('IF numbers[i] > max_value THEN'));
  
  // Check for NaN patterns
  console.log('Contains "NaN":', result.includes('NaN'));
  
  // Extract FOR loop line
  const lines = result.split('\n');
  const forLine = lines.find(line => line.includes('FOR i'));
  console.log('FOR line found:', forLine);
  
  } catch (error) {
    console.error('Error:', error);
  }
})();