const { PythonParser } = require('./dist/parser/python-parser.js');
const { TextEmitter } = require('./dist/emitter/text-emitter.js');

function convertPython(pythonCode) {
  const parser = new PythonParser();
  const emitter = new TextEmitter();
  
  const parseResult = parser.parse(pythonCode);
  if (parseResult.errors.length > 0) {
    throw new Error(`Parse errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
  }
  const emitResult = emitter.emit(parseResult.ir);
  return emitResult.code;
}

const python = `
text = "Hello World"
length = len(text)
upper_text = text.upper()
lower_text = text.lower()
`;

const expected = `text ← "Hello World"
length ← LENGTH(text)
upper_text ← UCASE(text)
lower_text ← LCASE(text)`;

console.log('Python code:');
console.log(python);
console.log('\nExpected output:');
console.log(expected);
console.log('\nActual output:');
try {
  const result = convertPython(python);
  console.log(result.trim());
  console.log('\nComparison:');
  console.log('Expected:', JSON.stringify(expected));
  console.log('Actual  :', JSON.stringify(result.trim()));
  console.log('Match   :', expected === result.trim());
} catch (error) {
  console.error('Error:', error.message);
}