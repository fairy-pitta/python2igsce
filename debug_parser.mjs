import { Converter } from './dist/converter.js';

const converter = new Converter();

async function testProcedure() {
  try {
    console.log('Testing procedure...');
    const pythonCode = 'def greet(name):\n    print("Hello", name)';
    console.log('Input Python code:');
    console.log(pythonCode);
    console.log('\n--- Converting ---\n');
    
    const result = await converter.convert(pythonCode);
    console.log('Generated code:');
    console.log(result.code);
    console.log('\n--- Checking expectations ---');
    console.log('Contains "PROCEDURE greet(name)":', result.code.includes('PROCEDURE greet(name)'));
    console.log('Contains "OUTPUT \"Hello\", name":', result.code.includes('OUTPUT "Hello", name'));
    console.log('Contains "ENDPROCEDURE":', result.code.includes('ENDPROCEDURE'));
  } catch (error) {
    console.error('Error:', error);
  }
}

testProcedure();