const { Converter } = require('./dist/index.js');

const converter = new Converter();

// Test 1: Empty list with type annotation
const test1 = 'items: list[str] = []';
console.log('=== Test 1: Empty list with type annotation ===');
converter.convert(test1).then(result => {
  console.log('Generated code:');
  console.log(result.code);
  console.log('Expected: DECLARE items : ARRAY[1:100] OF STRING');
  console.log('Contains expected?', result.code.includes('DECLARE items : ARRAY[1:100] OF STRING'));
  console.log('');
}).catch(err => console.error('Error:', err));

// Test 2: For loop with array iteration
const test2 = `scores = [70, 85, 90]
for score in scores:
    print(score)`;
console.log('=== Test 2: For loop with array iteration ===');
converter.convert(test2).then(result => {
  console.log('Generated code:');
  console.log(result.code);
  console.log('Expected: FOR i ← 1 TO 3');
  console.log('Contains expected?', result.code.includes('FOR i ← 1 TO 3'));
  console.log('');
}).catch(err => console.error('Error:', err));

// Test 3: Arrays of records
const test3 = `class Point:
    def __init__(self, x_coord: int, y_coord: int):
        self.x = x_coord
        self.y = y_coord

path = [Point(1, 2), Point(3, 4)]
first_point_x = path[0].x`;
console.log('=== Test 3: Arrays of records ===');
converter.convert(test3).then(result => {
  console.log('Generated code:');
  console.log(result.code);
  console.log('Expected: path[1].x ← 1');
  console.log('Contains expected?', result.code.includes('path[1].x ← 1'));
  console.log('');
}).catch(err => console.error('Error:', err));