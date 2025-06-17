const { Converter } = require('./dist/converter');

const converter = new Converter();

// 型注釈付きの関数をテスト
const pythonCode = `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;

console.log('Python code:');
console.log(pythonCode);
console.log('\n=== AST Debug ===');

try {
  const result = converter.convert(pythonCode);
  console.log('\nConverted result:');
  console.log(JSON.stringify(result.code, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}