const { Converter } = require('./dist/converter');

async function testSimpleArray() {
  const converter = new Converter();
  
  console.log('=== Test 1: Simple array declaration ===');
  const pythonCode1 = 'numbers = [10, 20, 30]';
  const result1 = await converter.convert(pythonCode1);
  console.log('Input:', pythonCode1);
  console.log('Output:', result1.code);
  console.log('');
  
  console.log('=== Test 2: Empty list with type annotation ===');
  const pythonCode2 = 'items: list[str] = []';
  const result2 = await converter.convert(pythonCode2);
  console.log('Input:', pythonCode2);
  console.log('Output:', result2.code);
  console.log('');
  
  console.log('=== Test 3: For loop with array ===');
  const pythonCode3 = `scores = [70, 85, 90]
for score in scores:
    print(score)`;
  const result3 = await converter.convert(pythonCode3);
  console.log('Input:', pythonCode3);
  console.log('Output:', result3.code);
  console.log('');
  
  console.log('=== Test 4: Class definition ===');
  const pythonCode4 = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
  const result4 = await converter.convert(pythonCode4);
  console.log('Input:', pythonCode4);
  console.log('Output:', result4.code);
}

testSimpleArray().catch(console.error);