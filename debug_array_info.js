const { PythonParser } = require('./dist/parser/python-parser');
const { PythonToIRVisitor } = require('./dist/parser/visitor');

const code = `
# Find maximum in array
numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(1, len(numbers)):
    if numbers[i] > max_value:
        max_value = numbers[i]

print(f"Maximum value is: {max_value}")
`;

console.log('Testing array info registration...');
console.log('Python code:');
console.log(code);
console.log('\n=== Parsing ===');

const parser = new PythonParser();
const visitor = new PythonToIRVisitor();

try {
  const ast = parser.parse(code);
  console.log('\n=== Converting to IR ===');
  const result = visitor.visit(ast);
  
  console.log('\n=== Result ===');
  console.log('typeof result.ir:', typeof result.ir);
  console.log('Array.isArray(result.ir):', Array.isArray(result.ir));
  
  if (result.ir && result.ir.children) {
    console.log('\nChild IR nodes:');
    result.ir.children.forEach((child, index) => {
      console.log(`${index}: ${child.kind} - ${child.text}`);
      if (child.children && child.children.length > 0) {
        child.children.forEach((subchild, subindex) => {
          console.log(`  ${index}.${subindex}: ${subchild.kind} - ${subchild.text}`);
        });
      }
    });
  }
} catch (error) {
  console.error('Error:', error);
}