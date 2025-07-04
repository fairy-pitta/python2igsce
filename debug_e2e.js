const { Converter } = require('./dist/converter');

const converter = new Converter();

function convertPython(pythonCode) {
    return converter.convert(pythonCode).code;
}

// Test the input statements case
const python = `
name = input("Enter your name: ")
age = int(input("Enter your age: "))
`;

const expected = `OUTPUT "Enter your name: "
INPUT name
OUTPUT "Enter your age: "
INPUT age`;

const result = convertPython(python);

console.log('Input:');
console.log(python);
console.log('\nActual output:');
console.log(JSON.stringify(result));
console.log('\nExpected:');
console.log(JSON.stringify(expected));
console.log('\nActual (trimmed):');
console.log(JSON.stringify(result.trim()));
console.log('\nExpected (trimmed):');
console.log(JSON.stringify(expected.trim()));
console.log('\nMatch:', result.trim() === expected.trim());