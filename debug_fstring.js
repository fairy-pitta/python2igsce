const { convertPython } = require('./dist/index');

async function testFString() {
  const python = `
name = "World"
print(f"Hello {name}")
`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const result = await convertPython(python);
    console.log('Actual output:');
    console.log(result);
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Expected: OUTPUT "Hello ", name');
    console.log('Contains f-string:', result.includes('f"'));
    console.log('Contains comma separation:', result.includes('"Hello ", name'));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFString();