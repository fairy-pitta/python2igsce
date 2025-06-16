import { convertPython } from './dist/index.js';

async function testLen() {
  try {
    const pythonCode = 'size = len(numbers)\nfor i in range(len(numbers)):\n    print(numbers[i])';
    console.log('Input Python code:');
    console.log(pythonCode);
    console.log('\n=== Converting ===');
    
    const result = await convertPython(pythonCode);
    
    console.log('\n=== Result ===');
    console.log(result);
    
    console.log('\n=== Checking for len() ===');
    if (result.includes('LENGTH(')) {
      console.log('✅ Found LENGTH() - conversion working');
    } else {
      console.log('❌ No LENGTH() found');
      if (result.includes('len(')) {
        console.log('❌ Found len() - conversion not working');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLen();