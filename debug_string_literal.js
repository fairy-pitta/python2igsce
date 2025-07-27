const { Converter } = require('./dist/index.js');

function debugStringLiteral() {
  console.log('=== String Literal Debug ===');
  
  const converter = new Converter();
  
  // テストケース1: "Not negative"
  const code1 = `print("Not negative")`;
  console.log('Input 1:', code1);
  const result1 = converter.convert(code1);
  console.log('Result 1:', result1.code);
  console.log('');
  
  // テストケース2: "Greater or equal"
  const code2 = `print("Greater or equal")`;
  console.log('Input 2:', code2);
  const result2 = converter.convert(code2);
  console.log('Result 2:', result2.code);
  console.log('');
  
  // テストケース3: 混在ケース
  const code3 = `if x > 0 or y < 0:
    print("Greater or equal")`;
  console.log('Input 3:', code3);
  const result3 = converter.convert(code3);
  console.log('Result 3:', result3.code);
}

debugStringLiteral();