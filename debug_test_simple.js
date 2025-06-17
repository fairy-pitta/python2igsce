const { Converter } = require('./dist/converter');

const converter = new Converter();
const result = converter.convert(`def display_message(msg):
    print(msg)`);

console.log('Current output:');
console.log(JSON.stringify(result.code));
console.log('\nExpected output:');
console.log(JSON.stringify('PROCEDURE display_message(msg)\n  OUTPUT msg\nENDPROCEDURE'));