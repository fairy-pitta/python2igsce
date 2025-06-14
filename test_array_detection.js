const code = '[23, 45, 12, 67, 34]';
console.log('startsWith:', code.startsWith('['));
console.log('endsWith:', code.endsWith(']'));
console.log('elements:', code.slice(1, -1).split(',').map(e => e.trim()));

// Test the actual assignment line
const assignLine = 'numbers = [23, 45, 12, 67, 34]';
const [left, right] = assignLine.split('=', 2);
const rightTrimmed = right.trim();
console.log('\nAssignment test:');
console.log('left:', left.trim());
console.log('right:', rightTrimmed);
console.log('is array literal:', rightTrimmed.startsWith('[') && rightTrimmed.endsWith(']'));