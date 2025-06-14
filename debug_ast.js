const { convertPython } = require('./dist/index.js');

const python = `
# This is a comment
x = 5  # Another comment
# Final comment
`;

console.log('Input Python:');
console.log(JSON.stringify(python));

(async () => {
  try {
    const result = await convertPython(python);
    console.log('\nResult:');
    console.log(JSON.stringify(result));
    console.log('\nTrimmed Result:');
    console.log(JSON.stringify(result.trim()));
    
    const expected = `// This is a comment
x ← 5  // Another comment
// Final comment`;
    console.log('\nExpected:');
    console.log(JSON.stringify(expected));
    console.log('\nMatch:', result.trim() === expected);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
})();