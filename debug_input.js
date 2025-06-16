const { convertPython } = require('./dist/index.js');

async function testInputConversion() {
  console.log('Testing input statement conversion...');
  
  const pythonCode = `
name = input("Enter your name: ")
age = int(input("Enter your age: "))
`;
  
  try {
    const result = await convertPython(pythonCode);
    console.log('Input:', pythonCode);
    console.log('Result:', result);
    console.log('Expected: INPUT "Enter your name: ", name\nINPUT "Enter your age: ", age');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInputConversion();