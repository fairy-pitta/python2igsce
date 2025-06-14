const { PythonParser } = require('./dist/parser/python-parser');
const { TextEmitter } = require('./dist/emitter/text-emitter');

function convertPython(pythonCode) {
  const parser = new PythonParser({ debug: true });
  const emitter = new TextEmitter();
  
  const parseResult = parser.parse(pythonCode);
  if (parseResult.errors.length > 0) {
    throw new Error(`Parse errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
  }
  const emitResult = emitter.emit(parseResult.ir);
  return emitResult.code;
}

const python = `
# Find maximum in array
numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(1, len(numbers)):
    if numbers[i] > max_value:
        max_value = numbers[i]

print(f"Maximum value is: {max_value}")
`;

console.log('Input Python code:');
console.log(python);
console.log('\n' + '='.repeat(50) + '\n');

try {
  const result = convertPython(python);
  console.log('Generated IGCSE Pseudocode:');
  console.log(result);
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Test results:');
  console.log('- Contains "DECLARE numbers : ARRAY":', result.includes('DECLARE numbers : ARRAY'));
  console.log('- Contains "FOR i ← 2 TO 5":', result.includes('FOR i ← 2 TO 5'));
  console.log('- Contains "IF numbers[i] > max_value THEN":', result.includes('IF numbers[i] > max_value THEN'));
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}