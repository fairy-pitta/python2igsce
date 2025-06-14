const { convertPython } = require('./dist/index.js');

const python = `
# This is a comment
x = 5  # Another comment
# Final comment
`;

const expected = `// This is a comment
x ← 5  // Another comment
// Final comment`;

const result = convertPython(python);

console.log('Input Python:');
console.log(JSON.stringify(python));
console.log('\nExpected:');
console.log(JSON.stringify(expected));
console.log('\nActual Result:');
console.log(JSON.stringify(result));
console.log('\nTrimmed Result:');
console.log(JSON.stringify(result.trim()));
console.log('\nMatch:', result.trim() === expected);