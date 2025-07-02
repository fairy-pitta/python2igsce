const { PythonASTVisitor } = require('./dist/parser/visitor');

console.log('Starting test...');

const visitor = new PythonASTVisitor();
console.log('Visitor created');

const code = 'x = 1';
console.log('About to parse:', code);

visitor.parse(code).then(result => {
  console.log('Parse completed');
  console.log('Result:', result);
}).catch(error => {
  console.log('Error:', error);
});