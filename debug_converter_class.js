const { Converter } = require('./dist/converter');

async function main() {
  try {
    console.log('=== Converter Class Test ===');
    
    const pythonCode = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
    
    console.log('Python code:');
    console.log(pythonCode);
    console.log('\n--- Converting ---');
    
    const converter = new Converter();
    const result = await converter.convert(pythonCode);
    
    console.log('\n--- Result ---');
    console.log('Code:');
    console.log(result.code);
    
    console.log('\nErrors:', result.errors ? result.errors.length : 0);
    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(error => console.log('  Error:', error));
    }
    
    console.log('\nWarnings:', result.warnings ? result.warnings.length : 0);
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log('  Warning:', warning));
    }
    
    console.log('=== End Test ===');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

main();