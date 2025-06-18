const { Converter } = require('./dist/converter');

// デバッグ用のConverterクラスを拡張
class DebugConverter extends Converter {
  constructor() {
    super();
    // デバッグモードを有効にする
    this.options = { debug: true };
  }
}

const converter = new DebugConverter();

const code = `def display_message(msg):
    print(msg)

display_message("Hello")`;

console.log('=== 入力コード ===');
console.log(code);
console.log('\n=== 変換開始 ===');

const result = converter.convert(code);

console.log('\n=== 変換結果 ===');
console.log('Code:');
console.log(result.code);

console.log('\n=== 詳細検証 ===');
console.log('Contains CALL keyword:', result.code.includes('CALL'));
console.log('Contains display_message:', result.code.includes('display_message'));
console.log('Full result:', JSON.stringify(result, null, 2));