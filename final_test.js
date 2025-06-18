const { Converter } = require('./dist/converter');

// テストコード
const code = `def display_message(msg):
    print(msg)

display_message("Hello")`;

function test() {
  try {
    const converter = new Converter();
    const result = converter.convert(code);
    
    console.log('=== 変換結果 ===');
    console.log('Code:');
    console.log(result.code);
    console.log('\n=== 統計情報 ===');
    console.log('Stats:', result.stats);
    
    // CALLキーワードが含まれているかチェック
    const hasCall = result.code.includes('CALL display_message');
    console.log('\n=== 検証 ===');
    console.log('Contains CALL keyword:', hasCall);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();