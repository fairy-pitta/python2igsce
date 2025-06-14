const { PythonParser } = require('./dist/parser/python-parser');
const { TextEmitter } = require('./dist/emitter/text-emitter');

const parser = new PythonParser();
const emitter = new TextEmitter();

const python = `numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(2, 6):
    if numbers[i] > max_value:
        max_value = numbers[i]

print("Maximum value is:", max_value)`;

try {
  const parseResult = parser.parse(python);
  console.log('Parse result:');
  console.log(JSON.stringify(parseResult, null, 2));
  
  if (parseResult.ir) {
    const emitResult = emitter.emit(parseResult.ir);
    console.log('\nGenerated IR:');
    console.log(JSON.stringify(parseResult.ir, null, 2));
    
    console.log('\nGenerated code:');
    console.log(emitResult.code);
    
    console.log('\nExpected patterns:');
    console.log('- DECLARE numbers : ARRAY');
    console.log('- FOR i ← 2 TO 5');
    console.log('- IF numbers[i] > max_value THEN');
    
    console.log('\nActual contains:');
    console.log('- DECLARE numbers : ARRAY:', emitResult.code.includes('DECLARE numbers : ARRAY'));
    console.log('- FOR i ← 2 TO 5:', emitResult.code.includes('FOR i ← 2 TO 5'));
    console.log('- IF numbers[i] > max_value THEN:', emitResult.code.includes('IF numbers[i] > max_value THEN'));
  }
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}