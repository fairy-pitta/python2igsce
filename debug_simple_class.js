const { PythonASTVisitor } = require('./dist/parser/visitor');

async function main() {
  try {
    console.log('=== Simple Class Test ===');
    
    const pythonCode = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
    
    const visitor = new PythonASTVisitor();
    const result = visitor.parse(pythonCode);
    
    console.log('IR Count:', result.ir ? result.ir.length : 0);
    
    if (result.ir && result.ir.length > 0) {
      result.ir.forEach((node, i) => {
        console.log(`Node ${i}: ${node.kind} - ${node.text}`);
        if (node.children) {
          node.children.forEach((child, j) => {
            console.log(`  Child ${j}: ${child.kind} - ${child.text}`);
          });
        }
      });
    }
    
    console.log('Errors:', result.errors ? result.errors.length : 0);
    console.log('=== End Test ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();