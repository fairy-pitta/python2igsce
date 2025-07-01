const { convertPython } = require('./dist/index');

async function testElif() {
  const python = `
if grade >= 90:
    print("A")
elif grade >= 80:
    print("B")
elif grade >= 70:
    print("C")
else:
    print("F")
`;
  
  const expected = `IF grade ≥ 90 THEN
  OUTPUT "A"
ELSE IF grade ≥ 80 THEN
  OUTPUT "B"
ELSE IF grade ≥ 70 THEN
  OUTPUT "C"
ELSE
  OUTPUT "F"
ENDIF`;
  
  console.log('Input Python code:');
  console.log(python);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const result = await convertPython(python);
    console.log('Actual output:');
    console.log(result);
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Expected output:');
    console.log(expected);
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('Match:', result.trim() === expected);
    
    // Check line by line
    const actualLines = result.trim().split('\n');
    const expectedLines = expected.split('\n');
    console.log('\nLine by line comparison:');
    for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
      const actual = actualLines[i] || '(missing)';
      const expect = expectedLines[i] || '(missing)';
      const match = actual === expect ? '✓' : '✗';
      console.log(`${match} Line ${i + 1}: "${actual}" vs "${expect}"`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testElif();