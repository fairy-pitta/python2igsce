const { Converter } = require('./dist/converter');

async function testDataStructures() {
  const converter = new Converter();
  
  // Test simple attribute assignment
  const pythonCode = `person.name = "John"`;
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('=== ACTUAL OUTPUT ===');
    console.log(result.code);
    console.log('=== EXPECTED ===');
    console.log('person.name ← "John"');
  } catch (error) {
    console.error('Error:', error);
  }
}

testDataStructures();