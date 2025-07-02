const { Converter } = require('./dist/index.js');
const fs = require('fs');

async function testRealPython() {
  const converter = new Converter();
  
  console.log('=== Testing with real Python file ===');
  const pythonCode = fs.readFileSync('./debug_datastructures.py', 'utf8');
  console.log('Python code:');
  console.log(pythonCode);
  
  const result = await converter.convert(pythonCode);
  console.log('\n=== IR STRUCTURE DEBUG ===');
  console.log('IR length:', result.ir.length);
  console.log('IR[0] type:', result.ir[0]?.kind);
  console.log('IR[0] children length:', result.ir[0]?.children?.length);
  if (result.ir.length > 1) {
    console.log('Multiple IR elements detected!');
    for (let i = 0; i < result.ir.length; i++) {
      console.log(`IR[${i}]:`, JSON.stringify(result.ir[i], null, 2));
    }
  } else {
    console.log('Single IR element:', JSON.stringify(result.ir[0], null, 2));
  }
  console.log('\n=== SINGLE OUTPUT TEST ===');
  console.log('Converted output:');
  console.log(result.code);
  
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
  console.log('=== END SINGLE OUTPUT TEST ===');
}

testRealPython().catch(console.error);