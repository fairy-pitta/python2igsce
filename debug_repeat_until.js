const { convertPython } = require('./dist/converter');

async function testRepeatUntil() {
  const python = `
while True:
    guess = int(input("Enter guess: "))
    if guess == secret:
        break
`;
  
  const expected = `REPEAT
  OUTPUT "Enter guess: "
  INPUT guess
  UNTIL guess = secret`;
  
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

testRepeatUntil().catch(console.error);