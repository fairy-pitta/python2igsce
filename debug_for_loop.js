const { Converter } = require('./dist/index.js');

const converter = new Converter();

const pythonCode = `scores = [70, 85, 90]
for score in scores:
    print(score)`;

converter.convert(pythonCode).then(result => {
  console.log('Generated code:');
  console.log(result.code);
  console.log('\nErrors:');
  console.log(result.errors);
}).catch(err => {
  console.error('Error:', err);
});