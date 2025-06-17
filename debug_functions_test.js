const { Converter } = require('./dist/index.js');

async function testFunctions() {
  const converter = new Converter();
  
  console.log('=== Test 1: Simple procedure call ===');
  const pythonCode1 = 'display_message("Hello")';
  const result1 = await converter.convert(pythonCode1);
  console.log('Input:', pythonCode1);
  console.log('Output:', result1.code);
  console.log('Expected: CALL display_message("Hello")');
  console.log('');
  
  console.log('=== Test 2: Function with type hints ===');
  const pythonCode2 = 'def multiply(a: int, b: int) -> int:\n    return a * b';
  const result2 = await converter.convert(pythonCode2);
  console.log('Input:', pythonCode2);
  console.log('Output:', result2.code);
  console.log('Expected: FUNCTION multiply(a, b) RETURNS INTEGER\n  RETURN a * b\nENDFUNCTION');
  console.log('');
  
  console.log('=== Test 3: Simple function ===');
  const pythonCode3 = 'def add(x, y):\n    return x + y';
  const result3 = await converter.convert(pythonCode3);
  console.log('Input:', pythonCode3);
  console.log('Output:', result3.code);
  console.log('Expected: FUNCTION add(x, y) RETURNS STRING\n  RETURN x + y\nENDFUNCTION');
  console.log('');
  
  console.log('=== Test 4: Recursive factorial ===');
  const pythonCode4 = `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;
  const result4 = await converter.convert(pythonCode4);
  console.log('Input:', pythonCode4);
  console.log('Output:', result4.code);
  console.log('');
}

testFunctions().catch(console.error);