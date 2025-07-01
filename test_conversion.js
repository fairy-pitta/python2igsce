const { PythonParser } = require('./dist/parser/python-parser');
const { TextEmitter } = require('./dist/emitter/text-emitter');

const parser = new PythonParser();
const emitter = new TextEmitter();

function testConversion(pythonCode) {
  console.log('Testing Python code:', pythonCode);
  try {
    const parseResult = parser.parse(pythonCode);
    console.log('Parse errors:', parseResult.errors);
    console.log('Parse warnings:', parseResult.warnings);
    
    if (parseResult.ir) {
      console.log('IR:', JSON.stringify(parseResult.ir, null, 2));
      const emitResult = emitter.emit(parseResult.ir);
      console.log('Generated pseudocode:');
      console.log(emitResult.code);
    } else {
      console.log('No IR generated');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('---');
}

// Test simple assignment
testConversion('x = 5');

// Test array
testConversion('numbers = [23, 45, 12]');

// Test for loop
testConversion('for i in range(1, 5):\n    print(i)');