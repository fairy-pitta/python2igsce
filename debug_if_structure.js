const { Converter } = require('./dist/converter');

const converter = new Converter();

// IF-ELSE文のテスト
const pythonCode = `def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;

console.log('Python code:');
console.log(pythonCode);
console.log('\n=== Converted Result ===');

try {
  const result = converter.convert(pythonCode);
  console.log('Result:');
  console.log(result.code);
  
  console.log('\n=== Expected Structure ===');
  console.log('FUNCTION factorial(n) RETURNS INTEGER');
  console.log('  IF n ≤ 1 THEN');
  console.log('    RETURN 1');
  console.log('  ELSE');
  console.log('    RETURN n * factorial(n - 1)');
  console.log('  ENDIF');
  console.log('ENDFUNCTION');
} catch (error) {
  console.error('Error:', error.message);
}