const { Python2IGCSEConverter } = require('./dist/index.js');

async function testComparison() {
  const converter = new Python2IGCSEConverter();
  
  const pythonCode = 'is_equal = (a == b)\nis_not_equal = (a != b)\nis_greater = (a > b)\nis_less = (a < b)\nis_greater_equal = (a >= b)\nis_less_equal = (a <= b)';
  
  console.log('Input:', pythonCode);
  console.log('\n--- Converting ---\n');
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('Generated code:');
    console.log(result.code);
    console.log('\n--- Expected vs Actual ---');
    console.log('Expected: is_equal ← (a = b)');
    console.log('Actual  :', result.code.split('\n')[0]);
    console.log('Expected: is_not_equal ← (a ≠ b)');
    console.log('Actual  :', result.code.split('\n')[1]);
    console.log('Expected: is_greater ← (a > b)');
    console.log('Actual  :', result.code.split('\n')[2]);
    console.log('Expected: is_less ← (a < b)');
    console.log('Actual  :', result.code.split('\n')[3]);
    console.log('Expected: is_greater_equal ← (a ≥ b)');
    console.log('Actual  :', result.code.split('\n')[4]);
    console.log('Expected: is_less_equal ← (a ≤ b)');
    console.log('Actual  :', result.code.split('\n')[5]);
  } catch (error) {
    console.error('Error:', error);
  }
}

testComparison();