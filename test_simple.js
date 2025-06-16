const { convertPython } = require('./dist/index.js');

convertPython('x = 5').then(result => {
  console.log('Result:', result);
}).catch(err => {
  console.error('Error:', err);
});