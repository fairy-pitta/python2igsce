const { convertPython } = require('./dist/index');

async function testIfStatement() {
  const python = `
if score >= 50:
    print("Pass")
else:
    print("Fail")
`;
  
  const expected = `IF score ≥ 50 THEN
  OUTPUT "Pass"
ELSE
  OUTPUT "Fail"
ENDIF`;
  
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
    
    console.log('Expected output:');
    console.log(expected);
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Match:', result.trim() === expected);
    
    // Check individual parts
    console.log('\nDetailed comparison:');
    console.log('Contains IF...THEN:', result.includes('IF') && result.includes('THEN'));
    console.log('Contains ELSE:', result.includes('ELSE'));
    console.log('Contains ENDIF:', result.includes('ENDIF'));
    console.log('Contains OUTPUT:', result.includes('OUTPUT'));
    console.log('Contains ≥ symbol:', result.includes('≥'));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testIfStatement();