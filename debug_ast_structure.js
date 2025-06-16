const { PythonParser } = require('./dist/parser/python-parser.js');

function debugAST(pythonCode) {
  try {
    const parser = new PythonParser();
    const parseResult = parser.parse(pythonCode);
    
    console.log('Parse result:');
    console.log('Errors:', parseResult.errors);
    console.log('Warnings:', parseResult.warnings);
    console.log('\nIR nodes:');
    
    if (parseResult.ir) {
      parseResult.ir.forEach((ir, index) => {
        console.log(`IR[${index}]:`, JSON.stringify(ir, null, 2));
      });
    }
  } catch (error) {
    console.error('Error parsing code:', error.message);
    console.error('Stack:', error.stack);
  }
}

const testCases = [
  'upper_text = text.upper()',
  'lower_text = text.lower()',
  'length = len(text)'
];

testCases.forEach((code, index) => {
  console.log(`\n=== Test Case ${index + 1}: ${code} ===`);
  debugAST(code);
});