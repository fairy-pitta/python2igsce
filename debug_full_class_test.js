const { PythonASTVisitor } = require('./dist/parser/visitor');

function printIRTree(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.kind}: ${node.text}`);
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => printIRTree(child, depth + 1));
  }
}

async function main() {
  try {
    console.log('Testing full class definition and instantiation...');
    
    // クラス定義とインスタンス化の両方を含むコード
    const pythonCode = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
    
    console.log('Python code:');
    console.log(pythonCode);
    console.log('\n--- Processing ---');
    
    const visitor = new PythonASTVisitor();
    const result = visitor.parse(pythonCode);
    
    console.log('\n--- Result ---');
    if (result.ir && result.ir.length > 0) {
      result.ir.forEach((node, index) => {
        console.log(`\nIR Node ${index + 1}:`);
        printIRTree(node);
      });
    } else {
      console.log('No IR generated');
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n--- Errors ---');
      result.errors.forEach(error => console.log('Error:', error));
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n--- Warnings ---');
      result.warnings.forEach(warning => console.log('Warning:', warning));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();