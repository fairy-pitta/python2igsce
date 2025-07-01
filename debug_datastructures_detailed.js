const { Converter } = require('./dist/converter');

async function debugDataStructures() {
  const converter = new Converter();
  
  console.log('=== Array Declaration Test ===');
  const arrayCode = 'numbers = [10, 20, 30]';
  try {
    const result = await converter.convert(arrayCode);
    console.log('Input:', arrayCode);
    console.log('Output:');
    console.log(result.code);
    console.log('\nExpected to contain:');
    console.log('- DECLARE numbers : ARRAY[1:3] OF INTEGER');
    console.log('- numbers[1] ← 10');
    console.log('- numbers[3] ← 30');
    console.log('\nActual contains:');
    console.log('- DECLARE:', result.code.includes('DECLARE numbers : ARRAY[1:3] OF INTEGER'));
    console.log('- Assignment 1:', result.code.includes('numbers[1] ← 10'));
    console.log('- Assignment 3:', result.code.includes('numbers[3] ← 30'));
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n=== Array Element Access Test ===');
  const accessCode = 'my_array = [5, 10, 15]\nfirst_val = my_array[0]\nsecond_val = my_array[1]';
  try {
    const result = await converter.convert(accessCode);
    console.log('Input:', accessCode);
    console.log('Output:');
    console.log(result.code);
    console.log('\nExpected to contain:');
    console.log('- DECLARE my_array : ARRAY[1:3] OF INTEGER');
    console.log('- first_val ← my_array[1]');
    console.log('- second_val ← my_array[2]');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n=== Array Iteration Test ===');
  const iterationCode = `scores = [70, 85, 90]
for score in scores:
    print(score)`;
  try {
    const result = await converter.convert(iterationCode);
    console.log('Input:', iterationCode);
    console.log('Output:');
    console.log(result.code);
    console.log('\nExpected to contain:');
    console.log('- DECLARE scores : ARRAY[1:3] OF INTEGER');
    console.log('- FOR i ← 1 TO 3');
    console.log('- OUTPUT scores[i]');
    console.log('- NEXT i');
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n=== Class/Record Test ===');
  const classCode = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
  try {
    const result = await converter.convert(classCode);
    console.log('Input:', classCode);
    console.log('Output:');
    console.log(result.code);
    console.log('\nExpected to contain:');
    console.log('- TYPE StudentRecord');
    console.log('- DECLARE student1 : StudentRecord');
    console.log('- student1.name ← "Alice"');
    console.log('- student1.age ← 17');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugDataStructures().catch(console.error);