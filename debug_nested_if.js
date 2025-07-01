const { convertPython } = require('./dist/index');

async function testNestedIf() {
  const python = `
if x > y:
    if x > z:
        print("x is largest")
    else:
        print("z is largest")
else:
    print("y might be largest")
`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const result = await convertPython(python);
    console.log('Actual output:');
    console.log(JSON.stringify(result));
    console.log('\nActual output (formatted):');
    console.log(result);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check structure
    console.log('Analysis:');
    const lines = result.split('\n');
    lines.forEach((line, i) => {
      console.log(`Line ${i + 1}: "${line}"`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNestedIf();