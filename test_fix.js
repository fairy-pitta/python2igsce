const { PythonParser } = require('./dist/parser/python-parser');
const { PythonToIRVisitor } = require('./dist/parser/visitor');

// テストコード
const code = `
def display_message(msg):
    print(msg)

display_message("Hello")
`;

try {
  const parser = new PythonParser();
  const ast = parser.parse(code);
  
  const visitor = new PythonToIRVisitor();
  const irs = visitor.visit(ast);
  
  console.log('=== 変換結果 ===');
  irs.forEach((ir, index) => {
    console.log(`IR ${index}: kind=${ir.kind}, text="${ir.text}"`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}