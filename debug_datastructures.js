const { Converter } = require('./dist/index.js');

async function debugDataStructures() {
  const converter = new Converter();
  
  console.log('=== Test 1: Array iteration ===');
  const pythonCode1 = `scores = [70, 85, 90]
for score in scores:
    print(score)`;
  const result1 = await converter.convert(pythonCode1);
  console.log('Input:');
  console.log(pythonCode1);
  console.log('\nOutput:');
  console.log(result1.code);
  console.log('\nExpected to contain: OUTPUT scores[i]');
  console.log('Contains OUTPUT scores[i]:', result1.code.includes('OUTPUT scores[i]'));
  
  console.log('\n=== Test 2: TYPE definition ===');
  const pythonCode2 = `class Student:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

student1 = Student("Alice", 17)`;
  const result2 = await converter.convert(pythonCode2);
  console.log('Input:');
  console.log(pythonCode2);
  console.log('\nOutput:');
  console.log(result2.code);
  console.log('\nExpected TYPE definition with 2-space indent');
  
  console.log('\n=== Test 3: Arrays of records ===');
  const pythonCode3 = `class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord

path = [Point(1, 2), Point(3, 4)]
first_point_x = path[0].x`;
  const result3 = await converter.convert(pythonCode3);
  console.log('Input:');
  console.log(pythonCode3);
  console.log('\nOutput:');
  console.log(result3.code);
  console.log('\nExpected:');
  console.log('TYPE PointRecord');
  console.log('  DECLARE x : INTEGER');
  console.log('  DECLARE y : INTEGER');
  console.log('ENDTYPE');
  console.log('DECLARE path : ARRAY[1:2] OF PointRecord');
  console.log('path[1].x ← 1');
  console.log('path[1].y ← 2');
  console.log('path[2].x ← 3');
  console.log('path[2].y ← 4');
  console.log('first_point_x ← path[1].x');
  console.log('\nActual vs Expected comparison:');
  const expectedLines = [
    'TYPE PointRecord',
    '  DECLARE x : INTEGER',
    '  DECLARE y : INTEGER',
    'ENDTYPE',
    'DECLARE path : ARRAY[1:2] OF PointRecord',
    'path[1].x ← 1',
    'path[1].y ← 2',
    'path[2].x ← 3',
    'path[2].y ← 4',
    'first_point_x ← path[1].x'
  ];
  const actualLines = result3.code.split('\n').filter(line => line.trim());
  expectedLines.forEach((expected, i) => {
    const actual = actualLines[i] || 'MISSING';
    const match = actual === expected ? '✓' : '✗';
    console.log(`${match} Expected: "${expected}"`);
    console.log(`  Actual:   "${actual}"`);
  });
}

debugDataStructures().catch(console.error);