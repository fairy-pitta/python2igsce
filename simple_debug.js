const { convertPython } = require('./dist/index.js');

async function test() {
  console.log('Testing string method conversion...');
  
  try {
    const result = await convertPython('upper_text = text.upper()');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();