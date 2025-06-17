const { Converter } = require('./dist/converter');

const converter = new Converter();

// IF-ELSE文のテスト
const pythonCode = `def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;

console.log('Python code:');
console.log(pythonCode);
console.log('\n=== IR Structure Debug ===');

try {
  // 変換結果を取得
  const result = converter.convert(pythonCode);
  
  // IRの構造を詳しく調べる
  function printIR(ir, indent = 0) {
    const spaces = '  '.repeat(indent);
    console.log(`${spaces}${ir.kind}: "${ir.text}"`);
    if (ir.children && ir.children.length > 0) {
      console.log(`${spaces}  children:`);
      ir.children.forEach(child => printIR(child, indent + 2));
    }
  }
  
  console.log('Result IR:');
  if (result.parseResult && result.parseResult.ir) {
    console.log('IR type:', typeof result.parseResult.ir);
    console.log('IR is array:', Array.isArray(result.parseResult.ir));
    if (Array.isArray(result.parseResult.ir)) {
      console.log('IR array length:', result.parseResult.ir.length);
      if (result.parseResult.ir.length > 0) {
        result.parseResult.ir.forEach(ir => printIR(ir));
      } else {
        console.log('IR array is empty');
      }
    } else {
      // IRが単一のオブジェクトの場合
      console.log('IR is a single object:');
      printIR(result.parseResult.ir);
    }
  } else {
    console.log('No IR found in parseResult');
    console.log('Result keys:', Object.keys(result));
    if (result.parseResult) {
      console.log('ParseResult keys:', Object.keys(result.parseResult));
      console.log('ParseResult.ir:', result.parseResult.ir);
    }
  }
  
  // エラーと警告も確認
  if (result.parseResult) {
    console.log('\nErrors:', result.parseResult.errors);
    console.log('Warnings:', result.parseResult.warnings);
  }
  
  console.log('\n=== Generated Code ===');
  console.log(result.code);
} catch (error) {
  console.error('Error:', error.message);
}