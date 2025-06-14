const { PythonParser } = require('./dist/parser/python-parser');

const parser = new PythonParser();
const code = `numbers = [23, 45, 12, 67, 34]
for i in range(1, len(numbers)):
    print(i)`;

console.log('Input code:');
console.log(code);
console.log('\n' + '='.repeat(50) + '\n');

const result = parser.parse(code);

console.log('Array info:');
console.log(JSON.stringify(parser.context?.arrayInfo, null, 2));

console.log('\nResult structure:');
console.log('result:', result);
console.log('result.ir:', result.ir);
console.log('typeof result.ir:', typeof result.ir);
console.log('Array.isArray(result.ir):', Array.isArray(result.ir));

if (result.ir && result.ir.children && Array.isArray(result.ir.children)) {
  console.log('\nRoot IR node:');
  console.log(`Root: ${result.ir.kind} - ${result.ir.text}`);
  
  console.log('\nChild IR nodes:');
  result.ir.children.forEach((ir, index) => {
    console.log(`${index}: ${ir.kind} - ${ir.text}`);
    if (ir.children && ir.children.length > 0) {
      ir.children.forEach((child, childIndex) => {
        console.log(`  ${index}.${childIndex}: ${child.kind} - ${child.text}`);
      });
    }
  });
} else {
  console.log('result.ir.children is not an array or is undefined');
}