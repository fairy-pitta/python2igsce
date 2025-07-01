const { Converter } = require('./dist/converter');

async function testClassDefinition() {
  console.log('Testing class definition...');
  const converter = new Converter();
  
  const code = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age`;
  
  try {
    const result = await converter.convert(code);
    console.log('Result:', result.code);
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function testInstantiation() {
  console.log('\nTesting instantiation...');
  const converter = new Converter();
  
  const code = `student1 = Student("Alice", 17)`;
  
  try {
    const result = await converter.convert(code);
    console.log('Result:', result.code);
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function main() {
  await testClassDefinition();
  await testInstantiation();
}

main().catch(console.error);