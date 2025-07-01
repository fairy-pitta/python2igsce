const { convertPython } = require('./dist/converter');

async function testWhileLoop() {
  const python = `
x = 0
while x < 10:
    x = x + 1
    print(x)
`;
  
  const expected = `WHILE x < 10
  x ← x + 1
  OUTPUT x
ENDWHILE`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const result = await convertPython(python);
  console.log('Actual output:');
  console.log(result);
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('Expected output:');
  console.log(expected);
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('Match:', result.trim() === expected);
}

testWhileLoop().catch(console.error);